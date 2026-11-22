"""Engineering self-test — forward/backward/gradient/weight-update proofs.

Executes the checks demanded by the project spec and writes the ACTUAL
outputs (not claims) to artifacts/test_reports/selftest.json:

  * Forward pass shapes
  * Backward pass execution
  * Gradient flow to every trainable parameter
  * Weight updates actually change weights
  * Parameter count
  * Memory usage
  * Output tensor shapes

Run:  python3 scripts/selftest.py
"""

from __future__ import annotations

import json
import os
import sys
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import psutil
import torch

from syria_ai.model.config import debug_config, nano_config, mini_config, base_config, pro_config
from syria_ai.model.utils import build_model

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def run() -> dict:
    results: dict = {"checks": [], "family_param_counts": {}}
    torch.set_num_threads(2)

    cfg = debug_config()
    cfg.vocab_size = 512  # small vocab keeps the self-test fast; architecture identical
    model = build_model(cfg, seed=7)
    params_before = {n: p.detach().clone() for n, p in model.named_parameters()}

    # 1. forward pass + shapes
    x = torch.randint(0, cfg.vocab_size, (2, 64))
    logits, loss = model(x, targets=torch.randint(0, cfg.vocab_size, (2, 64)))
    assert logits.shape == (2, 64, cfg.vocab_size), f"bad logits shape {logits.shape}"
    results["checks"].append({"name": "forward_shapes", "pass": True, "logits_shape": list(logits.shape), "loss": float(loss)})

    # 2. backward pass + gradient flow
    loss.backward()
    grads = {n: (p.grad is not None and float(p.grad.abs().sum()) > 0) for n, p in model.named_parameters() if p.requires_grad}
    no_grad = [n for n, ok in grads.items() if not ok]
    results["checks"].append(
        {
            "name": "backward_gradient_flow",
            "pass": len(no_grad) == 0,
            "trainable_params": len(grads),
            "params_without_grad": no_grad,
        }
    )

    # 3. weight update actually changes weights
    opt = torch.optim.AdamW(model.parameters(), lr=1e-2)
    x2 = torch.randint(0, cfg.vocab_size, (2, 64))
    _, loss2 = model(x2, targets=torch.randint(0, cfg.vocab_size, (2, 64)))
    opt.zero_grad()
    loss2.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
    opt.step()
    changed = {n: not torch.equal(params_before[n], p.detach()) for n, p in model.named_parameters()}
    unchanged = [n for n, c in changed.items() if not c]
    max_delta = max(float((params_before[n] - p.detach()).abs().max()) for n, p in model.named_parameters())
    results["checks"].append({"name": "weight_update", "pass": len(unchanged) == 0, "unchanged_params": unchanged, "max_abs_delta": max_delta})

    # 4. parameter count + memory
    n_params = model.num_params(non_embedding=False)
    rss_mb = psutil.Process().memory_info().rss / 1024**2
    results["checks"].append({"name": "param_count_memory", "pass": n_params > 0, "params": n_params, "process_rss_mb": round(rss_mb, 1)})

    # 5. causal masking sanity: future token change must not alter past logits
    model.eval()
    with torch.no_grad():
        xa = torch.randint(0, cfg.vocab_size, (1, 32))
        xb = xa.clone()
        xb[0, 31] = (xb[0, 31] + 1) % cfg.vocab_size  # change ONLY the last token
        la, _ = model(xa)
        lb, _ = model(xb)
        past_equal = torch.allclose(la[0, :31], lb[0, :31], atol=1e-5)
    results["checks"].append({"name": "causal_mask_integrity", "pass": bool(past_equal)})

    # 6. generation runs and produces tokens
    with torch.no_grad():
        out = model.generate(xa[:, :8], max_new_tokens=16, temperature=1.0, top_k=10)
    results["checks"].append({"name": "autoregressive_generation", "pass": out.shape[1] == 8 + 16, "output_shape": list(out.shape)})

    # family parameter counts (planned configs — estimation only, NOT trained)
    for name, fn in (("nano", nano_config), ("mini", mini_config), ("base", base_config), ("pro", pro_config)):
        c = fn()
        # exact count via shapes without instantiating the big model
        embed = c.vocab_size * c.n_embd
        pos = c.block_size * c.n_embd
        per_layer = 4 * c.n_embd * c.n_embd + (c.n_embd * c.ffn_mult * c.n_embd * 2) + (c.n_embd * 2 if c.norm == "rmsnorm" else c.n_embd * 4) + (4 * c.n_embd if c.bias else 0) + (2 * (c.ffn_mult * c.n_embd) if c.bias else 0)
        body = c.n_layer * per_layer
        final_norm = c.n_embd * 2
        total = embed + pos + body + final_norm
        results["family_param_counts"][name] = {"config": c.to_dict(), "estimated_params": total}

    results["overall_pass"] = all(c["pass"] for c in results["checks"])
    return results


def main() -> None:
    t0 = time.time()
    try:
        results = run()
        results["duration_sec"] = round(time.time() - t0, 2)
    except Exception as e:  # noqa: BLE001
        results = {"overall_pass": False, "error": repr(e)}
    os.makedirs(os.path.join(ROOT, "artifacts", "test_reports"), exist_ok=True)
    with open(os.path.join(ROOT, "artifacts", "test_reports", "selftest.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(json.dumps(results, indent=2, ensure_ascii=False))
    sys.exit(0 if results.get("overall_pass") else 1)


if __name__ == "__main__":
    main()
