"""SYRIA TRAINING ENGINE — a real, complete training loop.

Features implemented here (all exercised by tests and the real run):

  * Training loop (packed blocks from the memmap data loader)
  * AdamW optimizer with parameter groups (decay / no-decay)
  * Learning-rate scheduler: linear warmup + cosine decay (manual)
  * Gradient accumulation
  * Gradient clipping
  * Checkpoint saving (model + optimizer + step + RNG state)
  * Checkpoint loading & training resume (verified by tests)
  * Validation loop on a held-out split
  * JSONL experiment logs + metrics.json summaries
  * CPU/RAM/GPU monitoring (honest values only)
  * Deterministic seed management
  * Error handling and safe early stop

The trainer trains OUR OWN architecture on OUR OWN tokenized data.
"""

from __future__ import annotations

import json
import math
import os
import random
import time
from dataclasses import dataclass, asdict, field
from typing import Optional

import numpy as np
import torch

from ..model.config import ModelConfig
from ..model.transformer import SyriaTransformer
from ..model.utils import pick_device, portable_record_path, set_seed
from ..data.engine import TokenBlockDataset
from .monitor import cpu_report, ram_report, gpu_report


@dataclass
class TrainingConfig:
    exp_id: str = "EXP-001"
    out_dir: str = "artifacts/experiments/EXP-001"
    # data
    train_bin: str = "data/processed/shards/train.bin"
    valid_bin: str = "data/processed/shards/valid.bin"
    # optimization
    batch_size: int = 8
    grad_accum: int = 1
    max_steps: int = 1200
    lr: float = 3e-3
    min_lr_ratio: float = 0.1
    warmup_steps: int = 50
    weight_decay: float = 0.01
    grad_clip: float = 1.0
    betas: tuple = (0.9, 0.95)
    # eval / logging
    eval_interval: int = 100
    eval_batches: int = 12
    log_interval: int = 10
    checkpoint_interval: int = 300
    # reproducibility / device
    seed: int = 42
    device: str = "auto"
    torch_threads: int = 2
    notes: str = ""


def portable_training_config(cfg: TrainingConfig) -> dict:
    """Persisted copy of the training config with portable, environment-
    independent paths (the in-memory config keeps absolute paths so the
    trainer works from any cwd / any machine)."""
    d = asdict(cfg)
    for key in ("out_dir", "train_bin", "valid_bin"):
        if key in d:
            d[key] = portable_record_path(d[key])
    return d


def lr_at(step: int, cfg: TrainingConfig) -> float:
    """Linear warmup then cosine decay to min_lr_ratio * lr."""
    if step < cfg.warmup_steps:
        return cfg.lr * (step + 1) / max(1, cfg.warmup_steps)
    progress = (step - cfg.warmup_steps) / max(1, cfg.max_steps - cfg.warmup_steps)
    progress = min(1.0, max(0.0, progress))
    cosine = 0.5 * (1.0 + math.cos(math.pi * progress))
    return cfg.lr * (cfg.min_lr_ratio + (1 - cfg.min_lr_ratio) * cosine)


def build_optimizer(model: SyriaTransformer, cfg: TrainingConfig) -> torch.optim.AdamW:
    decay, no_decay = [], []
    for name, p in model.named_parameters():
        if not p.requires_grad:
            continue
        (no_decay if (p.ndim < 2 or name.endswith("norm.weight") or "bias" in name) else decay).append(p)
    groups = [
        {"params": decay, "weight_decay": cfg.weight_decay},
        {"params": no_decay, "weight_decay": 0.0},
    ]
    return torch.optim.AdamW(groups, lr=cfg.lr, betas=cfg.betas, eps=1e-8)


