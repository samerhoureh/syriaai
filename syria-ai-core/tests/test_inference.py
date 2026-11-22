"""SYRIA INFERENCE ENGINE tests — real weights in, real tokens out.

Covers: the honest MODEL_NOT_READY state, checkpoint loading with version
validation, deterministic generation with a seed, streaming and cooperative
cancellation. No rules, no canned responses, no external APIs.
"""

from __future__ import annotations

import pytest
import torch

from syria_ai.inference.engine import InferenceEngine, ModelNotReady


# --------------------------------------------------------------------------- #
# 1. honest MODEL_NOT_READY state when no checkpoint exists
# --------------------------------------------------------------------------- #
def test_model_not_ready_on_empty_dir(tmp_path):
    engine = InferenceEngine(str(tmp_path / "does-not-exist"))
    info = engine.info()
    assert info["ready"] is False
    assert info["status"] == "MODEL_NOT_READY"
    assert engine.ready is False
    with pytest.raises(ModelNotReady):
        engine.generate("اختبار")


def test_load_raises_when_artifacts_missing(tmp_path):
    engine = InferenceEngine(str(tmp_path))
    with pytest.raises(ModelNotReady):
        engine.load()


# --------------------------------------------------------------------------- #
# 2. load a REAL trained checkpoint and generate from it
# --------------------------------------------------------------------------- #
def test_load_and_generate_from_trained_weights(tiny_artifacts):
    engine = InferenceEngine(tiny_artifacts)
    info = engine.load()
    assert info["ready"] is True
    assert info["status"] == "READY"
    assert info["vocab_size"] > 0
    assert info["checkpoint_step"] == 8

    result = engine.generate("مرحبا", max_new_tokens=12, temperature=1.0, top_k=20, seed=7)
    assert result.output_tokens == 12
    assert result.prompt_tokens > 0
    assert isinstance(result.text, str)
    assert result.elapsed_ms > 0
    assert result.tokens_per_sec > 0
    assert result.model_id == "syria-ai-test"


# --------------------------------------------------------------------------- #
# 3. generation determinism with a fixed seed
# --------------------------------------------------------------------------- #
def test_generation_is_deterministic_with_seed(tiny_artifacts):
    engine = InferenceEngine(tiny_artifacts)
    engine.load()
    a = engine.generate("التعليم", max_new_tokens=10, temperature=1.0, top_k=20, seed=123)
    b = engine.generate("التعليم", max_new_tokens=10, temperature=1.0, top_k=20, seed=123)
    assert a.text == b.text
    assert a.output_tokens == b.output_tokens


# --------------------------------------------------------------------------- #
# 4. tokenizer/model version validation on load
# --------------------------------------------------------------------------- #
def test_load_rejects_vocab_mismatch(tiny_artifacts, tmp_path):
    import json
    import os
    import shutil

    bad_dir = str(tmp_path / "bad")
    shutil.copytree(tiny_artifacts, bad_dir)
    tok_path = os.path.join(bad_dir, "tokenizer.json")
    with open(tok_path, encoding="utf-8") as f:
        tok_json = json.load(f)
    # corrupt the tokenizer: drop merges so the vocab no longer matches
    if isinstance(tok_json, dict) and "merges" in tok_json:
        tok_json["merges"] = tok_json["merges"][: len(tok_json["merges"]) // 2]
        with open(tok_path, "w", encoding="utf-8") as f:
            json.dump(tok_json, f, ensure_ascii=False)
        engine = InferenceEngine(bad_dir)
        with pytest.raises(ValueError, match="mismatch"):
            engine.load()


# --------------------------------------------------------------------------- #
# 5. streaming yields tokens and cancellation stops early
# --------------------------------------------------------------------------- #
def test_generate_stream_and_cancel(tiny_artifacts):
    engine = InferenceEngine(tiny_artifacts)
    engine.load()
    chunks: list[str] = []
    for event in engine.generate_stream("t-stream", "دمشق", max_new_tokens=16, temperature=1.0, top_k=20, seed=9):
        if event["type"] == "token":
            chunks.append(event["piece"])
    assert len(chunks) >= 1
    assert "".join(chunks) != ""

    # cooperative cancellation: pre-set the flag, the stream must stop early
    engine2 = InferenceEngine(tiny_artifacts)
    engine2.load()
    assert engine2.cancel("unknown-id") is False  # cancelling an unknown request
    engine2._register("t-cancel")
    assert engine2.cancel("t-cancel") is True
    received: list[str] = []
    for event in engine2.generate_stream("t-cancel", "دمشق", max_new_tokens=64, temperature=1.0, top_k=20, seed=9):
        if event["type"] == "token":
            received.append(event["piece"])
    full = engine2.generate("دمشق", max_new_tokens=64, temperature=1.0, top_k=20, seed=9)
    assert len(received) < 64  # cancelled stream ends before completing all tokens
    assert full.output_tokens == 64
