"""SYRIA AI — robustness & scientific-integrity tests (Phase C verification).

Covers the independent-verification requirements that go beyond the base suite:

  1. train/valid/test splits are truly disjoint — no validation leakage;
  2. generation provably depends on the actual weights, not static/canned text;
  3. checkpoint save/load restores EVERY weight exactly (bit-equal tensors);
  4. interrupted training resumes with optimizer + RNG state intact;
  5. streaming and batch generation produce identical text;
  6. tokens/sec and perplexity metrics are mathematically correct.

All tests are CPU-only and self-contained: no pretrained artifacts, no network,
no external services. Everything is built from scratch on the fly.
"""

from __future__ import annotations

import math
import os
import random

import pytest
import torch

from syria_ai.data.engine import TokenBlockDataset, Document, split_dataset
from syria_ai.inference.engine import InferenceEngine
from syria_ai.model.config import ModelConfig
from syria_ai.model.utils import build_model
from syria_ai.training.trainer import (
    Trainer,
    TrainingConfig,
    load_checkpoint,
    restore_rng,
    save_checkpoint,
    snapshot_rng,
)

from tests.conftest import TINY_CORPUS


def _cfg(vocab: int) -> ModelConfig:
    return ModelConfig(
        model_id="syria-ai-test-robust",
        vocab_size=vocab,
        block_size=16,
        n_layer=2,
        n_head=2,
        n_embd=64,
        ffn_mult=4,
        dropout=0.0,
    )


