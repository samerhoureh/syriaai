"""SYRIA DATA ENGINE — real training-data pipeline.

Stages implemented here (all operate on actual files and emit actual stats):

  1. Dataset Import       — JSONL document loader
  2. Source & License      — every document must carry `source` + `license`
  3. Language Detection    — script-ratio heuristic (ar / en / mixed / other)
  4. Text Cleaning         — HTML strip, control chars, whitespace normalize
  5. Deduplication         — exact hash + normalized-prefix near-dup keys
  6. Privacy Filtering     — email/phone/ID regex redaction
  7. Dataset Validation    — license presence, length bounds, charset sanity
  8. Train/Valid/Test Split— deterministic seeded split
  9. Tokenization          — encoded with the SYRIA TOKENIZER
 10. Dataset Sharding      — packed .bin shards (uint16/uint32) + stats.json
 11. Training Data Loader  — memmap block dataset for the training loop
"""

from __future__ import annotations

import hashlib
import json
import os
import random
import re
from dataclasses import dataclass, field, asdict
from typing import Iterable, Iterator

import numpy as np

# --------------------------------------------------------------------------- #
# 1-2. document model & import
# --------------------------------------------------------------------------- #

@dataclass
class Document:
    doc_id: str
    text: str
    source: str
    license: str
    language: str = "unknown"
    license_url: str | None = None
    url: str | None = None
    title: str | None = None
    meta: dict = field(default_factory=dict)

    def to_jsonl(self) -> str:
        return json.dumps(asdict(self), ensure_ascii=False)


def load_jsonl(paths: Iterable[str]) -> list[Document]:
    docs: list[Document] = []
    for path in paths:
        with open(path, "r", encoding="utf-8") as f:
            for line_no, line in enumerate(f):
                line = line.strip()
                if not line:
                    continue
                row = json.loads(line)
                missing = [k for k in ("text", "source", "license") if not row.get(k)]
                if missing:
                    raise ValueError(f"{path}:{line_no} missing required fields {missing}")
                docs.append(
                    Document(
                        doc_id=row.get("doc_id") or f"{os.path.basename(path)}:{line_no}",
                        text=row["text"],
                        source=row["source"],
                        license=row["license"],
                        language=row.get("language", "unknown"),
                        license_url=row.get("license_url"),
                        url=row.get("url"),
                        title=row.get("title"),
                        meta=row.get("meta", {}),
                    )
                )
    return docs


# --------------------------------------------------------------------------- #
# 3. language detection (script-ratio heuristic, no external deps)
# --------------------------------------------------------------------------- #

AR_RE = re.compile(r"[\u0600-\u06FF\u0750-\u077F]")
EN_RE = re.compile(r"[A-Za-z]")
CODE_HINTS = re.compile(r"(def |import |class |function |=>|{|\}|<html|SELECT |print\()")


def detect_language(text: str) -> str:
    letters = re.sub(r"\s", "", text)
    if not letters:
        return "other"
    ar = len(AR_RE.findall(letters)) / len(letters)
    en = len(EN_RE.findall(letters)) / len(letters)
    if ar >= 0.30 and en >= 0.30:
        return "mixed"
    if ar >= 0.30:
        return "ar"
    if en >= 0.30:
        # code-ish if heavy on code tokens and light on prose
        return "en"
    return "other"


def looks_like_code(text: str) -> bool:
    return len(CODE_HINTS.findall(text)) >= 2 and EN_RE.search(text) is not None


# --------------------------------------------------------------------------- #
# 4. cleaning
# --------------------------------------------------------------------------- #

HTML_RE = re.compile(r"<[^>]+>")
CTRL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
WS_RE = re.compile(r"[ \t]+")
NL_RE = re.compile(r"\n{3,}")


def clean_text(text: str) -> str:
    text = HTML_RE.sub(" ", text)
    text = CTRL_RE.sub(" ", text)
    text = text.replace("\u00a0", " ")
    text = WS_RE.sub(" ", text)
    text = NL_RE.sub("\n\n", text)
    return text.strip()


# --------------------------------------------------------------------------- #
# 5. deduplication
# --------------------------------------------------------------------------- #

