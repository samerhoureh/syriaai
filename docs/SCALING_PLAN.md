# SYRIA AI — Staged Scaling Plan (Debug → Intermediate-5M → Intermediate-15M → Nano)

Status: PLAN (analysis document). Owner constraint honored: no jump straight to a 50M "Nano" model; every step is gated.

Evidence legend used throughout this document:

- **MEASURED** — a fact read from project artifacts (metrics.json, training_metadata.json, evaluation_results.json, dataset_stats.json, checkpoint file size) or verified by arithmetic against them. EXP-001 is the only measured run.
- **ESTIMATE** — every derived number in this plan. Estimates are given as ranges, never as false-precision point values. They must be replaced by measured values as each stage completes.

Files this plan was derived from (read-only):

- `syria-ai-core/syria_ai/model/config.py`, `syria_ai/model/transformer.py` (architecture truth)
- `syria-ai-core/syria_ai/training/trainer.py` (checkpoint contents, optimizer, eval loop)
- `syria-ai-core/artifacts/models/syria-ai-debug/config.json`, `training_metadata.json`, `metrics.json`, `evaluation_results.json`
- `syria-ai-core/artifacts/experiments/EXP-001/checkpoint.pt` (16,256,510 bytes — verified on disk)
- `syria-ai-core/data/processed/dataset_stats.json` (corpus: 230,168 train / 10,043 valid / 10,484 test tokens)
- `docs/ROADMAP.md`, `docs/PROJECT_STATUS.md` (phases, gates, machine: 2 logical CPU cores, ~3.95 GB RAM, no GPU)

---

## 1. Verified parameter-count formula

Architecture (from `transformer.py`, config verified against `config.json`): decoder-only, learned positional embeddings, Pre-Norm blocks, RMSNorm (weight only, no bias), attention as a fused QKV linear + output projection, FFN = two linears with hidden = `ffn_mult * C`, manual GELU-tanh, LM head without bias, `bias=True` on all block linears, weight tying ON.

With `V` = vocab_size, `T` = block_size, `L` = n_layer, `H` = n_head, `C` = n_embd (head_dim = C/H), `b` = 1 if bias else 0:

```
Per transformer block:
  ln1 (RMSNorm)          : C
  qkv  Linear(C, 3C)     : 3*C^2 + 3b*C
  proj Linear(C, C)      :   C^2 +   b*C
  ln2 (RMSNorm)          : C
  fc   Linear(C, 4C)     : 4*C^2 + 4b*C
  proj Linear(4C, C)     : 4*C^2 +   b*C
  ---------------------------------------
  per layer              : 12*C^2 + (2 + 9b)*C        (b=1 here → 12*C^2 + 11*C)

Model total (weight tying ON, lm_head shares tok_emb):
  P = V*C          (token embedding, also serves as LM head)
    + T*C          (learned positional embedding)
    + L*(12*C^2 + (2+9b)*C)
    + C            (final RMSNorm)
```

If weight tying were OFF, add `V*C` (untied LM head, no bias). If norm were LayerNorm instead of RMSNorm, each of the 3 norms would gain a bias (+2C per block, +C final).

### 1.1 Verification against the measured debug config (V=4096, T=256, L=4, H=4, C=128, bias=True, tied)

| Component | Expression | Value |
|---|---|---|
| Token embedding (= tied LM head) | 4096 * 128 | 524,288 |
| Positional embedding | 256 * 128 | 32,768 |
| Per block | 12*128^2 + 11*128 = 196,608 + 1,408 | 198,016 |
| 4 blocks | 4 * 198,016 | 792,064 |
| Final RMSNorm | | 128 |
| **Total** | | **1,349,248** |

**1,349,248 = measured `params` in metrics.json (MEASURED). Exact match.**

Weight-tying effect: without tying the same config would have 1,349,248 + 524,288 = 1,873,536 params (verified by formula); tying therefore saves 524,288 params, i.e. 28.0% of the untied count. `num_params(non_embedding=True)` in `transformer.py` additionally subtracts the positional embedding (T*C), giving 1,316,480 — a GPT-2-style reporting convention. All counts in this plan follow the `metrics.json` convention (`non_embedding=False`), which includes positional embeddings.

### 1.2 Flagged inconsistency: the repo's `nano_config()` does not reach 50M

Applying the verified formula to `config.py::nano_config()` (V=16384, T=1024, L=8, H=8, C=512) gives **34,124,288 params, not 50M**. ROADMAP.md and PROJECT_STATUS.md advertise "Nano — 50M". Either the preset must be strengthened or the label changed. This plan proposes a Stage 3 config that genuinely lands at ~50M (Section 4.3) and leaves the preset decision to the owner (this document modifies no code).

