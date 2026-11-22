"""SYRIA TOKENIZER tests — byte-level BPE trained from scratch.

Covers: byte-level round-trips (Arabic / English / mixed / code / emoji),
special tokens, vocabulary arithmetic, determinism, merge behavior,
persistence and decoding errors.
"""

from __future__ import annotations

import pytest

from syria_ai.tokenizer.bpe import SPECIAL_TOKENS, SyriaTokenizer

ARABIC = "دمشق مدينة عربية قديمة وأسواقها تفوح برائحة الياسمين."
ENGLISH = "The quick brown fox jumps over the lazy dog."
MIXED = "مرحبا hello — تعرّف على SYRIA AI وpython 3.12!"
CODE = "def train(steps):\n    for i in range(steps):\n        print(i)"
EMOJI = "نص عربي مع إيموجي 🌸 ورموز ∑ π ≈"
EMPTY = ""


# --------------------------------------------------------------------------- #
# round-trips (byte-level => exact for arbitrary unicode)
# --------------------------------------------------------------------------- #
def test_roundtrip_arabic(tiny_tokenizer):
    ids = tiny_tokenizer.encode(ARABIC)
    assert ids and tiny_tokenizer.decode(ids) == ARABIC


def test_roundtrip_english(tiny_tokenizer):
    ids = tiny_tokenizer.encode(ENGLISH)
    assert ids and tiny_tokenizer.decode(ids) == ENGLISH


def test_roundtrip_mixed_script(tiny_tokenizer):
    ids = tiny_tokenizer.encode(MIXED)
    assert ids and tiny_tokenizer.decode(ids) == MIXED


def test_roundtrip_code(tiny_tokenizer):
    ids = tiny_tokenizer.encode(CODE)
    assert ids and tiny_tokenizer.decode(ids) == CODE


def test_roundtrip_emoji_and_symbols(tiny_tokenizer):
    ids = tiny_tokenizer.encode(EMOJI)
    assert ids and tiny_tokenizer.decode(ids) == EMOJI


def test_encode_empty_string(tiny_tokenizer):
    assert tiny_tokenizer.encode(EMPTY) == []
    assert tiny_tokenizer.decode([]) == ""


# --------------------------------------------------------------------------- #
# special tokens
# --------------------------------------------------------------------------- #
def test_special_tokens_registered(tiny_tokenizer):
    assert tiny_tokenizer.special_tokens == SPECIAL_TOKENS
    for tok in SPECIAL_TOKENS:
        assert tok in tiny_tokenizer.special_to_id


def test_encode_special_tokens_ids(tiny_tokenizer):
    text = "<bos>مرحبا<eos>"
    ids = tiny_tokenizer.encode(text, use_special_tokens=True)
    bos = tiny_tokenizer.special_to_id["<bos>"]
    eos = tiny_tokenizer.special_to_id["<eos>"]
    assert ids[0] == bos and ids[-1] == eos


def test_encode_without_special_token_interpretation(tiny_tokenizer):
    text = "<bos>مرحبا"
    ids_plain = tiny_tokenizer.encode(text, use_special_tokens=False)
    assert tiny_tokenizer.decode(ids_plain) == text
    assert tiny_tokenizer.special_to_id["<bos>"] not in ids_plain


# --------------------------------------------------------------------------- #
# vocabulary arithmetic & merges
# --------------------------------------------------------------------------- #
def test_vocab_size_arithmetic(tiny_tokenizer):
    # byte-level base (256) + special tokens + learned merges
    expected = 256 + tiny_tokenizer.n_special + len(tiny_tokenizer.merges)
    assert tiny_tokenizer.vocab_size == expected


def test_training_is_deterministic():
    corpus = ["التعليم أساس التقدم.", "training merges from raw text."] * 5
    t1 = SyriaTokenizer.train(corpus, vocab_size=320, min_pair_count=2)
    t2 = SyriaTokenizer.train(corpus, vocab_size=320, min_pair_count=2)
    assert t1.merges == t2.merges
    assert t1.encode(corpus[0]) == t2.encode(corpus[0])


def test_merges_reduce_sequence_length():
    corpus = ["aaaaaaaaaa"] * 20
    tok = SyriaTokenizer.train(corpus, vocab_size=300, min_pair_count=2)
    ids = tok.encode("a" * 100, use_special_tokens=False)
    assert len(ids) < 100  # merges must compress repeated bytes


# --------------------------------------------------------------------------- #
# persistence
# --------------------------------------------------------------------------- #
def test_save_and_load_roundtrip(tiny_tokenizer, tmp_path):
    path = str(tmp_path / "tokenizer.json")
    tiny_tokenizer.save(path)
    loaded = SyriaTokenizer.load(path)
    assert loaded.merges == tiny_tokenizer.merges
    assert loaded.special_tokens == tiny_tokenizer.special_tokens
    assert loaded.version == tiny_tokenizer.version
    sample = MIXED
    assert loaded.decode(loaded.encode(sample)) == sample


# --------------------------------------------------------------------------- #
# errors & stats
# --------------------------------------------------------------------------- #
def test_decode_unknown_id_raises(tiny_tokenizer):
    bad_id = tiny_tokenizer.vocab_size + 500
    with pytest.raises(KeyError):
        tiny_tokenizer.decode([bad_id])


def test_stats_report(tiny_tokenizer):
    stats = tiny_tokenizer.stats([ARABIC, ENGLISH])
    assert isinstance(stats, dict)
    assert stats.get("vocab_size") == tiny_tokenizer.vocab_size
