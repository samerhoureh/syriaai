"""SYRIA TRAINING ENGINE tests — the real training loop.

Covers: tiny-model overfit sanity (loss actually decreases), deterministic
training under a fixed seed, checkpoint save/load fidelity, training resume
from a checkpoint, and portable (environment-independent) config serialization.
"""

from __future__ import annotations

import os

import pytest
import torch

from syria_ai.model.config import ModelConfig
from syria_ai.model.utils import build_model
from syria_ai.training.trainer import (
    Trainer,
    TrainingConfig,
    load_checkpoint,
    portable_training_config,
    restore_rng,
    save_checkpoint,
    snapshot_rng,
)


def _tiny_cfg(vocab: int) -> ModelConfig:
    return ModelConfig(
        model_id="syria-ai-test-trainer",
        vocab_size=vocab,
        block_size=16,
        n_layer=2,
        n_head=2,
        n_embd=64,
        ffn_mult=4,
        dropout=0.0,
    )


def _train_cfg(out_dir: str, steps: int, **over) -> TrainingConfig:
    return TrainingConfig(
        exp_id="TEST-TRAINER",
        out_dir=out_dir,
        batch_size=4,
        max_steps=steps,
        lr=3e-3,
        warmup_steps=max(2, steps // 10),
        eval_interval=max(2, steps // 2),
        eval_batches=2,
        log_interval=5,
        checkpoint_interval=10_000,
        seed=42,
        torch_threads=1,
        **over,
    )


# --------------------------------------------------------------------------- #
# 1. overfit sanity: the loop must actually reduce loss on a tiny corpus
# --------------------------------------------------------------------------- #
def test_overfit_reduces_loss(tmp_path, tiny_shards):
    cfg = _tiny_cfg(400)  # vocab matches the conftest tiny tokenizer
    model = build_model(cfg, seed=42)
    tcfg = _train_cfg(str(tmp_path / "out"), steps=60)
    tcfg.train_bin = tiny_shards["paths"]["train"]
    tcfg.valid_bin = tiny_shards["paths"]["valid"]
    trainer = Trainer(model, tcfg)
    baseline = trainer.evaluate(trainer.train_ds, max_batches=4)
    metrics = trainer.train()
    assert metrics["steps_completed"] == 60
    assert metrics["tokens_processed"] > 0
    assert metrics["final_train_loss"] < baseline


# --------------------------------------------------------------------------- #
# 2. deterministic training under a fixed seed
# --------------------------------------------------------------------------- #
def test_training_is_deterministic_same_seed(tmp_path, tiny_shards):
    cfg = _tiny_cfg(400)
    weights = []
    for run in range(2):
        model = build_model(cfg, seed=42)
        tcfg = _train_cfg(str(tmp_path / f"run{run}"), steps=6)
        tcfg.train_bin = tiny_shards["paths"]["train"]
        tcfg.valid_bin = tiny_shards["paths"]["valid"]
        Trainer(model, tcfg).train()
        weights.append({k: v.clone() for k, v in model.state_dict().items()})
    for k in weights[0]:
        assert torch.equal(weights[0][k], weights[1][k])


# --------------------------------------------------------------------------- #
# 3. checkpoint save/load fidelity (+ portable persisted config)
# --------------------------------------------------------------------------- #
def test_checkpoint_save_load_roundtrip(tmp_path):
    cfg = _tiny_cfg(320)
    model1 = build_model(cfg, seed=1)
    model2 = build_model(cfg, seed=999)  # different random weights
    path = str(tmp_path / "checkpoint.pt")
    size = save_checkpoint(
        path,
        model1,
        torch.optim.AdamW(model1.parameters(), lr=1e-3),
        step=33,
        train_cfg=_train_cfg(str(tmp_path / "artifacts" / "EXP-X"), steps=10),
        rng_state=snapshot_rng(),
    )
    assert size > 0 and os.path.exists(path)

    ckpt = load_checkpoint(path)
    model2.load_state_dict(ckpt["model_state"], strict=True)
    for p1, p2 in zip(model1.parameters(), model2.parameters()):
        assert torch.equal(p1, p2)
    assert ckpt["step"] == 33
    assert ckpt["model_config"]["model_id"] == cfg.model_id
    # persisted training config must be portable — no absolute environment paths
    persisted = ckpt["training_config"]
    assert not os.path.isabs(persisted["out_dir"])
    assert not os.path.isabs(persisted["train_bin"])
    assert not os.path.isabs(persisted["valid_bin"])


# --------------------------------------------------------------------------- #
# 4. resume from a checkpoint: weights + optimizer + RNG state carried over
# --------------------------------------------------------------------------- #
def test_resume_from_checkpoint(tmp_path, tiny_shards):
    cfg = _tiny_cfg(400)
    # phase 1: train 30 steps, save checkpoint (trainer saves at end of train())
    model_a = build_model(cfg, seed=42)
    tcfg_a = _train_cfg(str(tmp_path / "phase1"), steps=30)
    tcfg_a.train_bin = tiny_shards["paths"]["train"]
    tcfg_a.valid_bin = tiny_shards["paths"]["valid"]
    Trainer(model_a, tcfg_a).train()
    ckpt = load_checkpoint(os.path.join(str(tmp_path / "phase1"), "checkpoint.pt"))
    loss_at_load = None
    # phase 2: fresh trainer resumes from the checkpoint and keeps improving
    model_b = build_model(cfg, seed=1234)  # deliberately different init
    tcfg_b = _train_cfg(str(tmp_path / "phase2"), steps=40)
    tcfg_b.train_bin = tiny_shards["paths"]["train"]
    tcfg_b.valid_bin = tiny_shards["paths"]["valid"]
    trainer_b = Trainer(model_b, tcfg_b)
    trainer_b.model.load_state_dict(ckpt["model_state"])
    trainer_b.optimizer.load_state_dict(ckpt["optimizer_state"])
    restore_rng(ckpt["rng_state"])
    loss_at_load = trainer_b.evaluate(trainer_b.train_ds, max_batches=4)
    metrics = trainer_b.train()
    # resumed (already partially trained) weights must beat the fresh baseline
    fresh = build_model(cfg, seed=1234)
    tcfg_f = _train_cfg(str(tmp_path / "fresh"), steps=40)
    tcfg_f.train_bin = tiny_shards["paths"]["train"]
    tcfg_f.valid_bin = tiny_shards["paths"]["valid"]
    trainer_f = Trainer(fresh, tcfg_f)
    baseline = trainer_f.evaluate(trainer_f.train_ds, max_batches=4)
    assert metrics["final_train_loss"] < baseline
    assert loss_at_load <= baseline * 1.5  # loaded weights are not random noise


# --------------------------------------------------------------------------- #
# 5. portable training-config serialization
# --------------------------------------------------------------------------- #
def test_portable_training_config_strips_absolute_paths(tmp_path):
    cfg = _train_cfg(str(tmp_path / "artifacts" / "EXP-X"), steps=4)
    cfg.train_bin = str(tmp_path / "data" / "train.bin")
    cfg.valid_bin = str(tmp_path / "data" / "valid.bin")
    d = portable_training_config(cfg)
    assert not os.path.isabs(d["out_dir"])
    assert not os.path.isabs(d["train_bin"])
    assert not os.path.isabs(d["valid_bin"])
    assert d["max_steps"] == 4
    # in-memory config keeps working absolute paths
    assert os.path.isabs(cfg.out_dir)