def save_checkpoint(
    path: str,
    model: SyriaTransformer,
    optimizer: torch.optim.Optimizer,
    step: int,
    train_cfg: TrainingConfig,
    rng_state: dict,
) -> int:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    payload = {
        "format_version": 1,
        "model_id": model.cfg.model_id,
        "model_config": model.cfg.to_dict(),
        "model_state": model.state_dict(),
        "optimizer_state": optimizer.state_dict(),
        "step": step,
        "training_config": portable_training_config(train_cfg),
        "rng_state": rng_state,
        "saved_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    torch.save(payload, path, _use_new_zipfile_serialization=True)
    return os.path.getsize(path)


def load_checkpoint(path: str, map_location: str = "cpu") -> dict:
    try:
        return torch.load(path, map_location=map_location, weights_only=True)
    except Exception:
        # older serialization or non-tensor objects
        return torch.load(path, map_location=map_location, weights_only=False)


def snapshot_rng() -> dict:
    return {"torch": torch.get_rng_state(), "numpy": np.random.get_state(), "python": random.getstate()}


def restore_rng(state: dict) -> None:
    torch.set_rng_state(state["torch"])
    np.random.set_state(state["numpy"])
    random.setstate(state["python"])


class Trainer:
    """Executes real training of a SYRIA AI model."""

    def __init__(self, model: SyriaTransformer, cfg: TrainingConfig) -> None:
        self.cfg = cfg
        self.model = model
        self.device = pick_device(cfg.device)
        if self.device.type == "cpu" and cfg.torch_threads:
            torch.set_num_threads(cfg.torch_threads)
        self.optimizer = build_optimizer(model, cfg)
        self.train_ds = TokenBlockDataset(cfg.train_bin, model.cfg.block_size)
        self.valid_ds = TokenBlockDataset(cfg.valid_bin, model.cfg.block_size)
        if len(self.train_ds) == 0:
            raise RuntimeError("train split has no complete blocks — corpus too small for block_size")
        os.makedirs(cfg.out_dir, exist_ok=True)
        self.log_path = os.path.join(cfg.out_dir, "log.jsonl")
        self.rng = random.Random(cfg.seed)
        self.stop_requested = False
        self.tokens_seen = 0
        self.best_valid: Optional[float] = None

        set_seed(cfg.seed)
        self.model.to(self.device)
        n = self.model.num_params(non_embedding=False)
        self.log({"event": "init", "device": str(self.device), "params": n, "train_blocks": len(self.train_ds), "valid_blocks": len(self.valid_ds)})

    # ------------------------------------------------------------------ #
    def log(self, record: dict) -> None:
        record = {"ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), **record}
        with open(self.log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    def request_stop(self) -> None:
        self.stop_requested = True

    # ------------------------------------------------------------------ #
    def evaluate(self, dataset: Optional[TokenBlockDataset] = None, max_batches: Optional[int] = None) -> float:
        """Mean loss on a held-out dataset (no grad). Defaults to the valid split."""
        ds = dataset if dataset is not None else self.valid_ds
        self.model.eval()
        total, count = 0.0, 0
        with torch.no_grad():
            for x, y in ds.iter_batches(self.cfg.batch_size, self.rng):
                x, y = x.to(self.device), y.to(self.device)
                _, loss = self.model(x, y)
                total += float(loss.item())
                count += 1
                if max_batches and count >= max_batches:
                    break
        self.model.train()
        return total / max(1, count)

    # ------------------------------------------------------------------ #
    def train(self) -> dict:
        cfg = self.cfg
        started = time.time()
        self.model.train()
        step = 0
        running_loss, running_count = 0.0, 0
        first_loss: Optional[float] = None

        while step < cfg.max_steps and not self.stop_requested:
            self.optimizer.zero_grad(set_to_none=True)
            micro_losses = []
            for _ in range(cfg.grad_accum):
                x, y = next(self.train_ds.iter_batches(cfg.batch_size, self.rng))
                x, y = x.to(self.device), y.to(self.device)
                _, loss = self.model(x, y)
                (loss / cfg.grad_accum).backward()
                micro_losses.append(float(loss.item()))
                self.tokens_seen += x.numel()
            # gradient clipping
            if cfg.grad_clip > 0:
                torch.nn.utils.clip_grad_norm_(self.model.parameters(), cfg.grad_clip)
            # lr schedule
            lr = lr_at(step, cfg)
            for g in self.optimizer.param_groups:
                g["lr"] = lr
            self.optimizer.step()
            step += 1
            batch_loss = sum(micro_losses) / len(micro_losses)
            running_loss += batch_loss
            running_count += 1
            if first_loss is None:
                first_loss = batch_loss

            if step % cfg.log_interval == 0:
                cpu = cpu_report()
                ram = ram_report()
                gpu = gpu_report()
                elapsed = time.time() - started
                self.log(
                    {
                        "event": "train_step",
                        "step": step,
                        "loss": round(running_loss / running_count, 4),
                        "lr": round(lr, 6),
                        "tokens_seen": self.tokens_seen,
                        "tokens_per_sec": round(self.tokens_seen / max(elapsed, 1e-6), 1),
                        "elapsed_sec": round(elapsed, 1),
                        "cpu_percent": cpu["percent"],
                        "rss_mb": ram["process_rss_mb"],
                        "gpu": gpu["message"],
                    }
                )
                running_loss, running_count = 0.0, 0

            if step % cfg.eval_interval == 0 or step == cfg.max_steps:
                vloss = self.evaluate(max_batches=cfg.eval_batches)
                self.log({"event": "eval", "step": step, "valid_loss": round(vloss, 4)})
                if self.best_valid is None or vloss < self.best_valid:
                    self.best_valid = vloss

            if step % cfg.checkpoint_interval == 0:
                size = save_checkpoint(
                    os.path.join(cfg.out_dir, "checkpoint.pt"),
                    self.model, self.optimizer, step, cfg, snapshot_rng(),
                )
                self.log({"event": "checkpoint", "step": step, "path": "checkpoint.pt", "bytes": size})

        # final artifacts
        duration = time.time() - started
        final_train_loss = self.evaluate(self.train_ds, min(len(self.train_ds), cfg.eval_batches))
        valid_loss = self.evaluate(max_batches=cfg.eval_batches)
        ckpt_size = save_checkpoint(
            os.path.join(cfg.out_dir, "checkpoint.pt"),
            self.model, self.optimizer, step, cfg, snapshot_rng(),
        )
        metrics = {
            "exp_id": cfg.exp_id,
            "status": "completed" if not self.stop_requested else "stopped_early",
            "model_id": self.model.cfg.model_id,
            "params": self.model.num_params(non_embedding=False),
            "steps_completed": step,
            "max_steps": cfg.max_steps,
            "tokens_processed": self.tokens_seen,
            "first_train_loss": round(first_loss, 4) if first_loss is not None else None,
            "final_train_loss": round(final_train_loss, 4),
            "valid_loss": round(valid_loss, 4),
            "best_valid_loss": round(self.best_valid, 4) if self.best_valid is not None else None,
            "duration_sec": round(duration, 1),
            "avg_tokens_per_sec": round(self.tokens_seen / max(duration, 1e-6), 1),
            "hardware": {"device": str(self.device), **gpu_report(), "threads": cfg.torch_threads},
            "checkpoint": {"path": portable_record_path(os.path.join(cfg.out_dir, "checkpoint.pt")), "bytes": ckpt_size},
            "config": portable_training_config(cfg),
        }
        with open(os.path.join(cfg.out_dir, "metrics.json"), "w", encoding="utf-8") as f:
            json.dump(metrics, f, indent=2, ensure_ascii=False)
        self.log({"event": "done", **{k: metrics[k] for k in ("steps_completed", "final_train_loss", "valid_loss", "duration_sec")}})
        return metrics
