"""Utility helpers for the SYRIA AI neural engine."""

from __future__ import annotations

import os

import torch

from .config import ModelConfig
from .transformer import SyriaTransformer


def set_seed(seed: int) -> None:
    """Deterministic seeding across all RNGs used by the stack."""
    import random

    random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def device_report() -> dict:
    """Honest hardware report: GPU only if actually detected."""
    gpus = []
    if torch.cuda.is_available():
        for i in range(torch.cuda.device_count()):
            props = torch.cuda.get_device_properties(i)
            free, total = torch.cuda.mem_get_info(i)
            gpus.append(
                {
                    "index": i,
                    "name": props.name,
                    "total_memory_mb": round(props.total_memory / 1024 / 1024, 1),
                    "free_memory_mb": round(free / 1024 / 1024, 1),
                    "compute_capability": f"{props.major}.{props.minor}",
                }
            )
    return {
        "cuda_available": torch.cuda.is_available(),
        "gpus": gpus,
        "message": "GPU detected" if gpus else "No GPU detected",
        "cpu_threads": os.cpu_count() or 1,
        "torch_threads": torch.get_num_threads(),
    }


def pick_device(preference: str = "auto") -> torch.device:
    if preference == "auto":
        return torch.device("cuda" if torch.cuda.is_available() else "cpu")
    return torch.device(preference)


def portable_record_path(p: str) -> str:
    """Normalize a path for PERSISTED records (metadata, checkpoints, proofs).

    Runtime code may use absolute paths (works from any cwd on any machine),
    but everything written to disk as a record must stay environment-
    independent: absolute paths are collapsed to the package-relative tail
    ('artifacts/...' or 'data/...'); anything else falls back to the basename.
    """
    if not isinstance(p, str) or not os.path.isabs(p):
        return p
    for marker in ("artifacts/", "data/"):
        idx = p.find(marker)
        if idx != -1:
            return p[idx:]
    return os.path.basename(p)


def build_model(cfg: ModelConfig, seed: int | None = None) -> SyriaTransformer:
    """Instantiate a fresh, randomly initialized SYRIA AI model."""
    if seed is not None:
        set_seed(seed)
    cfg.validate()
    return SyriaTransformer(cfg)
