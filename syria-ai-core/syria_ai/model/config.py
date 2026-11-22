"""SYRIA AI — model configuration and the model family presets.

Every configuration here describes a *from-scratch* architecture. No preset
in this file ever refers to pretrained weights. Nano/Mini/Base/Pro presets
exist only for parameter-count estimation and capacity planning: they are
PLANNED configurations and are NOT trained in the current phase.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, asdict


@dataclass
class ModelConfig:
    """Architecture hyper-parameters of a SYRIA AI decoder-only transformer."""

    model_id: str = "syria-ai-debug"
    arch_name: str = "decoder-only-baseline"
    vocab_size: int = 4096
    block_size: int = 256          # max sequence length (context window)
    n_layer: int = 4
    n_head: int = 4
    n_embd: int = 128
    ffn_mult: int = 4              # feed-forward hidden = n_embd * ffn_mult
    dropout: float = 0.1
    bias: bool = True
    norm: str = "rmsnorm"          # rmsnorm | layernorm
    weight_tying: bool = True      # tie lm_head to token embedding
    activation: str = "gelu-tanh"  # manual GELU (tanh approximation)

    def validate(self) -> None:
        if self.n_embd % self.n_head != 0:
            raise ValueError(f"n_embd ({self.n_embd}) must be divisible by n_head ({self.n_head})")
        if self.norm not in ("rmsnorm", "layernorm"):
            raise ValueError(f"unknown norm: {self.norm}")
        if self.block_size < 8 or self.vocab_size < 300:
            raise ValueError("block_size/vocab_size too small")

    def to_dict(self) -> dict:
        return asdict(self)

    def to_json(self, path: str) -> None:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, indent=2, ensure_ascii=False)

    @classmethod
    def from_dict(cls, d: dict) -> "ModelConfig":
        known = {f for f in cls.__dataclass_fields__}  # type: ignore[attr-defined]
        return cls(**{k: v for k, v in d.items() if k in known})

    @classmethod
    def from_json_file(cls, path: str) -> "ModelConfig":
        with open(path, "r", encoding="utf-8") as f:
            return cls.from_dict(json.load(f))


# ---------------------------------------------------------------------------
# Model family presets (PLANNED except debug).
# Parameter counts are computed exactly by syria_ai.model.utils.param_count.
# ---------------------------------------------------------------------------

def debug_config() -> ModelConfig:
    """SYRIA AI Debug — the first trainable configuration (~1.2M params).
    Small enough to train end-to-end on 2 CPU cores / 4 GB RAM."""
    return ModelConfig(
        model_id="syria-ai-debug",
        arch_name="decoder-only-baseline",
        vocab_size=4096,
        block_size=256,
        n_layer=4,
        n_head=4,
        n_embd=128,
        ffn_mult=4,
        dropout=0.1,
    )


def overfit_config() -> ModelConfig:
    """Tiny configuration used by the automated overfit sanity test."""
    return ModelConfig(
        model_id="syria-ai-debug-overfit",
        vocab_size=512,
        block_size=64,
        n_layer=2,
        n_head=2,
        n_embd=64,
        ffn_mult=4,
        dropout=0.0,
    )


def nano_config() -> ModelConfig:
    """SYRIA AI Nano — 50M target (PLANNED, not trained in this phase)."""
    return ModelConfig(
        model_id="syria-ai-nano",
        vocab_size=16384,
        block_size=1024,
        n_layer=8,
        n_head=8,
        n_embd=512,
        ffn_mult=4,
        dropout=0.1,
    )


def mini_config() -> ModelConfig:
    """SYRIA AI Mini — 150M target (PLANNED, not trained in this phase)."""
    return ModelConfig(
        model_id="syria-ai-mini",
        vocab_size=32768,
        block_size=2048,
        n_layer=12,
        n_head=12,
        n_embd=768,
        ffn_mult=4,
        dropout=0.1,
    )


def base_config() -> ModelConfig:
    """SYRIA AI Base — 1B target (PLANNED)."""
    return ModelConfig(
        model_id="syria-ai-base",
        vocab_size=49152,
        block_size=4096,
        n_layer=20,
        n_head=20,
        n_embd=2048,
        ffn_mult=4,
        dropout=0.1,
    )


def pro_config() -> ModelConfig:
    """SYRIA AI Pro — 3B target (PLANNED)."""
    return ModelConfig(
        model_id="syria-ai-pro",
        vocab_size=65536,
        block_size=4096,
        n_layer=26,
        n_head=26,
        n_embd=2560,
        ffn_mult=4,
        dropout=0.1,
    )


FAMILY_PRESETS = {
    "syria-ai-debug": debug_config,
    "syria-ai-nano": nano_config,
    "syria-ai-mini": mini_config,
    "syria-ai-base": base_config,
    "syria-ai-pro": pro_config,
}
