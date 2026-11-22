"""Independent reload + generation proof.

Loads the saved checkpoint in a COMPLETELY SEPARATE process (no training
state, no cached model), passes a prompt through the trained weights and the
SYRIA TOKENIZER, and prints the neural output. This is the reload proof
required by the project spec.

Run:  python3 scripts/generate.py --prompt "دمشق" --max-new-tokens 48
"""

from __future__ import annotations

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from syria_ai.inference.engine import InferenceEngine, ModelNotReady

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--prompt", type=str, default="دمشق")
    ap.add_argument("--max-new-tokens", type=int, default=48)
    ap.add_argument("--temperature", type=float, default=0.9)
    ap.add_argument("--top-k", type=int, default=40)
    ap.add_argument("--top-p", type=float, default=0.95)
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()

    engine = InferenceEngine(os.path.join(ROOT, "artifacts", "models", "syria-ai-debug"))
    try:
        info = engine.load()
    except ModelNotReady as e:
        print(json.dumps({"ok": False, "error": "MODEL_NOT_READY", "message": str(e)}, ensure_ascii=False, indent=2))
        sys.exit(2)

    result = engine.generate(
        prompt=args.prompt,
        max_new_tokens=args.max_new_tokens,
        temperature=args.temperature,
        top_k=args.top_k,
        top_p=args.top_p,
        seed=args.seed,
    )
    out = {
        "ok": True,
        "proof": "weights loaded from checkpoint in an independent process",
        "model": info,
        "prompt": args.prompt,
        "generated_text": result.text,
        "prompt_tokens": result.prompt_tokens,
        "output_tokens": result.output_tokens,
        "elapsed_ms": result.elapsed_ms,
        "tokens_per_sec": result.tokens_per_sec,
        "device": result.device,
    }
    print(json.dumps(out, ensure_ascii=False, indent=2))

    # persist as part of the engineering evidence
    proofs_dir = os.path.join(ROOT, "artifacts", "proofs")
    os.makedirs(proofs_dir, exist_ok=True)
    with open(os.path.join(proofs_dir, "reload_generation_proof.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()
