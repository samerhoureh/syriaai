"""SYRIA TOKENIZER — an original byte-level BPE tokenizer trained from scratch.

Design notes
------------
* The base vocabulary is the 256 raw bytes (covering full Unicode through
  UTF-8), so *any* string can be encoded and decoded round-trip without an
  unknown-token problem.
* BPE merge rules are LEARNED by this module from the project's own corpus
  using a frequency-based greedy algorithm with incremental pair counting
  (standard BPE training). No external/pretrained vocabulary is ever loaded.
* Special tokens (<pad>, <bos>, <eos>, <user>, <assistant>, <sys>, <docs>)
  are reserved project tokens, never learned from data.
* Pre-tokenization splits on whitespace chunks, so merges never cross
  whitespace boundaries (GPT-2-style pre-tokenization, simplified and
  implementation-owned).

ID layout:  [0 .. len(special)-1] specials | [special .. special+255] bytes | merges...
"""

from __future__ import annotations

import hashlib
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Iterable, Optional

SPECIAL_TOKENS = ["<pad>", "<unk>", "<bos>", "<eos>", "<user>", "<assistant>", "<sys>", "<docs>"]
TOKENIZER_ID = "syria-tokenizer"
TOKENIZER_VERSION = "1.0.0"

PRETOKEN_PATTERN = re.compile(r"\s+|\S+")


