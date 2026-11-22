"""SYRIA TRAINING ENGINE — real debug-model training script.

Runs the complete real pipeline: load tokenizer + shards -> build a fresh
randomly initialized SYRIA AI Debug transformer -> train with AdamW +
warmup/cosine + grad clipping -> periodic validation -> save checkpoint ->
write training_metadata.json + evaluation_results.json -> update registry.

Run:  python3 scripts/train_debug.py --steps 1200
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import torch

from syria_ai.model.config import ModelConfig, debug_config
from syria_ai.model.utils import build_model
from syria_ai.tokenizer.bpe import SyriaTokenizer
from syria_ai.training.trainer import Trainer, TrainingConfig, load_checkpoint, save_checkpoint
from syria_ai.training.monitor import full_hardware_report

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PROC_DIR = os.path.join(ROOT, "data", "processed")
MODEL_DIR = os.path.join(ROOT, "artifacts", "models", "syria-ai-debug")


def evaluate_perplexity(model, valid_bin: str, block_size: int, device, max_batches: int = 30) -> float:
    from syria_ai.data.engine import TokenBlockDataset
    import math

    ds = TokenBlockDataset(valid_bin, block_size)
    model.eval()
    total, count = 0.0, 0
    with torch.no_grad():
        for x, y in ds.iter_batches(8, __import__("random").Random(123)):
            x, y = x.to(device), y.to(device)
            _, loss = model(x, y)
            total += float(loss.item())
            count += 1
            if count >= max_batches:
                break
    mean_loss = total / max(1, count)
    model.train()
    return math.exp(mean_loss)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--steps", type=int, default=1200)
    ap.add_argument("--vocab", type=int, default=4096)
    ap.add_argument("--batch", type=int, default=8)
    ap.add_argument("--lr", type=float, default=3e-3)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--exp-id", default="EXP-001", help="experiment identifier (checkpoint dir: artifacts/experiments/<id>)")
    ap.add_argument(
        "--deploy",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="copy final artifacts into artifacts/models/syria-ai-debug (use --no-deploy for verification-only runs)",
    )
    ap.add_argument("--notes", default="", help="free-text note recorded in training metadata")
    ap.add_argument("--resume", action="store_true", help="resume from existing checkpoint")
    args = ap.parse_args()

    EXP_DIR = os.path.join(ROOT, "artifacts", "experiments", args.exp_id)
    os.makedirs(EXP_DIR, exist_ok=True)
    if args.deploy:
        os.makedirs(MODEL_DIR, exist_ok=True)

    # --- hardware (honest) --------------------------------------------- #
    hw = full_hardware_report(path=ROOT)
    print("[train] hardware:", hw["summary"])
    device_pref = "auto"

    # --- tokenizer ------------------------------------------------------ #
    tok_path = os.path.join(PROC_DIR, "tokenizer", "tokenizer.json")
    if not os.path.exists(tok_path):
        raise SystemExit("tokenizer missing — run scripts/prepare_data.py first")
    tok = SyriaTokenizer.load(tok_path)
    print(f"[train] tokenizer loaded: vocab={tok.vocab_size} merges={len(tok.merges)} version={tok.version}")

    # --- model config (debug preset, vocab from tokenizer) --------------- #
    cfg = debug_config()
    cfg.vocab_size = tok.vocab_size

    # --- training config ------------------------------------------------- #
    if not args.notes:
        args.notes = (
            "First real SYRIA AI neural training run (Debug model, CPU-only)."
            if args.exp_id == "EXP-001"
            else f"Independent verification rerun ({args.exp_id}): fresh random weights, different seed, identical data/architecture/hyperparameters for controlled comparison."
        )

    tcfg = TrainingConfig(
        exp_id=args.exp_id,
        out_dir=EXP_DIR,
        train_bin=os.path.join(PROC_DIR, "shards", "train.bin"),
        valid_bin=os.path.join(PROC_DIR, "shards", "valid.bin"),
        batch_size=args.batch,
        grad_accum=1,
        max_steps=args.steps,
        lr=args.lr,
        warmup_steps=max(20, args.steps // 20),
        weight_decay=0.01,
        grad_clip=1.0,
        eval_interval=max(50, args.steps // 10),
        eval_batches=12,
        log_interval=10,
        checkpoint_interval=max(200, args.steps // 4),
        seed=args.seed,
        device=device_pref,
        torch_threads=2,
        notes=args.notes,
    )

    # --- model (fresh random init, or resume) ---------------------------- #
    ckpt_path = os.path.join(EXP_DIR, "checkpoint.pt")
    model = build_model(cfg, seed=tcfg.seed)
    resumed_from = None
    if args.resume and os.path.exists(ckpt_path):
        ckpt = load_checkpoint(ckpt_path)
        model.load_state_dict(ckpt["model_state"])
        resumed_from = ckpt.get("step")
        print(f"[train] resumed weights from step {resumed_from}")

    n_params = model.num_params(non_embedding=False)
    print(f"[train] SYRIA AI Debug initialized: {n_params:,} trainable parameters")
    print(f"[train] vocab={cfg.vocab_size} block={cfg.block_size} layers={cfg.n_layer} heads={cfg.n_head} d_model={cfg.n_embd}")

    # --- train (real loop) ----------------------------------------------- #
    trainer = Trainer(model, tcfg)
    if args.resume and os.path.exists(ckpt_path):
        # restore optimizer state for a genuine resume
        import torch as _t

        ckpt = load_checkpoint(ckpt_path)
        trainer.optimizer.load_state_dict(ckpt["optimizer_state"])
    metrics = trainer.train()
    print("[train] metrics:", json.dumps({k: metrics[k] for k in ("params", "steps_completed", "tokens_processed", "final_train_loss", "valid_loss", "duration_sec")}, ensure_ascii=False))

    # --- evaluation ------------------------------------------------------- #
    print("[eval] computing held-out perplexity ...")
    ppl = evaluate_perplexity(model, tcfg.valid_bin, cfg.block_size, trainer.device)
    print(f"[eval] validation perplexity: {ppl:.2f}")

    # --- generation samples from the ACTUAL trained weights ---------------- #
    samples = []
    for prompt in ["دمشق", "المدرسة", "The project", "def add"]:
        try:
            result = trainer.model.generate(
                torch.tensor([tok.encode(prompt, use_special_tokens=False)], dtype=torch.long, device=trainer.device),
                max_new_tokens=48,
                temperature=0.9,
                top_k=40,
            )
            text = tok.decode(result[0].tolist())
            samples.append({"prompt": prompt, "output": text, "note": "generated from trained weights (quality expected to be weak)"})
            print(f"[eval] sample generation ({prompt!r}): {text[:80]!r}")
        except Exception as e:  # noqa: BLE001
            samples.append({"prompt": prompt, "error": str(e)})

    # --- copy artifacts to the model directory ----------------------------- #
    import shutil

    training_metadata = {
        "experiment_id": args.exp_id,
        "model_id": cfg.model_id,
        "architecture": cfg.to_dict(),
        "tokenizer": {"id": "syria-tokenizer", "version": tok.version, "vocab_size": tok.vocab_size, "merges": len(tok.merges)},
        "training": {k: metrics[k] for k in ("steps_completed", "max_steps", "tokens_processed", "first_train_loss", "final_train_loss", "valid_loss", "best_valid_loss", "duration_sec", "avg_tokens_per_sec")},
        "hardware": metrics["hardware"],
        "optimizer": "AdamW (warmup + cosine decay, grad clip 1.0)",
        "seed": tcfg.seed,
        "resumed_from_step": resumed_from,
        "dataset": {"stats_file": "data/processed/dataset_stats.json", "policy": "no external AI-generated data; licenses enforced"},
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "checkpoint": metrics["checkpoint"],
    }
    if args.deploy:
        tokenizer_model_path = os.path.join(MODEL_DIR, "tokenizer.json")
        tok.save(tokenizer_model_path)
        cfg.to_json(os.path.join(MODEL_DIR, "config.json"))
        shutil.copyfile(ckpt_path, os.path.join(MODEL_DIR, "checkpoint.pt"))
    else:
        print(f"[train] --no-deploy: artifacts kept in {EXP_DIR} only; deployed model dir untouched")

    with open(os.path.join(MODEL_DIR if args.deploy else EXP_DIR, "training_metadata.json"), "w", encoding="utf-8") as f:
        json.dump(training_metadata, f, indent=2, ensure_ascii=False)

    evaluation = {
        "experiment_id": args.exp_id,
        "evaluated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "valid_loss": metrics["valid_loss"],
        "best_valid_loss": metrics["best_valid_loss"],
        "perplexity_held_out": round(ppl, 2),
        "generation_samples": samples,
        "quality_note": "Debug-scale model: outputs are mostly incoherent by design. This run proves the neural pipeline, not language quality.",
        "honest_status": "TRAINED (debug scale)",
    }
    eval_target_dir = MODEL_DIR if args.deploy else EXP_DIR
    with open(os.path.join(eval_target_dir, "evaluation_results.json"), "w", encoding="utf-8") as f:
        json.dump(evaluation, f, indent=2, ensure_ascii=False)

    # metrics.json inside model dir too (registry reads it)
    with open(os.path.join(eval_target_dir, "metrics.json"), "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2, ensure_ascii=False)

    # keep the deployed-model metadata mirrored inside the experiment dir
    meta_src = os.path.join(eval_target_dir, "training_metadata.json")
    meta_dst = os.path.join(EXP_DIR, "training_metadata.json")
    if os.path.abspath(meta_src) != os.path.abspath(meta_dst) and os.path.exists(meta_src):
        shutil.copyfile(meta_src, meta_dst)

    print("[train] artifacts written:")
    for name in sorted(os.listdir(eval_target_dir)):
        p = os.path.join(eval_target_dir, name)
        print(f"        {name}: {os.path.getsize(p):,} bytes")
    print("[train] DONE — model TRAINED from scratch.")


if __name__ == "__main__":
    main()
