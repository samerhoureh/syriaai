"""SYRIA AI neural model package (built from scratch)."""

from .config import (
    FAMILY_PRESETS,
    ModelConfig,
    base_config,
    debug_config,
    mini_config,
    nano_config,
    overfit_config,
    pro_config,
)
from .transformer import SyriaTransformer
from .utils import build_model, device_report, pick_device, set_seed

__all__ = [
    "FAMILY_PRESETS",
    "ModelConfig",
    "SyriaTransformer",
    "base_config",
    "build_model",
    "debug_config",
    "device_report",
    "mini_config",
    "nano_config",
    "overfit_config",
    "pick_device",
    "pro_config",
    "set_seed",
]
