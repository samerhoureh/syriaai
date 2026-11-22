"""SYRIA DATA ENGINE tests — the 11-component pipeline (real, local only).

Covers: language detection, cleaning, deduplication, privacy filtering,
document validation, deterministic splitting, packing/sharding and the
memmap block dataset used by the trainer.
"""

from __future__ import annotations

import random

from syria_ai.data.engine import (
    Document,
    TokenBlockDataset,
    clean_text,
    deduplicate,
    detect_language,
    looks_like_code,
    pack_tokens,
    privacy_filter,
    split_dataset,
    validate_document,
    write_shards,
)


def _doc(text: str, doc_id: str = "d", license: str = "CC0", source: str = "test") -> Document:
    return Document(doc_id=doc_id, text=text, source=source, license=license)


# --------------------------------------------------------------------------- #
# 1. language detection
# --------------------------------------------------------------------------- #
def test_detect_language_arabic():
    assert detect_language("هذا نص عربي طويل وواضح للكشف عن اللغة العربية") == "ar"


def test_detect_language_english():
    assert detect_language("This is a plain English sentence about learning.") == "en"


def test_detect_language_mixed():
    assert detect_language("هذا نص عربي واضح mixed with clear english words") == "mixed"


def test_looks_like_code():
    assert looks_like_code("def f(x):\n    return {'a': x}  # done")
    assert not looks_like_code("نص عربي عادي بسيط بدون كود")


# --------------------------------------------------------------------------- #
# 2. cleaning
# --------------------------------------------------------------------------- #
def test_clean_text_removes_html_and_normalizes():
    dirty = "<p>مرحبا\t\tبالعالم</p>\n\n\n\nسطر ثانٍ\u00a0 أكثر"
    out = clean_text(dirty)
    assert "<" not in out and ">" not in out
    assert "\t" not in out
    assert "\u00a0" not in out
    assert "\n\n\n" not in out


# --------------------------------------------------------------------------- #
# 3. deduplication
# --------------------------------------------------------------------------- #
def test_deduplicate_removes_exact_and_near_duplicates():
    docs = [
        _doc("النص الأول المكرر حرفياً هنا", doc_id="a"),
        _doc("النص الأول المكرر حرفياً هنا", doc_id="b"),           # exact duplicate
        _doc("النص  الأول  المكرر  حرفياً  هنا", doc_id="c"),        # whitespace-only variant
        _doc("نص مختلف تماماً عن السابق بمعنى وبحروف", doc_id="d"),
    ]
    kept, report = deduplicate(docs)
    assert report["input_docs"] == 4
    assert len(kept) == 2
    assert report["removed_exact"] + report["removed_near"] == 2


# --------------------------------------------------------------------------- #
# 4. privacy filter
# --------------------------------------------------------------------------- #
def test_privacy_filter_redacts_pii():
    text = "راسلني على user@example.com أو اتصل على 0932 123 456 ورقم البطاقة 123456789012."
    cleaned, redactions = privacy_filter(text)
    assert "user@example.com" not in cleaned
    assert "0932 123 456" not in cleaned
    assert "123456789012" not in cleaned
    assert "email" in redactions and "phone" in redactions


# --------------------------------------------------------------------------- #
# 5. validation
# --------------------------------------------------------------------------- #
def test_validate_document_accepts_good_doc():
    doc = _doc("نص عربي طويل بما يكفي ليجتاز فحص الحد الأدنى لعدد المحارف المطلوب.", license="CC BY 4.0")
    assert validate_document(doc) == []


def test_validate_document_reports_problems():
    short = _doc("قصير", doc_id="s")
    errs = validate_document(short)
    assert "too_short" in errs
    bad_license = _doc("نص طويل بما يكفي ليجتاز فحص الطول الأدنى المطلوب هنا.", license="UNKNOWN-LICENSE")
    errs2 = validate_document(bad_license)
    assert any(e.startswith("license_not_allowed") for e in errs2)


# --------------------------------------------------------------------------- #
# 6. deterministic split
# --------------------------------------------------------------------------- #
def test_split_dataset_deterministic_proportions():
    docs = [_doc(f"نص تجريبي رقم {i} يحتوي محتوى كافياً للاختبار {i * 7}", doc_id=f"d{i}") for i in range(100)]
    s1 = split_dataset(docs, seed=42)
    s2 = split_dataset(docs, seed=42)
    assert len(s1["train"]) == 94 and len(s1["valid"]) == 4 and len(s1["test"]) == 2
    assert [d.doc_id for d in s1["train"]] == [d.doc_id for d in s2["train"]]
    ids = [d.doc_id for d in s1["train"]] + [d.doc_id for d in s1["valid"]] + [d.doc_id for d in s1["test"]]
    assert sorted(ids) == sorted(d.doc_id for d in docs)  # no loss, no duplication


# --------------------------------------------------------------------------- #
# 7. packing, sharding and the training block dataset
# --------------------------------------------------------------------------- #
def test_pack_tokens_roundtrip(tmp_path):
    ids = list(range(300)) * 2
    path = str(tmp_path / "s.bin")
    n, itemsize = pack_tokens(ids, path)
    assert n == len(ids)
    assert itemsize == 2  # max id 299 < 65536 => uint16
    import numpy as np

    arr = np.fromfile(path, dtype=np.uint16)
    assert list(arr) == ids


def test_write_shards_and_block_dataset(tmp_path, tiny_tokenizer, tiny_shards):
    stats = tiny_shards["stats"]
    assert set(stats) == {"train", "valid", "test"}
    assert stats["train"]["tokens"] > 0

    block = 16
    ds = TokenBlockDataset(tiny_shards["paths"]["train"], block)
    assert len(ds) > 0
    x, y = ds[0]
    assert x.shape == (block,) and y.shape == (block,)
    # targets are the inputs shifted by one
    assert (y[:-1].astype(x.dtype) == x[1:].astype(y.dtype)).all()

    batches = list(ds.iter_batches(4, random.Random(1)))
    bx, by = batches[0]
    assert bx.shape[0] == 4 and by.shape[0] == 4


def test_write_shards_paths_are_relative(tmp_path, tiny_tokenizer):
    seqs = [tiny_tokenizer.encode("نص بسيط للتغليف في shard", use_special_tokens=False)]
    stats = write_shards({"train": seqs}, str(tmp_path / "out"))
    assert not stats["train"]["path"].startswith("/")
