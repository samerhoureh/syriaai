# SYRIA AI — Training Report: EXP-002 (Independent Verification Rerun)

**Experiment:** EXP-002 · **Model:** syria-ai-debug (1,349,248 params) · **Seed:** 1337
**Purpose:** an independent, reproducible verification of the EXP-001 result — new random weights, different seed, identical architecture/data/hyperparameters — executed as part of the Phase C mandate (Reproducibility → Scientific Validation).
**Deployed model impact:** none. EXP-002 ran with `--no-deploy`; `artifacts/models/syria-ai-debug/` still contains the EXP-001 checkpoint untouched.

---

## 1. Verdict (one paragraph)

EXP-002 re-trained the debug model **from scratch** with a different seed and reproduced the EXP-001 result within seed noise: final train loss 3.9293 vs 3.9207 (Δ +0.0086), validation loss 4.3394 vs 4.3299 (Δ +0.0095), held-out perplexity 76.23 vs 75.35. The seed spread |Δ valid| = 0.0095 is **5× tighter** than the pre-registered reproducibility gate (|Δ| ≤ 0.05, gate G1 of `docs/SCALING_PLAN.md`) → **PASS**. The checkpoint was reloaded in a separate process and generated text from the reloaded weights. This is a pipeline-reproducibility result, **not** a language-quality claim.

## 2. Experimental design — what was held fixed vs what changed

| Element | EXP-001 | EXP-002 | Changed? |
|---|---|---|---|
| Architecture | decoder-only, 4L/4H, d_model 128, block 256, vocab 4096, RMSNorm, weight tying, gelu-tanh | identical | no |
| Weight initialization | fresh random (`build_model(seed=42)`) | fresh random (`build_model(seed=1337)`) | **yes — the only experimental variable** |
| Tokenizer | syria-tokenizer v1.0.0 (4096, 3832 merges) | same files, bit-identical | no |
| Training data | `data/processed/shards/train.bin` (230,168 tokens) + `valid.bin` (10,043) | same files, bit-identical | no |
| Optimizer | AdamW, lr 3e-3, warmup 60, cosine → 0.1×, wd 0.01, clip 1.0, betas (0.9, 0.95) | identical | no |
| Schedule | 1,200 steps, batch 8, grad_accum 1 | identical | no |
| Hardware | 2 logical CPU cores, no GPU, torch 2.15.0+cpu | identical | no |
| Deployment | artifacts copied to model dir | `--no-deploy` (verification only) | yes (safety) |

**No-pretrained-weights proof:** the training script builds the model exclusively via `build_model(cfg, seed=tcfg.seed)` — a random initializer. There is no code path that downloads or loads any external weight file (`syria-ai-core/syria_ai/model/utils.py`, `scripts/train_debug.py`). The deterministic-init test (`tests/test_transformer.py::test_build_model_respects_seed`) verifies seeds actually drive initialization.

## 3. Loss trajectories (from `artifacts/experiments/<id>/log.jsonl`)

| Step | EXP-001 train loss | EXP-002 train loss | Δ |
|---:|---:|---:|---:|
| 10 | 7.7714 | 7.8284 | +0.057 |
| 300 | 4.3805 | 4.4127 | +0.032 |
| 600 | 4.1328 | 4.1790 | +0.046 |
| 900 | 4.0062 | 4.0128 | +0.007 |
| 1200 | 3.9300 | 3.9660 | +0.036 |

Validation-loss trajectory (eval events):

| Eval step | EXP-001 valid | EXP-002 valid | Δ |
|---:|---:|---:|---:|
| 120 | 5.1499 | 5.0984 | −0.052 |
| 240 | 4.7459 | 4.7970 | +0.051 |
| 360 | 4.5991 | 4.5767 | −0.022 |
| 480 | 4.5052 | 4.4710 | −0.034 |
| 600 | 4.4318 | 4.4298 | −0.002 |

The two runs stay inside ±0.06 nats of each other at every logged point — the curves are statistically indistinguishable at debug scale, which is exactly what a working, seeded pipeline must produce.

## 4. Final metrics comparison

| Metric | EXP-001 (seed 42) | EXP-002 (seed 1337) | Δ |
|---|---:|---:|---:|
| Trainable parameters | 1,349,248 | 1,349,248 | 0 |
| Steps completed | 1,200 / 1,200 | 1,200 / 1,200 | 0 |
| Tokens processed | 2,457,600 | 2,457,600 | 0 |
| First train loss | 8.3441 | 8.3653 | +0.0212 |
| Final train loss | **3.9207** | **3.9293** | +0.0086 |
| Final valid loss | **4.3299** | **4.3394** | +0.0095 |
| Best valid loss | 4.3171 | 4.3326 | +0.0155 |
| Held-out perplexity | 75.35 | 76.23 | +0.88 |
| Training duration | 469.5 s | 472.3 s | +2.8 s |
| Avg throughput | 5,234.3 tok/s | 5,203.8 tok/s | −0.6% |
| Checkpoint bytes | 16,256,510 | 16,256,574 | +64 (timestamps inside payload) |

**Gate G1 reproducibility criterion:** two-seed |Δ valid| ≤ 0.05 → measured **0.0095** → **PASS** (see `docs/SCALING_PLAN.md` §Decision gates).

## 5. Independent reload + generation proof