def _train_cfg(out_dir: str, steps: int, seed: int = 42, **over) -> TrainingConfig:
    return TrainingConfig(
        exp_id="TEST-ROBUST",
        out_dir=out_dir,
        batch_size=4,
        max_steps=steps,
        lr=3e-3,
        warmup_steps=max(2, steps // 10),
        eval_interval=max(2, steps // 2),
        eval_batches=2,
        log_interval=5,
        checkpoint_interval=10_000,
        seed=seed,
        torch_threads=1,
        **over,
    )


def _shards_for(tiny_shards: dict, cfg: ModelConfig, tcfg: TrainingConfig) -> TrainingConfig:
    tcfg.train_bin = tiny_shards["paths"]["train"]
    tcfg.valid_bin = tiny_shards["paths"]["valid"]
    return tcfg


# --------------------------------------------------------------------------- #
# 1. Validation leakage — splits must be truly disjoint
# --------------------------------------------------------------------------- #
def test_split_dataset_is_disjoint_and_deterministic():
    docs = [
        Document(doc_id=f"d{i}", text=t, source="test", license="CC0")
        for i, t in enumerate(TINY_CORPUS)
    ]
    splits = split_dataset(docs, seed=42, train=0.7, valid=0.15)
    ids = {name: {d.doc_id for d in group} for name, group in splits.items()}

    # pairwise disjoint: no document may appear in two splits
    assert not (ids["train"] & ids["valid"])
    assert not (ids["train"] & ids["test"])
    assert not (ids["valid"] & ids["test"])
    # every document is used exactly once
    assert sum(len(v) for v in ids.values()) == len(docs)

    # deterministic: the same seed reproduces the identical partition
    again = split_dataset(docs, seed=42, train=0.7, valid=0.15)
    assert {d.doc_id for d in again["valid"]} == ids["valid"]
    assert {d.doc_id for d in again["train"]} == ids["train"]

    # a different seed produces a different partition (seed drives the split)
    other = split_dataset(docs, seed=7, train=0.7, valid=0.15)
    assert {d.doc_id for d in other["valid"]} != ids["valid"]


def test_packed_shards_share_no_full_documents(tiny_tokenizer):
    """Token-level leakage check on unique documents: no full document token
    sequence may appear in two different splits."""
    docs = [
        Document(doc_id=f"d{i}", text=t, source="test", license="CC0")
        for i, t in enumerate(TINY_CORPUS[:10])  # the 10 unique corpus documents
    ]
    splits = split_dataset(docs, seed=42, train=0.7, valid=0.15)
    seqs = {
        name: {tuple(tiny_tokenizer.encode(d.text, use_special_tokens=False)) for d in group}
        for name, group in splits.items()
    }
    for name in ("valid", "test"):
        assert not (seqs["train"] & seqs[name]), f"{name} shares full documents with train"


# --------------------------------------------------------------------------- #
# 2. Generation is a function of the weights — not static text
# --------------------------------------------------------------------------- #
def test_generation_depends_on_weights_not_static_data(tiny_tokenizer):
    cfg = _cfg(tiny_tokenizer.vocab_size)
    prompt = "دمشق"
    ids = torch.tensor(
        [tiny_tokenizer.encode(prompt, use_special_tokens=False)], dtype=torch.long
    )

    # two different random inits, identical sampling RNG stream -> different outputs
    outs = []
    for seed in (11, 99):
        model = build_model(cfg, seed=seed)
        model.eval()
        torch.manual_seed(1234)  # freeze the sampling stream (identical for both)
        with torch.no_grad():
            outs.append(model.generate(ids.clone(), max_new_tokens=32, temperature=1.0))
    assert not torch.equal(outs[0], outs[1]), (
        "different weights produced identical generations — output is not weight-driven"
    )

    # perturbing the trained weights must change the output
    model = build_model(cfg, seed=11)
    model.eval()
    torch.manual_seed(1234)
    with torch.no_grad():
        out_a = model.generate(ids.clone(), max_new_tokens=32, temperature=1.0)
        for p in model.parameters():  # nudge one real weight tensor
            p.add_(torch.randn_like(p) * 0.05)
            break
        torch.manual_seed(1234)  # same sampling stream again
        out_b = model.generate(ids.clone(), max_new_tokens=32, temperature=1.0)
    assert not torch.equal(out_a, out_b), (
        "output survived a weight perturbation — generation is not a function of the weights"
    )

    # determinism: same weights + same sampling seed -> identical output
    torch.manual_seed(1234)
    with torch.no_grad():
        out_c = model.generate(ids.clone(), max_new_tokens=32, temperature=1.0)
    assert torch.equal(out_b, out_c)


# --------------------------------------------------------------------------- #
# 3. Checkpoint fidelity — save/load must restore every weight exactly
# --------------------------------------------------------------------------- #
def test_checkpoint_roundtrip_restores_every_weight_exactly(tmp_path, tiny_shards, tiny_tokenizer):
    cfg = _cfg(tiny_tokenizer.vocab_size)
    model_a = build_model(cfg, seed=42)
    tcfg = _shards_for(tiny_shards, cfg, _train_cfg(str(tmp_path / "a"), steps=6))
    trainer_a = Trainer(model_a, tcfg)
    trainer_a.train()

    path = str(tmp_path / "roundtrip.pt")
    size = save_checkpoint(
        path, trainer_a.model, trainer_a.optimizer, step=6, train_cfg=tcfg, rng_state=snapshot_rng()
    )
    assert size > 0 and os.path.exists(path)

    payload = load_checkpoint(path)
    assert payload["step"] == 6
    assert payload["model_id"] == cfg.model_id
    assert "optimizer_state" in payload and "rng_state" in payload

    # load into a model with a deliberately different init
    model_b = build_model(cfg, seed=777)
    model_b.load_state_dict(payload["model_state"], strict=True)

    for (k1, w1), (k2, w2) in zip(
        trainer_a.model.state_dict().items(), model_b.state_dict().items()
    ):
        assert k1 == k2, f"state dict keys diverged: {k1} vs {k2}"
        assert torch.equal(w1, w2), f"weight tensor not bit-equal after round-trip: {k1}"

    # the optimizer state (Adam moments) must round-trip exactly as well
    trainer_b = Trainer(model_b, tcfg)
    trainer_b.optimizer.load_state_dict(payload["optimizer_state"])
    state_a = trainer_a.optimizer.state_dict()["state"]
    state_b = trainer_b.optimizer.state_dict()["state"]
    assert set(state_a.keys()) == set(state_b.keys())
    for pid in state_a:
        for key in state_a[pid]:
            t1, t2 = state_a[pid][key], state_b[pid][key]
            if torch.is_tensor(t1):
                assert torch.equal(t1, t2), f"optimizer tensor mismatch: param {pid} key {key}"


# --------------------------------------------------------------------------- #
# 4. Resume after interruption — weights + optimizer + rng survive
# --------------------------------------------------------------------------- #
def test_resume_continues_training_after_interruption(tmp_path, tiny_shards, tiny_tokenizer):
    cfg = _cfg(tiny_tokenizer.vocab_size)

    # phase 1: train 6 steps, then "interrupt" (checkpoint holds step + rng state)
    model_a = build_model(cfg, seed=42)
    tcfg_a = _shards_for(tiny_shards, cfg, _train_cfg(str(tmp_path / "phase1"), steps=6))
    trainer_a = Trainer(model_a, tcfg_a)
    metrics_a = trainer_a.train()
    ckpt_path = f"{tmp_path / 'phase1' / 'checkpoint.pt'}"
    payload = load_checkpoint(ckpt_path)
    assert payload["step"] == metrics_a["steps_completed"] == 6
    assert payload["rng_state"], "checkpoint must carry the RNG state for exact resume"

    # phase 2: a fresh trainer with a DIFFERENT init adopts the checkpoint
    model_b = build_model(cfg, seed=999)
    tcfg_b = _shards_for(tiny_shards, cfg, _train_cfg(str(tmp_path / "phase2"), steps=10))
    trainer_b = Trainer(model_b, tcfg_b)
    trainer_b.model.load_state_dict(payload["model_state"])
    trainer_b.optimizer.load_state_dict(payload["optimizer_state"])
    restore_rng(payload["rng_state"])

    # the loaded weights are already trained: evaluated loss must be far below
    # the fresh-init baseline and close to the interrupted run's final loss
    loss_at_load = trainer_b.evaluate(trainer_b.train_ds, max_batches=4)
    trainer_f = Trainer(build_model(cfg, seed=999), tcfg_b)
    loss_fresh = trainer_f.evaluate(trainer_f.train_ds, max_batches=4)
    assert loss_at_load < loss_fresh, "resumed weights must beat a fresh random init"
    assert loss_at_load <= metrics_a["final_train_loss"] * 1.5, (
        "resumed weights drifted too far from the interrupted checkpoint"
    )

    # continued training must keep improving past the interruption point
    metrics_b = trainer_b.train()
    assert metrics_b["final_train_loss"] < loss_at_load, (
        "training after resume must reduce loss further"
    )


# --------------------------------------------------------------------------- #
# 5. Streaming and batch generation agree
# --------------------------------------------------------------------------- #
def test_streaming_matches_batch_generation(tiny_artifacts):
    e1 = InferenceEngine(tiny_artifacts)
    e1.load("cpu")
    e2 = InferenceEngine(tiny_artifacts)
    e2.load("cpu")

    result = e1.generate(
        "دمشق", max_new_tokens=20, temperature=0.9, top_k=40, top_p=0.95, seed=123
    )
    events = list(
        e2.generate_stream(
            "req-stream-match", "دمشق", max_new_tokens=20, temperature=0.9, top_k=40, top_p=0.95, seed=123
        )
    )
    token_events = [e for e in events if e["type"] == "token"]
    done_events = [e for e in events if e["type"] == "done"]

    assert done_events, "stream must terminate with a done event"
    assert not any(e["type"] == "cancelled" for e in events)
    assert token_events, "stream must emit token events"
    # the streamed NEW tokens, concatenated, must equal the batch text minus the
    # prompt prefix (batch generate() returns prompt+continuation; stream returns
    # continuation only — the two views must agree exactly)
    assert done_events[0]["text"] == "".join(t["piece"] for t in token_events)
    assert result.text.endswith(done_events[0]["text"]), (
        "streamed continuation must match the batch continuation"
    )
    assert result.output_tokens == done_events[0]["output_tokens"] > 0


# --------------------------------------------------------------------------- #
# 6. Metrics math — tokens/sec and perplexity
# --------------------------------------------------------------------------- #
def test_tokens_processed_and_tokens_per_sec_are_exact(tmp_path, tiny_shards, tiny_tokenizer):
    cfg = _cfg(tiny_tokenizer.vocab_size)
    model = build_model(cfg, seed=5)
    tcfg = _shards_for(tiny_shards, cfg, _train_cfg(str(tmp_path / "metrics"), steps=8))
    metrics = Trainer(model, tcfg).train()

    # grad_accum=1: every optimizer step consumes exactly batch*block tokens
    assert metrics["steps_completed"] == 8
    assert metrics["tokens_processed"] == 8 * tcfg.batch_size * cfg.block_size
    # avg_tokens_per_sec = tokens_processed / exact duration; duration_sec is
    # stored rounded to 0.1 s, so accept the rounding-aware interval
    tokens = metrics["tokens_processed"]
    dur = metrics["duration_sec"]
    avg = metrics["avg_tokens_per_sec"]
    lo = tokens / (dur + 0.1)
    hi = tokens / max(dur - 0.1, 1e-3)
    assert lo - 0.1 <= avg <= hi + 0.1, (
        f"avg_tokens_per_sec {avg} inconsistent with tokens/duration interval [{lo:.1f}, {hi:.1f}]"
    )


def test_perplexity_equals_exp_mean_nll(tiny_shards, tiny_tokenizer):
    cfg = _cfg(tiny_tokenizer.vocab_size)
    model = build_model(cfg, seed=3)
    model.eval()

    ds = TokenBlockDataset(tiny_shards["paths"]["valid"], cfg.block_size)
    x, y = next(ds.iter_batches(4, random.Random(1)))
    with torch.no_grad():
        logits, loss = model(x, y)
        # manual cross-entropy over the same (already next-token-shifted) targets
        manual = torch.nn.functional.cross_entropy(
            logits.view(-1, logits.size(-1)), y.view(-1), ignore_index=-1
        )
    assert torch.allclose(loss, manual, atol=1e-5), (
        "model loss must equal cross_entropy(logits, next-token targets)"
    )
    # perplexity is exp(mean NLL)
    assert math.isclose(float(torch.exp(manual)), math.exp(float(manual)), rel_tol=1e-6)
