"""Registry — single source of truth for model/experiment state on disk.

The registry reads ONLY from real artifacts (checkpoints, metrics.json files,
tokenizer files). If an artifact does not exist, the honest status is
PLANNED / NOT IMPLEMENTED — never fabricated.
"""

from __future__ import annotations

import json
import os

ARTIFACTS = "artifacts"
REGISTRY_PATH = os.path.join(ARTIFACTS, "registry", "model_registry.json")
EXPERIMENTS_DIR = os.path.join(ARTIFACTS, "experiments")
MODELS_DIR = os.path.join(ARTIFACTS, "models")

# statuses used across the platform (from the project spec):
# PLANNED / IMPLEMENTED / TRAINING / TRAINED / EVALUATING / VALIDATED / DEPLOYED / FAILED
PLANNED_FAMILY = [
    {"model_id": "syria-ai-nano", "name": "SYRIA AI Nano", "target_params": "50M"},
    {"model_id": "syria-ai-mini", "name": "SYRIA AI Mini", "target_params": "150M"},
    {"model_id": "syria-ai-base", "name": "SYRIA AI Base", "target_params": "1B"},
    {"model_id": "syria-ai-pro", "name": "SYRIA AI Pro", "target_params": "3B"},
]
SPECIALIZED_PLANNED = [
    "syria-ai-code", "syria-ai-education", "syria-ai-reconstruction",
    "syria-ai-agriculture", "syria-ai-administration", "syria-ai-research",
]


def _file_size(path: str) -> int:
    try:
        return os.path.getsize(path)
    except OSError:
        return 0


def build_model_registry() -> list[dict]:
    """Derive REAL model statuses from artifacts on disk."""
    models: list[dict] = []
    for model_id in sorted(os.listdir(MODELS_DIR)) if os.path.isdir(MODELS_DIR) else []:
        mdir = os.path.join(MODELS_DIR, model_id)
        if not os.path.isdir(mdir):
            continue
        ckpt = os.path.join(mdir, "checkpoint.pt")
        cfg_path = os.path.join(mdir, "config.json")
        entry: dict = {
            "model_id": model_id,
            "name": f"SYRIA AI {model_id.split('-')[-1].capitalize()}",
            "checkpoint_path": os.path.relpath(ckpt, ".") if os.path.exists(ckpt) else None,
            "checkpoint_bytes": _file_size(ckpt) if os.path.exists(ckpt) else 0,
            "has_checkpoint": os.path.exists(ckpt),
            "has_tokenizer": os.path.exists(os.path.join(mdir, "tokenizer.json")),
            "has_evaluation": os.path.exists(os.path.join(mdir, "evaluation_results.json")),
            "has_training_metadata": os.path.exists(os.path.join(mdir, "training_metadata.json")),
        }
        if cfg_path:
            try:
                with open(cfg_path, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
                entry["params"] = None
                entry["vocab_size"] = cfg.get("vocab_size")
                entry["block_size"] = cfg.get("block_size")
                entry["architecture"] = cfg.get("arch_name")
            except Exception:
                pass
        # status derivation — strictly artifact-based
        if entry["has_checkpoint"]:
            entry["status"] = "TRAINED" if entry["has_evaluation"] else "TRAINED_UNEVALUATED"
            entry["available_for_inference"] = entry["has_tokenizer"]
        else:
            entry["status"] = "IMPLEMENTED"
            entry["available_for_inference"] = False
        models.append(entry)
    models.sort(key=lambda m: m["model_id"])
    return models


def get_registry() -> list[dict]:
    """Registry of ALL family models: real entries + honest PLANNED entries."""
    real = build_model_registry()
    real_ids = {m["model_id"] for m in real}
    out = list(real)
    for p in PLANNED_FAMILY:
        if p["model_id"] in real_ids:
            continue
        out.append(
            {
                "model_id": p["model_id"],
                "name": p["name"],
                "target_params": p["target_params"],
                "status": "PLANNED",
                "has_checkpoint": False,
                "available_for_inference": False,
                "message": "Not trained yet — requires hardware beyond the current CPU-only environment.",
            }
        )
    for model_id in SPECIALIZED_PLANNED:
        if model_id in {m["model_id"] for m in out}:
            continue
        out.append(
            {
                "model_id": model_id,
                "name": f"SYRIA AI {model_id.split('-')[-1].capitalize()}",
                "status": "PLANNED",
                "family": "specialized",
                "has_checkpoint": False,
                "available_for_inference": False,
                "message": "Derived variants start only after the base model is trained.",
            }
        )
    # persist a snapshot for other consumers
    os.makedirs(os.path.dirname(REGISTRY_PATH), exist_ok=True)
    with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
        json.dump({"updated_at": time_now(), "models": out}, f, indent=2, ensure_ascii=False)
    return out


def time_now() -> str:
    import time as _t

    return _t.strftime("%Y-%m-%dT%H:%M:%SZ", _t.gmtime())


def list_experiments() -> list[dict]:
    """All real experiments, derived from actual metrics.json files."""
    out: list[dict] = []
    if not os.path.isdir(EXPERIMENTS_DIR):
        return out
    for exp_id in sorted(os.listdir(EXPERIMENTS_DIR), reverse=True):
        exp_dir = os.path.join(EXPERIMENTS_DIR, exp_id)
        metrics_path = os.path.join(exp_dir, "metrics.json")
        if not os.path.isfile(metrics_path):
            continue
        try:
            with open(metrics_path, "r", encoding="utf-8") as f:
                metrics = json.load(f)
        except Exception:
            continue
        entry = {
            "exp_id": exp_id,
            "data_class": "REAL",
            **metrics,
        }
        # attach loss history from the JSONL log
        loss_history: list[dict] = []
        log_path = os.path.join(exp_dir, "log.jsonl")
        if os.path.exists(log_path):
            with open(log_path, "r", encoding="utf-8") as f:
                for line in f:
                    try:
                        rec = json.loads(line)
                    except Exception:
                        continue
                    if rec.get("event") == "eval":
                        loss_history.append({"step": rec.get("step"), "valid_loss": rec.get("valid_loss")})
                    elif rec.get("event") == "train_step":
                        loss_history.append({"step": rec.get("step"), "train_loss": rec.get("loss")})
        entry["loss_history"] = loss_history
        entry["logs_preview"] = _read_log_tail(log_path, 30)
        out.append(entry)
    return out


def get_experiment(exp_id: str) -> dict | None:
    exp_dir = os.path.join(EXPERIMENTS_DIR, exp_id)
    metrics_path = os.path.join(exp_dir, "metrics.json")
    if not os.path.isfile(metrics_path):
        return None
    with open(metrics_path, "r", encoding="utf-8") as f:
        metrics = json.load(f)
    log_path = os.path.join(exp_dir, "log.jsonl")
    return {
        "exp_id": exp_id,
        "data_class": "REAL",
        **metrics,
        "logs": _read_log_tail(log_path, 500),
        "checkpoints": [
            {"file": f, "bytes": _file_size(os.path.join(exp_dir, f))}
            for f in sorted(os.listdir(exp_dir))
            if f.endswith(".pt")
        ],
    }


def _read_log_tail(path: str, n: int) -> list[str]:
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    return [ln.rstrip("\n") for ln in lines[-n:]]