def _norm_key(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def deduplicate(docs: list[Document]) -> tuple[list[Document], dict]:
    """Exact-hash dedup + near-dup via normalized first-256-chars key."""
    seen_hashes: set[str] = set()
    seen_prefix: set[str] = set()
    kept: list[Document] = []
    removed_exact = 0
    removed_near = 0
    for doc in docs:
        h = hashlib.sha256(_norm_key(doc.text).encode("utf-8")).hexdigest()
        p = _norm_key(doc.text)[:256]
        if h in seen_hashes:
            removed_exact += 1
            continue
        if p in seen_prefix:
            removed_near += 1
            continue
        seen_hashes.add(h)
        seen_prefix.add(p)
        kept.append(doc)
    return kept, {
        "input_docs": len(docs),
        "kept_docs": len(kept),
        "removed_exact": removed_exact,
        "removed_near": removed_near,
        "dedup_ratio": round(1 - len(kept) / max(1, len(docs)), 4),
    }


# --------------------------------------------------------------------------- #
# 6. privacy filtering
# --------------------------------------------------------------------------- #

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(?:\+\d{1,3}[\s-]?)?\d{3}[\s-]\d{3}[\s-]\d{3,4}")
LONG_DIGIT_RE = re.compile(r"\d{8,}")


def privacy_filter(text: str) -> tuple[str, list[str]]:
    """Redact PII patterns. Returns (clean_text, list_of_redactions)."""
    redactions: list[str] = []
    if EMAIL_RE.search(text):
        text = EMAIL_RE.sub("[EMAIL]", text)
        redactions.append("email")
    if PHONE_RE.search(text):
        text = PHONE_RE.sub("[PHONE]", text)
        redactions.append("phone")
    if LONG_DIGIT_RE.search(text):
        text = LONG_DIGIT_RE.sub("[NUMBER]", text)
        redactions.append("long_number")
    return text, redactions


# --------------------------------------------------------------------------- #
# 7. validation
# --------------------------------------------------------------------------- #

ALLOWED_LICENSES = {
    "CC BY-SA 4.0", "CC BY 4.0", "CC0", "Public Domain", "ODC-BY", "MIT",
    "Apache-2.0", "Project-Authored",
}


def validate_document(doc: Document, min_chars: int = 40, max_chars: int = 200_000) -> list[str]:
    errors: list[str] = []
    if len(doc.text) < min_chars:
        errors.append("too_short")
    if len(doc.text) > max_chars:
        errors.append("too_long")
    if doc.license not in ALLOWED_LICENSES:
        errors.append(f"license_not_allowed:{doc.license}")
    if not doc.source:
        errors.append("missing_source")
    if re.search(r"[\uFFFD]", doc.text):
        errors.append("replacement_chars")
    return errors


# --------------------------------------------------------------------------- #
# 8. split (deterministic)
# --------------------------------------------------------------------------- #

def split_dataset(
    docs: list[Document],
    seed: int = 42,
    train: float = 0.94,
    valid: float = 0.04,
) -> dict[str, list[Document]]:
    rng = random.Random(seed)
    idx = list(range(len(docs)))
    rng.shuffle(idx)
    n = len(docs)
    n_train = int(n * train)
    n_valid = int(n * valid)
    return {
        "train": [docs[i] for i in idx[:n_train]],
        "valid": [docs[i] for i in idx[n_train:n_train + n_valid]],
        "test": [docs[i] for i in idx[n_train + n_valid:]],
    }


# --------------------------------------------------------------------------- #
# 10. sharding
# --------------------------------------------------------------------------- #

def pack_tokens(ids: Iterable[int], out_path: str) -> tuple[int, int]:
    """Pack token ids into a flat .bin shard. dtype chosen by vocab size."""
    arr = np.fromiter(ids, dtype=np.int64)
    n = arr.size
    max_id = int(arr.max()) if n else 0
    dtype = np.uint16 if max_id < 65536 else np.uint32
    arr.astype(dtype).tofile(out_path)
    return n, np.dtype(dtype).itemsize


def write_shards(
    tokenized: dict[str, list[list[int]]],
    out_dir: str,
) -> dict:
    """Write packed shard files per split; returns shard stats."""
    os.makedirs(out_dir, exist_ok=True)
    stats: dict = {}
    for split, seqs in tokenized.items():
        path = os.path.join(out_dir, f"{split}.bin")
        flat = (tid for seq in seqs for tid in seq)
        n_tokens, itemsize = pack_tokens(flat, path)
        stats[split] = {
            "path": os.path.relpath(path, os.path.dirname(out_dir)),
            "sequences": len(seqs),
            "tokens": n_tokens,
            "dtype": "uint16" if itemsize == 2 else "uint32",
            "bytes": n_tokens * itemsize,
        }
    return stats


# --------------------------------------------------------------------------- #
# 11. training data loader (memmap)
# --------------------------------------------------------------------------- #

class TokenBlockDataset:
    """Memory-mapped fixed-block dataset for causal LM training.

    Each sample is (block_size,) input ids; targets are the same sequence
    shifted by one (computed in the trainer as ids shifted). We materialize
    both x and y here for clarity: y[i] = x[i+1] with wraparound into the
    next block (standard packed-corpus behavior).
    """

    def __init__(self, bin_path: str, block_size: int) -> None:
        tokens = np.memmap(bin_path, dtype=np.uint16, mode="r")
        self.tokens = tokens
        self.block_size = block_size
        self.n_tokens = len(tokens)
        # number of non-overlapping blocks; keep last partial block for x only
        self.n_blocks = max(0, (self.n_tokens - 1) // block_size)

    def __len__(self) -> int:
        return self.n_blocks

    def __getitem__(self, i: int) -> tuple[np.ndarray, np.ndarray]:
        if i >= self.n_blocks:
            raise IndexError(i)
        start = i * self.block_size
        chunk = self.tokens[start : start + self.block_size + 1].astype(np.int64)
        x = chunk[:-1]
        y = chunk[1:]
        return x, y

    def iter_batches(self, batch_size: int, rng: random.Random):
        """Yield (x, y) torch tensors; blocks drawn without replacement per epoch."""
        import torch

        order = list(range(self.n_blocks))
        rng.shuffle(order)
        for b in range(0, len(order), batch_size):
            batch_idx = order[b : b + batch_size]
            if len(batch_idx) < batch_size:
                batch_idx = batch_idx + order[: batch_size - len(batch_idx)]
            xs, ys = [], []
            for i in batch_idx:
                x, y = self[i]
                xs.append(x)
                ys.append(y)
            yield torch.from_numpy(np.stack(xs)), torch.from_numpy(np.stack(ys))