Minor audit notes: `config.py`'s docstring references `syria_ai.model.utils.param_count`, which does not exist (the authoritative counter is `SyriaTransformer.num_params`); `scripts/selftest.py`'s `family_param_counts` closed-form is a rough approximation (debug: 1,350,912 vs exact 1,349,248, +0.12%); PROJECT_STATUS.md quotes "loss 7.77→3.92" while metrics.json records `first_train_loss = 8.3441` (metrics.json is authoritative). None of these affect the plan; they are listed for hygiene.

---

## 2. Stage 0 baseline — MEASURED facts (EXP-001, seed 42)

| Quantity | Value | Source |
|---|---|---|
| Parameters | 1,349,248 | metrics.json + formula verification |
| Config | V=4096, T=256, L=4, H=4, C=128, head_dim 32, ffn_mult 4, RMSNorm, tied, bias, gelu-tanh | config.json |
| Tokens processed | 2,457,600 = 8 batch * 256 block * 1200 steps | metrics.json |
| Epochs over 230,168-token train split | 10.68 (derived from measured numbers) | derived |
| Train loss | 8.3441 → 3.9207 (train-split eval) | metrics.json |
| Valid loss / best | 4.3299 / 4.3171 | metrics.json |
| Held-out perplexity | 75.35 | evaluation_results.json |
| Duration | 469.5 s on 2 CPU cores, no GPU | training_metadata.json |
| Throughput | 5,234.3 tokens/s (measured) | training_metadata.json |
| Effective compute | 6*N*D = 1.99e13 FLOPs for the run; ≈ 42.4 GFLOP/s achieved (6ND basis) | derived from measured |
| Checkpoint | 16,256,510 bytes = 12.049 bytes/param = 12*P + 65,534 B overhead | file size verified on disk |
| Corpus | 230,168 train + 10,043 valid + 10,484 test tokens; 563 docs (ar 383 / en 126 / mixed 54); licenses: CC BY-SA 4.0 + Project-Authored; policy forbids external AI-generated data | dataset_stats.json |
| Known limitation | Valid (4.3299) > train (3.9207): the model already underfits the tiny corpus while repeating it ~10.7x; generation is incoherent by design | evaluation_results.json |

Checkpoint bytes/param decomposition (verified): model fp32 weights (4 B/param) + AdamW `exp_avg` (4) + `exp_avg_sq` (4) = 12 B/param; the remaining 65,534 bytes are overhead (RNG states, optimizer step counters, configs, zip container). `trainer.py::save_checkpoint` saves `model_state` + `optimizer_state` + step + training config + RNG — confirming the 12 B/param model. Plan uses **~12 bytes/param (ESTIMATE for future stages)**.

---

## 3. Staged ladder — master table

All rows except Stage 0 are ESTIMATE. Configs are proposed, justified in Section 4; nothing has been trained beyond Stage 0.

### 3.1 Architecture and scale targets

| Stage | Model | Config (V / T / L / H / C, head_dim) | Params (exact by formula) | Context | Vocab | Train-token target (processed) | Corpus gate (unique tokens) |
|---|---|---|---|---|---|---|---|
| 0 (DONE) | SYRIA AI Debug | 4096 / 256 / 4 / 4 / 128, hd 32 | **1,349,248** (MEASURED) | 256 | 4096 | 2.46M (10.7 epochs — MEASURED) | 230K (current) |
| 1 | Intermediate-5M | 4096 / 256 / 5 / 4 / 256, hd 64 | 5,060,608 (ESTIMATE) | 256 | 4096 | 2.46M primary (identical to EXP-001) + optional 5M probe | 230K (unchanged) |
| 2 | Intermediate-15M | 4096 / 512 / 8 / 6 / 384, hd 64 | 15,959,424 (ESTIMATE) | 512 | 4096 | 50M min / **100M recommended** / 320M Chinchilla-ref | **≥ 10M** (target 10–30M) |
| 3 | SYRIA AI Nano | 16384 / 1024 / 13 / 8 / 512, hd 64 | 49,881,088 (ESTIMATE) | 1024 | 16384 | 0.3B min / **0.5–1.0B recommended** / 1.0B Chinchilla-ref | **≥ 100M** (dialect share ≥ 10%, measured) |

### 3.2 Resources and feasibility verdicts (all ESTIMATE except Stage 0 row values marked MEASURED)