After training completed, a **separate OS process** (no shared state with the trainer) performed:

1. `load_checkpoint("artifacts/experiments/EXP-002/checkpoint.pt")` (torch `weights_only` safe-load);
2. `build_model(cfg, seed=0)` — deliberately different init — then `load_state_dict(payload["model_state"], strict=True)` (a mismatch would raise);
3. real autoregressive generation with the project tokenizer.

Samples from the reloaded EXP-002 weights (incoherent by design at debug scale — honesty note kept from EXP-001):

| Prompt | Continuation (first 60 chars) | Throughput |
|---|---|---:|
| `دمشق` | `دمشق على على في حمص اليوم الجو كثير اليوم رأيك القمح وقت.` | 541.4 tok/s |
| `المدرسة` | `المدرسة طرطوس الآخر في حمص اليوم الحال كثير اليوم رأيك القمح وقت.` | 411.3 tok/s |
| `The project` | `The project are be that is but in to agricultural on tocidor the on th` | 389.7 tok/s |

Machine-readable proof: `syria-ai-core/artifacts/proofs/reload_generation_proof_exp002.json` (contains checkpoint SHA-256, step, strict-load flag, per-sample token counts and throughput).

## 6. Integrity tests added with this experiment (all passing)

`syria-ai-core/tests/test_robustness.py` — full suite **55/55 PASS** (`python -m pytest`, CPU-only, 6.1 s):

| Requirement (Phase C mandate) | Test |
|---|---|
| No validation leakage | `test_split_dataset_is_disjoint_and_deterministic`, `test_packed_shards_share_no_full_documents` |
| Generation is not static text | `test_generation_depends_on_weights_not_static_data` (different inits → different outputs; weight perturbation → different output; determinism per seed) |
| Save/load weight identity | `test_checkpoint_roundtrip_restores_every_weight_exactly` (bit-equal model tensors + optimizer moments) |
| Resume after interruption | `test_resume_continues_training_after_interruption` (step/RNG/optimizer restored; training improves past interruption) |
| Sampling & streaming correctness | `test_streaming_matches_batch_generation` (streamed continuation == batch continuation) |
| tokens/sec & perplexity math | `test_tokens_processed_and_tokens_per_sec_are_exact`, `test_perplexity_equals_exp_mean_nll` |

## 7. Artifacts produced by EXP-002

| File | Size | SHA-256 |
|---|---:|---|
| `syria-ai-core/artifacts/experiments/EXP-002/checkpoint.pt` | 16,256,574 | `e8a72be71039eca1bdf58b4abc5afe7f4f8b3b8cbb49d30c0b2265637c73cc5e` |
| `syria-ai-core/artifacts/experiments/EXP-002/metrics.json` | — | recorded in git |
| `syria-ai-core/artifacts/experiments/EXP-002/training_metadata.json` | — | recorded in git |
| `syria-ai-core/artifacts/experiments/EXP-002/evaluation_results.json` | — | recorded in git |
| `syria-ai-core/artifacts/experiments/EXP-002/log.jsonl` | 23,268 | recorded in git |
| `syria-ai-core/artifacts/proofs/reload_generation_proof_exp002.json` | — | recorded in git |

(EXP-001 reference: checkpoint SHA-256 `448a297df2c0d9afc9a7cc0a283f45bab5d6da377daa26ba325709195f43f541` — see `docs/MODEL_DISTRIBUTION.md`.)

## 8. How to reproduce

```bash
cd syria-ai-core
python3 -m venv .venv && source .venv/bin/activate
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt

# 1. retrain from scratch with the EXP-002 seed (does NOT touch the deployed model)
python scripts/train_debug.py --exp-id EXP-002 --seed 1337 --no-deploy --steps 1200

# 2. independent reload + generation in a fresh process
python - <<'PY'
import torch; from syria_ai.model.config import ModelConfig
from syria_ai.model.utils import build_model
from syria_ai.tokenizer.bpe import SyriaTokenizer
from syria_ai.training.trainer import load_checkpoint
p = load_checkpoint("artifacts/experiments/EXP-002/checkpoint.pt")
m = build_model(ModelConfig(**p["model_config"]), seed=0)
m.load_state_dict(p["model_state"], strict=True); m.eval()
t = SyriaTokenizer.load("data/processed/tokenizer/tokenizer.json")
ids = torch.tensor([t.encode("دمشق", use_special_tokens=False)])
print(t.decode(m.generate(ids, max_new_tokens=40, temperature=0.9, top_k=40)[0].tolist()))
PY

# 3. integrity tests
python -m pytest
```

Expected reproducibility envelope on similar hardware: final valid loss 4.33 ± 0.05 across seeds; throughput ~5,200 tok/s on 2 CPU cores.

## 9. What this does — and does not — prove

**Proves:** deterministic seeded training; bit-faithful checkpoint round-trips; correct optimizer/RNG resume; generation driven strictly by trained weights; consistent streaming/batch semantics; correct metric math; reproducibility of the EXP-001 result within seed noise on identical data/architecture/compute.

**Does not prove:** any language quality (perplexity 76 on a 230K-token debug corpus remains near-uninformative), dialect competence, or readiness of anything beyond the debug tier. Scaling decisions remain gated by `docs/SCALING_PLAN.md` and `docs/SDSA_RESEARCH_PROTOCOL.md`.