class SyriaTokenizer:
    """Byte-level BPE tokenizer trained from scratch on project data."""

    def __init__(
        self,
        merges: Optional[list[tuple[int, int]]] = None,
        special_tokens: Optional[list[str]] = None,
        version: str = TOKENIZER_VERSION,
        meta: Optional[dict] = None,
    ) -> None:
        self.special_tokens = list(special_tokens or SPECIAL_TOKENS)
        self.version = version
        self.meta = meta or {}
        # rank i merges pair (a, b) into new id = self._first_merge_id + i
        self.merges: list[tuple[int, int]] = list(merges or [])
        self._rebuild_maps()

    # ------------------------------------------------------------------ #
    # vocabulary plumbing
    # ------------------------------------------------------------------ #
    @property
    def n_special(self) -> int:
        return len(self.special_tokens)

    @property
    def byte_base(self) -> int:
        return self.n_special

    @property
    def _first_merge_id(self) -> int:
        return self.n_special + 256

    @property
    def vocab_size(self) -> int:
        return self.n_special + 256 + len(self.merges)

    def _rebuild_maps(self) -> None:
        self.special_to_id = {tok: i for i, tok in enumerate(self.special_tokens)}
        self.id_to_special = {i: tok for i, tok in enumerate(self.special_tokens)}
        self.merge_ranks: dict[tuple[int, int], int] = {
            pair: rank for rank, pair in enumerate(self.merges)
        }
        self.merge_map: dict[tuple[int, int], int] = {
            pair: self._first_merge_id + rank for rank, pair in enumerate(self.merges)
        }
        # id -> bytes map (for decoding merged tokens)
        token_bytes: dict[int, bytes] = {}
        for b in range(256):
            token_bytes[self.byte_base + b] = bytes([b])
        for rank, (a, b) in enumerate(self.merges):
            new_id = self._first_merge_id + rank
            token_bytes[new_id] = token_bytes[a] + token_bytes[b]
        self._token_bytes = token_bytes
        self._word_cache: dict[str, list[int]] = {}

    # ------------------------------------------------------------------ #
    # training (from scratch — greedy BPE with incremental pair counting)
    # ------------------------------------------------------------------ #
    @classmethod
    def train(
        cls,
        texts: Iterable[str],
        vocab_size: int = 4096,
        min_pair_count: int = 2,
        special_tokens: Optional[list[str]] = None,
        progress_every: int = 500,
    ) -> "SyriaTokenizer":
        """Learn BPE merges from raw text. Deterministic given the same input.

        - words (whitespace-delimited chunks) are converted to UTF-8 bytes;
        - word frequencies are counted so repeated work is amortized;
        - pairs are counted incrementally: after each merge only the words
          containing the merged pair are re-scanned.
        """
        tok = cls(special_tokens=special_tokens)
        target_merges = max(0, vocab_size - tok.vocab_size)

        # 1. word frequency table (symbols start as raw byte ids)
        word_freq: Counter[tuple[int, ...]] = Counter()
        corpus_bytes = 0
        for text in texts:
            corpus_bytes += len(text.encode("utf-8"))
            for word in PRETOKEN_PATTERN.findall(text):
                word_freq[tuple(tok.byte_base + b for b in word.encode("utf-8"))] += 1
        words: list[tuple[int, ...]] = list(word_freq.keys())
        freqs: list[int] = [word_freq[w] for w in words]

        # 2. initial pair counts + inverted index pair -> word indices
        pair_counts: Counter[tuple[int, int]] = Counter()
        pair_to_words: defaultdict[tuple[int, int], set[int]] = defaultdict(set)
        for wi, (word, freq) in enumerate(zip(words, freqs)):
            for pair in zip(word, word[1:]):
                pair_counts[pair] += freq
                pair_to_words[pair].add(wi)

        # 3. greedy merging loop
        learned: list[tuple[int, int]] = []
        for step in range(target_merges):
            best: Optional[tuple[int, int]] = None
            best_count = min_pair_count - 1
            for pair, count in pair_counts.items():
                if count > best_count or (count == best_count and best is not None and pair < best):
                    best, best_count = pair, count
            if best is None or best_count < min_pair_count:
                break  # corpus exhausted
            new_id = tok._first_merge_id + len(learned)
            learned.append(best)
            # rewrite every affected word, updating counts incrementally
            for wi in list(pair_to_words[best]):
                old = words[wi]
                freq = freqs[wi]
                new_symbols: list[int] = []
                j = 0
                while j < len(old):
                    if j < len(old) - 1 and old[j] == best[0] and old[j + 1] == best[1]:
                        new_symbols.append(new_id)
                        j += 2
                    else:
                        new_symbols.append(old[j])
                        j += 1
                for pair in zip(old, old[1:]):
                    pair_counts[pair] -= freq
                    if pair_counts[pair] <= 0:
                        del pair_counts[pair]
                    pair_to_words[pair].discard(wi)
                words[wi] = tuple(new_symbols)
                for pair in zip(new_symbols, new_symbols[1:]):
                    pair_counts[pair] += freq
                    pair_to_words[pair].add(wi)
            pair_counts.pop(best, None)
            pair_to_words.pop(best, None)
            if progress_every and (step + 1) % progress_every == 0:
                print(f"[tokenizer] merge {step + 1}/{target_merges} (best pair {best}, count {best_count})", flush=True)

        tok.merges = learned
        corpus_hash = hashlib.sha256(str(sorted(word_freq.items())).encode("utf-8")).hexdigest()[:16]
        tok._rebuild_maps()
        tok.meta = {
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "corpus_bytes": corpus_bytes,
            "corpus_words": int(sum(freqs)),
            "unique_words": len(freqs),
            "corpus_hash": corpus_hash,
            "learned_merges": len(learned),
        }
        return tok

    # ------------------------------------------------------------------ #
    # encode / decode
    # ------------------------------------------------------------------ #
    def _encode_word(self, word: str) -> list[int]:
        cached = self._word_cache.get(word)
        if cached is not None:
            return cached
        ids = [self.byte_base + b for b in word.encode("utf-8")]
        while len(ids) >= 2:
            pairs = set(zip(ids, ids[1:]))
            # apply the learned merge with the lowest rank
            best = None
            best_rank = None
            for pair in pairs:
                rank = self.merge_ranks.get(pair)
                if rank is not None and (best_rank is None or rank < best_rank):
                    best, best_rank = pair, rank
            if best is None:
                break
            ids = self._merge_sequence(ids, best, self.merge_map[best])
        if len(self._word_cache) < 200_000:
            self._word_cache[word] = ids
        return ids

    @staticmethod
    def _merge_sequence(ids: list[int], pair: tuple[int, int], new_id: int) -> list[int]:
        out: list[int] = []
        i = 0
        n = len(ids)
        while i < n:
            if i < n - 1 and ids[i] == pair[0] and ids[i + 1] == pair[1]:
                out.append(new_id)
                i += 2
            else:
                out.append(ids[i])
                i += 1
        return out

    def encode(self, text: str, use_special_tokens: bool = True) -> list[int]:
        """Encode a string. Byte-level guarantees full coverage of Unicode."""
        ids: list[int] = []
        if use_special_tokens and self.special_tokens:
            pattern = "(" + "|".join(re.escape(t) for t in self.special_tokens) + ")"
            parts = re.split(pattern, text)
        else:
            parts = [text]
        for part in parts:
            if part is None or part == "":
                continue
            special_id = self.special_to_id.get(part) if use_special_tokens else None
            if special_id is not None:
                ids.append(special_id)
            else:
                for word in PRETOKEN_PATTERN.findall(part):
                    ids.extend(self._encode_word(word))
        return ids

    def decode(self, ids: Iterable[int]) -> str:
        """Decode ids back to text. Round-trip safe (byte-level + replace)."""
        buf = bytearray()
        pieces: list[str] = []
        for tid in ids:
            tid = int(tid)
            special = self.id_to_special.get(tid)
            if special is not None:
                if buf:
                    pieces.append(buf.decode("utf-8", errors="replace"))
                    buf.clear()
                pieces.append(special)
                continue
            b = self._token_bytes.get(tid)
            if b is None:
                raise KeyError(f"unknown token id {tid}")
            buf.extend(b)
        if buf:
            pieces.append(buf.decode("utf-8", errors="replace"))
        return "".join(pieces)

    # ------------------------------------------------------------------ #
    # persistence & stats
    # ------------------------------------------------------------------ #
    def save(self, path: str) -> None:
        payload = {
            "tokenizer_id": TOKENIZER_ID,
            "version": self.version,
            "special_tokens": self.special_tokens,
            # merges stored as [a, b] pairs; new id = n_special + 256 + rank
            "merges": [[a, b] for a, b in self.merges],
            "vocab_size": self.vocab_size,
            "meta": self.meta,
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)

    @classmethod
    def load(cls, path: str) -> "SyriaTokenizer":
        with open(path, "r", encoding="utf-8") as f:
            payload = json.load(f)
        tok = cls(
            merges=[(int(a), int(b)) for a, b in payload["merges"]],
            special_tokens=payload["special_tokens"],
            version=payload.get("version", TOKENIZER_VERSION),
            meta=payload.get("meta", {}),
        )
        tok._rebuild_maps()
        return tok

    def stats(self, sample_texts: Optional[list[str]] = None) -> dict:
        info = {
            "tokenizer_id": TOKENIZER_ID,
            "version": self.version,
            "vocab_size": self.vocab_size,
            "n_special": self.n_special,
            "n_bytes": 256,
            "n_merges": len(self.merges),
            **self.meta,
        }
        if sample_texts:
            total_chars = 0
            total_tokens = 0
            for t in sample_texts:
                total_chars += len(t)
                total_tokens += len(self.encode(t))
            if total_chars:
                info["sample_compression_chars_per_token"] = round(total_chars / total_tokens, 3)
        return info