| Stage | Peak RAM est (machine has 3.95 GB) | Train FLOPs 6*N*D | CPU wall-clock est (2 cores) | Effective throughput est | GPU time est (24 GB class; 10–40 TF/s effective) | Checkpoint est (~12 B/param) | Verdict on this machine |
|---|---|---|---|---|---|---|---|
| 0 | ran OK (MEASURED: completed on 3.95 GB box) | 1.99e13 (MEASURED run) | 469.5 s (MEASURED) | 5,234 tok/s (MEASURED) | — | 16.3 MB (MEASURED) | DONE |
| 1 | ~1.0–1.3 GB at batch 8 | 7.46e13 (D=2.46M); 1.52e14 (D=5M) | 0.5–1.0 h (D=2.46M); 1.1–2.0 h (D=5M) | 700–1,250 tok/s | < 1 minute (raw compute < 20 s) | ~61 MB | **FEASIBLE** (primary) |
| 2 | ~1.9–2.0 GB at batch 4 + accum 2 (batch 8 → ~3.1 GB: risky) | 4.79e15 (D=50M); 9.58e15 (D=100M); 3.06e16 (D=320M) | 1.6–3.3 d (50M); 3.3–6.5 d (100M); 10.5–20.9 d (320M) | 180–350 tok/s | 2–10 min (50M); 5–20 min (100M); 16–62 min (320M) | ~192 MB | **FEASIBLE** with batch reduction and a dedicated machine; comfortable on GPU |
| 3 | ~3.3–3.6 GB at batch 1 + accum 8 → borderline OOM, no headroom | 8.98e17 (D=0.3B); 1.50e17 (D=0.5B); 2.99e17 (D=1.0B) | 35–82 d (0.3B); 58–136 d (0.5B); 117–273 d (1.0B) | 42–100 tok/s | 0.8–3.3 h (0.3B); 1.4–5.5 h (0.5B); 2.8–11.1 h (1.0B) | ~601 MB (+ ~200 MB fp32 inference weights) | **NOT FEASIBLE** on this CPU; feasible on one modest cloud GPU after gates |

---

## 4. Stage-by-stage estimates and justification

### 4.0 Throughput model used for all wall-clock estimates (ESTIMATE method)

Measured anchor: 5,234.3 tok/s at 6N/token = 8.10 MFLOP (Stage 0) ⇒ ~42.4 GFLOP/s achieved (6ND basis) on 2 CPU cores.

Model: `tok/s(stage) ≈ 5,234 * (N0/N) * u`, where `u` is a utilization-retention factor around the FLOP-inverse prediction:

- FLOP-inverse prediction (u=1): Stage 1 ≈ 1,396 tok/s; Stage 2 ≈ 443 tok/s; Stage 3 ≈ 142 tok/s (per-token FLOPs grow 3.75x / 11.8x / 37.0x).
- u < 1 accounts for cache pressure at C ≥ 256, deeper sequential stacks, the quadratic attention term at T = 512/1024, and smaller micro-batches (Stage 2 batch 4, Stage 3 batch 1). u > 1 is possible for Stage 1 (wider GEMMs use BLAS better than C=128), capped conservatively.
- Bands used: **Stage 1 u ∈ [0.5, 0.9] → 700–1,250 tok/s; Stage 2 u ∈ [0.4, 0.8] → 180–350 tok/s; Stage 3 u ∈ [0.3, 0.7] → 42–100 tok/s.** (All wall-clock figures below are derived from these exact bands.)

Why a naive "0.5–0.75x per stage" multiplier is rejected as unphysical: 5,234 * 0.75^3 ≈ 2,208 tok/s at Stage 3 would imply 2,208 * 299.3 MFLOP ≈ 660 GFLOP/s on 2 CPU cores — about 7x the theoretical AVX2-FMA peak of such a machine (~96 GFLOP/s) and 16x what was actually measured. Throughput must fall roughly in proportion to per-token FLOPs; the ranges above are FLOP-consistent.

FLOPs formula: `≈ 6*N*D` (forward+backward, weight-term dominant), plus the causal-attention term making true FLOPs `≈ 6*N*D * (1 + T/(6C))`: factor 1.167 (Stage 1), 1.222 (Stage 2), 1.333 (Stage 0 and 3). With tying, the embedding-lookup saving and the tied-LM-head matmul cancel in 6ND exactly. The 6ND numbers in tables are the conservative lower bound.

RAM formula (fp32 pipeline, AdamW, as implemented in `trainer.py`):

```
R_peak ≈ 16*N                    (fp32 weights 4N + grads 4N + exp_avg 4N + exp_avg_sq 4N)
       + A                       (activations saved for backward)
       + ~0.4–0.6 GB             (PyTorch runtime, allocator, memmapped data)
A ≈ L * 4B * (19*T*C + 3*H*T^2)  (per-layer saved tensors incl. 2–3 copies of the
                                  B*H*T*T attention matrix; manual attention, no flash)
  + 12*B*T*V                     (logits + log-softmax + grad)
```

Safety rule for this machine: keep `R_peak ≤ 2.5 GB` (headroom for OS, monitoring, periodic eval).

### 4.1 Stage 1 — Intermediate-5M (ESTIMATE)

**Config: V=4096, T=256, L=5, H=4, C=256, ffn_mult 4 → 5,060,608 params.**

Justification: tokenizer, vocab, block size, corpus, batch, and schedule length stay IDENTICAL to EXP-001; only model shape changes. This isolates the parameter-scaling variable on fixed data and keeps perplexities directly comparable (same tokenizer, same held-out split). head_dim rises 32 → 64 (the standard empirical choice; keeping H=4 avoids per-head CPU overhead). Depth +1 (5 vs 4) is the minimal change that lands at ~5M: with C=256 and L=4 the count would be 4,271,360; L=5 gives 5,060,608.

- **Tokens:** primary run D = 2,457,600 tokens, byte-identical schedule to EXP-001 (10.7 epochs of the 230K train split — repetition-heavy, flagged honestly). Chinchilla-style 20 tokens/param would want ~1.0e8 tokens; that data does not exist and must not be pretended. Optional secondary probe: D = 5M (~21.7 epochs) to measure whether more repetition still buys valid loss at 4x capacity. Published data-constrained scaling results say repeats up to ~4 epochs are nearly as good as fresh data and value decays thereafter — the primary run is already beyond that, which is exactly why its purpose is the scaling coefficient, not data scaling.
- **RAM:** 16N = 81 MB states; A ≈ 426 MB at batch 8 (L=5: 5 x 65 MB + 101 MB logits); total ≈ 1.0–1.3 GB. Verdict: comfortable.
- **FLOPs:** 6ND = 7.46e13 (D=2.46M) / 1.52e14 (D=5M); true ≈ x1.167.
- **CPU wall-clock:** 0.5–1.0 h (primary) / 1.1–2.0 h (probe) at 700–1,250 tok/s.
- **GPU (if rented for a day of batch runs):** < 1 minute per run; irrelevant locally.
- **Checkpoint:** ~61 MB (12 B/param + overhead); x2 seeds ≈ 122 MB.
- **Eval protocol:** identical held-out protocol (valid split, batch 8, eval_batches 12, fixed eval seed) PLUS first use of the two-seed reproducibility check (seeds 42 and 1337) and the fixed generation-rubric prompt suite (Section 5.4). Test split still untouched.
- **Verdict: FEASIBLE on the current 2-CPU / 3.95 GB machine.** This is the next run to execute.

### 4.2 Stage 2 — Intermediate-15M (ESTIMATE; requires data expansion FIRST)

**Config: V=4096, T=512, L=8, H=6, C=384, ffn_mult 4 → 15,959,424 params.**

Justification: block 256 → 512 is now justified by data — with ≥ 10M unique tokens, documents longer than 256 tokens become frequent, and 529 train blocks would no longer be the binding constraint (the current corpus cannot even fill a 512-block set without heavy overlap). head_dim stays 64 (384/6). Depth 8 gives a depth-rich shape with known precedent at this scale (e.g. ~10M-param public baselines use 6L/384d; 8L adds the register needed for morphology-heavy Arabic). Vocab stays 4096 deliberately: keeping the tokenizer frozen across Stages 0–2 makes valid-loss/perplexity numbers directly comparable across the whole ladder; a vocab change would break the series. The 8192-embedding variant (adds ~3.1M params) is available if analysis shows 4096-vocab fragmentation hurting, at the cost of comparability.

- **Tokens:** Chinchilla reference 20 tokens/param ≈ 3.2e8. Data-constrained plan with a ≥ 10M-unique-token corpus: D = 50M min (5 epochs), **100M recommended (10 epochs)**, cap ~320M (32 epochs; beyond ~16 epochs of repeated data, marginal value decays). If the corpus reaches 30M unique, 100M processed = 3.3 epochs — the preferred regime.
- **RAM:** 16N = 255 MB states. Batch 8: A ≈ 2.37 GB → total ≈ 3.1 GB: risky against 3.95 GB. **Batch 4 + grad_accum 2 (same effective batch 8, supported by `TrainingConfig.grad_accum`): A ≈ 1.18 GB → total ≈ 1.9–2.0 GB. Verdict: feasible with the reduced micro-batch.**
- **FLOPs:** 6ND = 4.79e15 / 9.58e15 / 3.06e16 for D = 50M / 100M / 320M; true ≈ x1.222.
- **CPU wall-clock:** 1.6–3.3 d / **3.3–6.5 d** / 10.5–20.9 d at 180–350 tok/s. The recommended 100M-token run means ~4–7 days of exclusive machine occupancy — accepted explicitly at the gate, not discovered mid-run. Checkpoint-every-300-steps retention policy: keep latest + best only (disk bound).
- **GPU:** 5–20 min for D=100M at 10–40 TF/s effective; minutes even at conservative MFU.
- **Checkpoint:** ~192 MB; x2 seeds ≈ 384 MB.
- **Eval protocol (extends Stage 1):** same held-out protocol; ADD per-register perplexity for MSA / dialect / English (requires register tagging at ingest — current `dataset_stats.json` records ar/en/mixed only; minimum 5,000 held-out tokens per register, smaller registers reported with an explicit small-sample flag and never averaged into a headline number); generation rubric on the fixed prompt suite; two-seed reproducibility; train-valid gap ≤ 0.8 guard.
- **Verdict: FEASIBLE on the current machine** (with batch 4 + accum 2, and with the machine dedicated for ~4–7 days). Also trivially feasible on any rented GPU if the owner prefers not to tie up the box for a week.

### 4.3 Stage 3 — SYRIA AI Nano ~50M (ESTIMATE; requires data pipeline scaled + cloud GPU)

**Config: V=16384, T=1024, L=13, H=8, C=512, ffn_mult 4 → 49,881,088 params ≈ 49.9M.**

Justification: T=1024 and V=16384 preserve the planned Nano intent (config.py preset uses T=1024, V=16384); C=512 keeps head_dim 64; L=13 instead of the preset's L=8 is the single change needed to genuinely reach the advertised 50M (preset L=8 computes to 34.1M — Section 1.2). The vocab increase 4096 → 16384 is justified only now: at 50M params the embedding is 16.8% of the model (tok_emb share; at Stage 0 it was 38.9%), a 16K BPE cuts Arabic token fertility (longer effective context per document), and a ≥ 100M-token corpus can support 16K merges without fragmentation. Cost: token-level perplexity stops being comparable to Stages 0–2 — mitigated by reporting bits-per-character alongside perplexity from Stage 3 onward (Section 5.4).

- **Tokens:** Chinchilla reference 20 tokens/param ≈ 1.0e9. Data-constrained plan with a ≥ 100M-unique-token corpus: D = 0.3B min, **0.5–1.0B recommended (5–10 epochs)**.
- **RAM:** 16N = 798 MB states. Batch 1 + grad_accum 8: A ≈ 2.03 GB (13 layers x 140.5 MB, incl. 3 x B*H*T*T fp32 attention tensors at T=1024 — the manual attention materializes 8 x 1024 x 1024 matrices; no flash attention in this codebase) + 201 MB logits → total ≈ 3.3–3.6 GB vs 3.95 GB available. Memory-verdict: borderline; < 15% headroom, fragmentation-prone, no room for concurrent eval/monitoring. **Compute-verdict is what actually kills it (below).**
- **FLOPs:** 6ND = 8.98e17 / 1.50e17 / 2.99e17 for D = 0.3B / 0.5B / 1.0B; true ≈ x1.333.
- **CPU wall-clock:** 35–82 d / 58–136 d / **117–273 d** at 45–100 tok/s. Even the most optimistic corner (0.3B tokens at 100 tok/s) is over a month of a fully occupied, thermally stressed 2-core box with zero resilience to interruption. **Verdict: NOT FEASIBLE on this machine.**
- **GPU (24 GB cloud instance):** the code must first be moved to GPU with AMP/bf16 or TF32 enabled (currently fp32-only; `pick_device` already supports CUDA). Effective throughput for a 50M fp32-from-scratch codebase at modest MFU: 10–40 TF/s → 0.8–3.3 h (0.3B), 1.4–5.5 h (0.5B), **2.8–11.1 h (1.0B)**. If the optimistic 100–200 TF/s effective were truly sustained: 33–66 min for 1.0B. Plan on the conservative band; even x5 slack keeps this a 1–2 day rental.
- **Checkpoint:** ~601 MB full training checkpoint; ~200 MB fp32 inference weights. Two-seed package ≈ 1.6 GB. Trivial disk cost.
- **Eval protocol:** full pack — held-out protocol, per-register PPL (MSA/dialect/English), bits-per-character (cross-vocab comparability), generation rubric, two-seed reproducibility on GPU, gradient-flow check on 100% of 49.9M params, plus documented limits (ROADMAP Phase 6 gate).
- **Verdict: CANNOT run on the current 2-CPU / 4 GB machine (compute-infeasible; memory borderline). CAN run on one modest cloud GPU (hours, not weeks) — but only after the data gate (≥ 100M unique tokens) and numerics-parity gate pass.**

---

## 5. Scientific rationale per stage — what each run tests

### 5.1 Stage 1 (5M, same data): the fixed-data scaling point

Hypothesis H1: on byte-identical data and schedule, a 3.75x model reduces valid loss by ≥ 3% relative. This measures the project's first own scaling coefficient (dLoss/dlogN at fixed D) and validates the pipeline at 4x size. Honest expectation: the improvement will be MODEST, because the 230K-token corpus is the binding constraint, not capacity. If Stage 1 valid loss ≈ Stage 0 valid loss, that null result is itself the finding: the data ceiling has been reached, and the correct next investment is data, not parameters.

### 5.2 Stage 2 (15M, 10M+ tokens): the data-boundary experiment

Hypothesis H2: with data expanded ~40x (230K → ≥ 10M unique tokens), a ~16M model at 512 context improves valid loss ≥ 3% over Stage 1 AND shows a smaller train-valid gap (less repetition, more fresh tokens). This run separates "bigger model on starved data" from "bigger model on adequately-fed data" — the two confounds Stage 1 deliberately could not separate. Block 512 tests whether longer context helps on this corpus (measured via valid loss and register PPLs, not assumed).

### 5.3 Stage 3 (Nano-50M, 100M+ tokens): full Nano only after the data pipeline scales

Hypothesis H3: a ~50M model trained on ≥ 0.5B tokens (~20:1 Chinchilla-style reference) reaches substantially lower per-register perplexities and coherent short generations, and the ladder's loss-vs-N curve is consistent enough to extrapolate beyond 50M. Nano is explicitly gated on the corpus, because of the memorization regime:

**Explicit statement: increasing model size without increasing data will NOT improve validation loss beyond a point.** A larger model memorizes a small corpus better, which lowers TRAIN loss while valid loss stalls or worsens. EXP-001 already repeats its 230K-token train split 10.7x and shows valid > train. This is why data expansion precedes Nano in this plan, and why Stage 2's entry gate is a data quantity, not a parameter count.

### 5.4 Evaluation protocol (common to all stages, additive)

1. Held-out valid loss, same protocol as EXP-001 (batch 8, eval_batches ≥ 12, fixed eval RNG, best-valid tracking); test split touched only at stage close-out.
2. Two-seed reproducibility: seeds 42 and 1337; |Δ valid| ≤ 0.05 gate; loss-curve overlays archived per experiment (log.jsonl already exists).
3. Per-register perplexity: MSA / Syrian-dialect / English, each ≥ 5,000 held-out tokens (or flagged as small-sample); requires adding register tags to the corpus pipeline (currently only ar/en/mixed are recorded).
4. Generation rubric: fixed 10-prompt suite (MSA, dialect, English, code — mirroring EXP-001's archived prompts), greedy + temperature 0.8 / top-k 50, human-scored 1–5 (fluency, coherence, register fit), archived as evaluation_results.json per stage for longitudinal comparison.
5. Overfit guard: train-split − valid gap ≤ 0.8 (EXP-001 baseline: −0.41, i.e. model underfits; watch the sign flip as data grows).
6. Regression suite (currently 34/34 pytest + gradient-flow-on-all-params selftest) must pass before any stage is declared done.
7. From Stage 3: bits-per-character reported alongside PPL because the vocab change breaks token-PPL comparability.

---

## 6. Decision gates (exact go / no-go criteria)

A stage run consists of two seeds (42, 1337) unless stated. "prev_best" = best valid loss of the previous completed stage (Stage 0: 4.3171 best / 4.3299 final).

**G1 — Debug → Intermediate-5M (runnable today).** GO requires ALL of:
1. valid loss ≤ 4.200 (= 4.3299 x 0.97, i.e. ≥ 3% relative improvement; target ≤ 4.113 = 5%).
2. Two-seed reproducibility: |valid(seed 42) − valid(seed 1337)| ≤ 0.05.
3. Overfit guard: (train-split loss) − (valid loss) ≤ 0.8.
4. Peak RSS (monitor.py `ram_report`) ≤ 2.5 GB; wall-clock ≤ 6 h; measured tok/s recorded (expect 700–1,250; investigate if < 500).
5. Regression suite 34/34; gradient flow to 100% of 5,060,608 params.
NO-GO: valid loss ≥ 4.33 (no improvement on same data) → stop scaling, record the null scaling point, pivot to data expansion. No retry-with-more-params.

**G2 — 5M → Intermediate-15M.** Gate order matters; the data gate is a hard precondition.
0. HARD DATA GATE: corpus ≥ 10M unique train tokens (target 10–30M), dedup executed and ratio reported, register tags present (≥ 3 registers, ≥ 5K valid tokens each), license ledger complete (CC BY-SA 4.0 / CC0-PD / Project-Authored only; external AI-generated data still forbidden), attribution file regenerated.
1. G1 fully passed (both seeds archived).
2. valid loss ≤ prev_best x 0.97; two-seed Δ ≤ 0.05; overfit gap ≤ 0.8.
3. Per-register PPL reported for all three registers (values informational at this stage; completeness is the gate).
4. Peak RSS ≤ 2.5 GB at batch 4 + accum 2; wall-clock ≤ 7 days explicitly accepted by owner before launch.
5. Loss curve: smooth warmup + cosine decay, no late divergence; checkpoint retention latest+best.
NO-GO: corpus < 10M unique tokens → do NOT train 15M on starved data (memorization regime); invest in the data pipeline and stay at 5M.

**G3 — 15M → Nano-50M (cloud GPU only).**
0. HARD DATA GATE: corpus ≥ 100M unique train tokens; Syrian-dialect share MEASURED ≥ 10% of the corpus (if unreachable, the honest move is to downscope Nano's goal in writing, not to train on silent shortfalls); full license audit + attribution regenerated.
1. G2 fully passed (both seeds archived).
2. Numerics-parity gate: Debug (or 15M) model trained briefly with the GPU numerics path (AMP bf16 or TF32) matches fp32 valid loss within ±0.03 — validates the AMP/TF32 change the GPU scenario depends on.
3. Resource approval: owner accepts ESTIMATE cost $20–200 total GPU rental (single 1B-token run ≈ 2.8–11.1 h on a 24 GB instance) and the ~1.6 GB two-seed checkpoint package.
4. Post-run: two-seed reproducibility on GPU; full eval pack including bits-per-character; limits documented (ROADMAP Phase 6 acceptance: "reproducible and evaluable, limits documented").
NO-GO: any missing item → stay at 15M, which is an explicitly acceptable steady state, not a failure.

Cross-cutting rule (from ROADMAP): no stage starts before the previous stage's gates pass and its two-seed eval pack is archived.

---

## 7. Non-feasibility honesty — Nano-50M on this machine

**Plain statement: SYRIA AI Nano (~50M) cannot be trained on this 2-logical-core, ~3.95 GB RAM, no-GPU machine.** Reasons, in order of severity:

1. **Compute (decisive):** 117–273 days of continuous CPU time for the recommended 0.5–1.0B tokens; even a minimal 0.3B-token run is 35–82 days. Throughput would be ~42–100 tok/s (ESTIMATE, FLOP-consistent with the measured 5,234 tok/s baseline), and the machine would be unusable for anything else for months, with near-certain interruption.
2. **Memory (borderline):** at batch 1 + grad accum 8 the estimate is 3.3–3.6 GB vs 3.95 GB available — under 15% headroom, fragmentation-prone, no room for concurrent evaluation. Not the binding constraint, but not comfortable either.
3. **Engineering reality:** the current trainer is fp32-only CPU-first; it has no flash attention, no gradient checkpointing, and no AMP — none of which would rescue the compute budget on 2 cores anyway.

Options, honestly costed (ESTIMATE ranges; nothing here is promised):

| Option | What it gives | Cost / risk |
|---|---|---|
| (a) Rent ONE 24 GB cloud GPU when the data gate passes | Nano 1B-token run in ~3–11 h; full gate package (parity + 2 seeds + reruns) in 1–2 days | ~$20–200 total including retries and seed repeats: 24 GB class at typical $0.30–0.80/h; an A100 40GB at $1.00–2.00/h is ~2x the hourly rate but ~2x faster, so totals are similar. Requires the AMP/TF32 parity change, validated by gate G3.2 |
| (b) Stay at Intermediate-15M until resources exist | A legitimate, publishable model on 10–30M tokens; the ladder's scientific value is already realized by Stage 2 | Zero cost; recommended default if the corpus cannot reach 100M tokens |
| (c) Model / pipeline parallelism on this machine | Nothing useful | NOT worth it: 50M params fit in one 24 GB GPU 100x over; pipelining across 2 logical cores adds overhead where there is no bandwidth to hide it. Rejected. |
| (d) "Nano-lite" (~15–25M trained longer) on CPU | A middle point without cloud spend | 1–2+ weeks of exclusive CPU occupancy for a model inside Stage 2's capacity class; low marginal value over (b). Not recommended. |

This plan does not assume any unowned hardware. The only resource claim it makes: IF a single modest GPU is rented for a day, Nano's compute is hours, not months — the true prerequisite is the 100M-token licensed corpus, which is a data-engineering project measured in weeks, not a compute project.

---

## 8. Resource cost summary (ESTIMATE unless marked MEASURED)

| Stage | CPU wall-clock (this machine) | Peak RAM est | Checkpoint disk est | GPU est (24 GB class) | Cloud cost est |
|---|---|---|---|---|---|
| 0 Debug | 469.5 s (MEASURED) | ran on 3.95 GB box | 16.3 MB (MEASURED) | — | $0 |
| 1 Intermediate-5M | 0.5–2.0 h | ~1.0–1.3 GB | ~61 MB (x2 seeds: 122 MB) | < 1 min | $0 local; <$5 if rented |
| 2 Intermediate-15M | 3.3–6.5 d (100M tokens; 1.6–3.3 d min, 10.5–20.9 d max) | ~1.9–2.0 GB (batch 4 + accum 2) | ~192 MB (x2: 384 MB) | 5–20 min (100M tokens) | $0 local; <$10 if rented |
| 3 Nano-50M | **35–273 days — infeasible** | ~3.3–3.6 GB (batch 1 + accum 8, borderline) | ~601 MB (x2: ~1.2 GB; +200 MB fp32 release weights) | 0.8–11.1 h per run depending on token target; 1–2 days incl. retries | **$20–200** full gate package; budget $200 cap |

Disk totals for the whole ladder stay under ~4 GB including two-seed packages — negligible. The scarce resources are, in order: unique licensed tokens (needs a data-engineering effort), CPU wall-clock for Stage 2 (~4–7 days of exclusive occupancy), and one day of rented GPU for Stage 3.

---

## 9. Evidence appendix

### 9.1 Measured inputs and their sources

| Fact | Value | Source file |
|---|---|---|
| Debug params | 1,349,248 | artifacts/models/syria-ai-debug/metrics.json |
| Debug config | V4096/T256/L4/H4/C128/ffn4/bias/rmsnorm/tied/gelu-tanh | artifacts/models/syria-ai-debug/config.json |
| Tokens processed | 2,457,600 (= 8 x 256 x 1200, arithmetic verified) | metrics.json |
| Train loss / valid loss | 8.3441 → 3.9207 (train split); valid 4.3299; best 4.3171 | metrics.json |
| Held-out perplexity | 75.35 | artifacts/models/syria-ai-debug/evaluation_results.json |
| Duration / throughput | 469.5 s / 5,234.3 tok/s, 2 threads, no GPU | training_metadata.json |
| Checkpoint bytes | 16,256,510 (verified with `stat`) | artifacts/experiments/EXP-001/checkpoint.pt |
| Checkpoint contents | model_state + optimizer_state + step + training_config + rng_state | syria_ai/training/trainer.py::save_checkpoint |
| Corpus | 230,168 train / 10,043 valid / 10,484 test tokens; 563 docs; licenses CC BY-SA 4.0 + Project-Authored; no external AI-generated data | data/processed/dataset_stats.json |
| Machine | 2 logical CPU cores, ~3.95 GB RAM, no GPU | PROJECT_STATUS.md, training_metadata.json |
| Optimizer | AdamW (betas 0.9/0.95, wd 0.01, clip 1.0), warmup + cosine; batch 8, grad_accum 1 available | trainer.py, metrics.json config block |

### 9.2 Formulas (all derived numbers in this document use these)

1. **Params** (bias=b ∈ {0,1}, RMSNorm, tied): `P = V*C + T*C + L*(12*C^2 + (2+9b)*C) + C`; untied adds `V*C`. Verified: debug = 1,349,248 exact; debug-untied = 1,873,536; repo nano preset (L=8) = 34,124,288; proposed Nano (L=13) = 49,881,088.
2. **Checkpoint bytes**: `≈ 12*P + ~65 KB` (fp32 weights 4 + AdamW 2 states 8 = 12 B/param). Measured: 16,256,510 = 12*1,349,248 + 65,534 → 12.049 B/param.
3. **Training FLOPs**: `≈ 6*N*D`, true `≈ 6*N*D*(1 + T/(6C))` (causal attention term: 12*L*T*C*D vs weight term 72*L*C^2*D). Stage 0 measured-context check: 6*1,349,248*2,457,600 = 1.99e13; achieved ≈ 42.4 GFLOP/s (6ND basis) over 469.5 s.
4. **Throughput**: `tok/s ≈ 5,234 * (N0/N) * u`, u bands [0.5,0.9] / [0.4,0.8] / [0.3,0.7] for Stages 1/2/3; per-token 6N = 8.10 / 30.4 / 95.8 / 299.3 MFLOP for Stages 0–3.
5. **RAM**: `R ≈ 16*N + L*4B*(19*T*C + 3*H*T^2) + 12*B*T*V + 0.4–0.6 GB runtime`. (19*T*C = saved per-layer activations incl. residual streams, norms, qkv, attention output, FFN hidden and GELU output; 3*H*T^2 = attention matrix copies; 12*B*T*V = logits + log-softmax + grad.) The activation constant is a rough engineering factor — treat RAM numbers as ±30% ESTIMATE until each stage's `ram_report` measures it.
6. **Chinchilla reference**: D_ref = 20*N (upper reference only; small LMs are usually overtrained beyond 20:1 when data allows; current corpus permits neither case).
7. **Epochs**: D_processed / D_unique_train. EXP-001: 2,457,600 / 230,168 = 10.68 (derived from measured numbers).

### 9.3 Derivation notes and honesty flags

- Every wall-clock, RAM, GPU, and cost number for Stages 1–3 is an ESTIMATE with a stated range; the only measured performance anchor in the entire plan is EXP-001's 5,234.3 tok / s on 2 CPU cores (plus its 16.3 MB checkpoint and loss record).
- Stage 2 and Stage 3 token targets are conditional on corpus gates that do not currently hold (230K unique train tokens today vs 10M / 100M required). The data pipeline, dedup, register tagging, and license ledger are prerequisites, not afterthoughts.
- Repetition economics follow published data-constrained scaling findings qualitatively: up to ~4 epochs of repeated data ≈ fresh data; beyond ~16 epochs marginal value decays. Epoch caps in the targets encode this.
- The GPU scenario assumes a code change (AMP bf16 or TF32; device support already exists) validated by gate G3.2 before any long run. Effective-throughput band 10–40 TF/s reflects modest MFU of a 50M-parameter fp32-origin codebase; 100–200 TF/s is quoted as the optimistic hardware ceiling, not the plan basis.
- Next action: run G1 (Stage 1, EXP-002 seed 42 + EXP-003 seed 1337) — feasible today on this machine, ~1–2 h each, zero cost.
