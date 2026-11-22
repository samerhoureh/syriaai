# SDSA Research Protocol — SYRIA Dual-State Architecture (Register Instantiation)

**Document type:** Pre-registered, falsifiable experiment protocol. This is a PROTOCOL ONLY — no model code is implemented by this document, and no SDSA training is authorized by this document.
**Version:** 1.0 (frozen at first publication; changes require a new version number and a dated change note, see Section 9, gate G3).
**Status:** Research hypothesis definition. No SDSA result exists as of this version. Nothing here may be cited as evidence that SDSA works.
**Authoritative status sources:** `docs/PROJECT_STATUS.md`, `docs/TRAINING_REPORT_EXP-001.md`, `syria-ai-core/data/processed/dataset_stats.json`. (`docs/MODEL_REGISTRY.md` still contains stale demo-era rows and is NOT used as a source in this protocol.)

---

## 0. Scope and relationship to existing documents

- `docs/SDSA_RESEARCH.md` defines the SDSA umbrella: two learned internal states inside one model with a trainable fusion, evaluated only under matched parameters (±2%), matched data, matched steps and matched seed, with explicit falsification. That document makes no superiority claim and reports no results. This protocol stays fully consistent with that intent.
- The umbrella contains two distinguishable axes:
  1. **Register axis** — a dual *language-register* state (formal/MSA vs. vernacular/Syrian-dialect), routed inside the model.
  2. **Structure axis** — the language-state vs. structured-world-state pairing (L-State / W-State) from the concept document.
- This protocol pre-registers the **register axis** as the first falsifiable SDSA instantiation, because it is measurable with the data that actually exists in this repository today (SDS-001 contains Arabic-MSA Wikipedia, English Wikipedia, and project-authored Syrian-dialect and mixed seeds). The structure axis cannot be tested yet: its required supervision (documents with explicit masked-attribute structure, per `SDSA_RESEARCH.md` Section 4) does not exist in the current corpus. It gets its own protocol when that data exists.
- Naming honesty: "SDSA" is a project name for a family of hypotheses. The scientific contribution claimed by this program is **reproducible, matched comparisons** — not the name, and not the architecture description.

---

## 1. Problem definition — hypotheses to test, not established facts

A single-state decoder-only transformer trained on one mixed corpus containing multiple *registers* (Modern Standard Arabic, Syrian/Levantine Arabic dialect, English, code) must allocate the same weights to all of them. The following three phenomena are commonly reported in the literature for multilingual / multi-domain training, but **for SYRIA AI Debug they are unverified hypotheses**: only one training run exists (EXP-001), and it produced a single aggregate validation loss (4.3299) with **no per-register evaluation of any kind**. The project has never measured register interference, register forgetting, or code-switching behavior. Each item below is therefore stated as a measurable question with a measurement procedure, not as a finding.

### (a) Register interference (HYPOTHESIS, unverified for SYRIA AI)

- **Claim to test:** Training on mixed-register batches yields worse per-register validation perplexity than training separate same-size models on each register alone ("specialists"), i.e., the mixed model pays an interference cost.
- **Measurement:** Define the *interference gap* for register k:
  `Gap(k) = PPL_mixed(k) − PPL_specialist(k)`
  where `PPL_mixed(k)` is perplexity of the mixed-corpus-trained model on held-out register-k tokens, and `PPL_specialist(k)` is perplexity of a parameter-matched model trained identically but only on register-k data (training-budget caveats in Section 7.4).
- **Current evidence:** None. Gap(k) has never been computed for SYRIA AI Debug.
- **SDSA prediction:** If register-conditioned dual states help, then `Gap_SDSA(k) < Gap_baseline(k)` for the registers involved. This is H2 in Section 3.

### (b) Catastrophic forgetting under register fine-tuning (HYPOTHESIS, unverified for SYRIA AI)

- **Claim to test:** Continuing training of the mixed-trained model on one register only (e.g., dialect-only) degrades performance on the other registers (e.g., MSA perplexity rises substantially).
- **Measurement:** Take the mixed-trained checkpoint; fine-tune on dialect-only data for a fixed short schedule (Section 7.4, F-stage); compare per-register perplexity before vs. after:
  `Forgetting(MSA) = PPL_MSA(after) − PPL_MSA(before)` (and relative version `/ PPL_MSA(before)`).
- **Current evidence:** None. No fine-tuning experiment has ever been run in this project.
- **SDSA prediction:** The dual-state model forgets less because state-specific capacity can absorb the new register; this is H3 in Section 3.

### (c) Code-switching handling (HYPOTHESIS, unverified for SYRIA AI)

- **Claim to test:** A model trained on registers in separate documents handles intra-document / intra-sentence Arabic-English switching worse than intra-register text, and register-aware states reduce the penalty at switch points.
- **Measurement:** Per-token NLL evaluated (i) on a code-switched held-out slice and (ii) specifically at and immediately after switch points, compared against non-switch control positions in the same slice ("switch-point NLL delta"). The corpus already contains 54 detected mixed-language documents (dataset_stats.json); a small project-authored code-switch evaluation set may be added under the existing DATA ENGINE policy (project-authored seeds are permitted; external model generation is forbidden).
- **Current evidence:** None.
- **Status in this protocol:** Measured and reported, but **not** load-bearing for adoption (sample sizes at Debug scale are too small for it to be a primary criterion).

**Standing caveat:** all three phenomena may fail to appear at Debug scale (1.35M params, 230K train tokens). A null measurement at Debug scale is a valid outcome and must be reported as "not measurable at this scale", not as "SDSA unnecessary" or "interference does not exist".

---

## 2. Prior art survey (by research thread, no fabricated citations)

Each thread below is described generically from established knowledge. No specific paper titles, authors, or years are claimed. For each thread: what it does, and what SDSA would add or do differently.

| # | Research thread | What it does (generic description) | What SDSA adds / how it differs |
|---|---|---|---|
| T1 | Conditional computation & Mixture-of-Experts (MoE) | Replace parts of a layer (usually the FFN) with multiple "expert" sub-networks; a learned router selects a sparse subset per token; training uses auxiliary load-balancing losses. Well-established at large scale. | SDSA uses a very small number of dense states (S = 2) rather than many sparse experts; in its primary (soft) form both branches execute for every token, so there is no top-k routing machinery and no sparsity claim. The routing supervision comes from corpus provenance (document register), which classic MoE does not use. SDSA is explicitly tested at parameter parity on a 1M-scale model, a regime MoE work rarely examines. |
| T2 | Parameter-efficient adaptation: adapters, low-rank updates (LoRA-style), per-domain modules | Freeze a base model and add small trainable modules (bottleneck adapters, low-rank weight updates) per domain/task/language to specialize behavior cheaply. | SDSA trains the dual states **from scratch inside one model**, not as post-hoc add-ons to a pretrained model. It asks a different question: does baking register-conditioned capacity into the architecture from the start beat a single-state model of equal total size under equal compute? |
| T3 | Language-specific components in multilingual models | Multilingual LMs sometimes dedicate layers, experts, or vocabulary portions to specific languages, or route by detected language; analyses show uneven capacity allocation across languages. | SDSA targets **register** divergence inside one language (MSA vs. Levantine Arabic), a distinction most multilingual routing collapses because both are "Arabic". It also treats the register signal as something the router must *learn to infer from the hidden state*, with an optional explicit state embedding, and pre-registers a falsification threshold. |
| T4 | Code-switching modeling in NLP | A long research thread on text mixing languages mid-sentence: language-ID tokens, language-specific embeddings/poses, switch-aware language models, evaluation on switch-point perplexity. | SDSA's token-level gate computed from the hidden state is functionally related to per-token language conditioning; the difference is that the gate modulates FFN *capacity* (two state branches) rather than only embeddings, and code-switching is treated as an evaluation axis (switch-point NLL), not the adoption criterion. |
| T5 | Register, dialect and sociolinguistic variety modeling | Work on dialectal Arabic NLP specifically documents that MSA resources dominate and dialects are underserved; style/register control via conditioning tokens or controllable-generation methods exists generally. | SDSA makes register a **structural capacity split with learned routing**, not a prompt/token control overlay, and pairs it with a matched-parameter control so any claimed benefit cannot be explained away as "just more parameters". |
| T6 | Gating mechanisms (soft/hard) | Soft gates: convex mixtures of branch outputs, differentiable everywhere. Hard gates: discrete selection (argmax, Gumbel/straight-through estimators), enabling compute savings but complicating training. | SDSA uses a token-level scalar soft gate as the primary mechanism (simplest, fully differentiable, trivially interpretable in the 2-state case: one number g per token per layer) and pre-registers a hard-gating ablation with straight-through gradients to measure the latency/PPL trade-off. |
| T7 | Hypernetworks & conditionally parameterized layers | A small network generates the weights (or modulations) of another layer conditioned on an input, giving input-dependent parameters. | SDSA does **not** generate weights; it selects/mixes between two fixed learned parameter sets per token. This keeps parameter accounting exact and auditable (Section 4.5) — a deliberate simplicity choice for a project whose scientific product is clean comparisons. |
| T8 | Prompting / prefix / state-vector conditioning | Condition a frozen or trainable model on control tokens, learned prefix vectors, or style vectors to steer domain, style, or language behavior. | SDSA's optional state-embedding ablation (A3 in Section 6) is exactly this idea in miniature; pre-registering it against full dual-FFN isolates *how much* of any benefit is mere explicit conditioning versus actual specialized capacity. |
| T9 | Catastrophic forgetting / continual learning mitigation | Known mitigations: freezing subsets of parameters, regularization toward old weights, rehearsal, parameter-isolation approaches. | SDSA's state-isolated FFN branches give a natural isolation handle (freeze one state's branch during single-register fine-tuning); H3 tests whether this reduces forgetting relative to a matched monolithic model, with the frozen-branch variant run as a mechanism probe. |

**Honest novelty statement:** SDSA's individual ingredients are all established. The specific, bounded claim of this program is narrow: a gated dual-state FFN with a lightweight hidden-state router, trained from scratch, at parameter parity, on an Arabic register-diverse corpus, with pre-registered falsification criteria. Whether that yields reproducible gains is an open empirical question.

---

## 3. Hypothesis statements (pre-registered)

All hypotheses are evaluated **only** under the matching constraints inherited from `SDSA_RESEARCH.md` Section 3: equal total parameters (±2%), identical data, identical token budget (steps), identical seed list, identical evaluation code. Thresholds below are frozen at protocol version 1.0; changing them after observing results is a protocol violation (any change requires a new version and a dated justification, and the affected results are then labeled "post-hoc").

### H1 — Primary hypothesis (register-conditioned dual-state FFN improves per-register modeling)

**Statement:** A decoder-only transformer in which each block's FFN is replaced by a gated mixture of two register-state FFN branches (Section 4), trained from scratch on the mixed-register corpus with register routing supervision, improves **mean relative per-register validation perplexity** across the three register subsets (MSA, Syrian dialect, English) by **≥ 5%** relative, compared against a parameter-matched single-state baseline (widened-FFN control, Section 5.3), at equal training compute (identical steps and token budget).

**Predicted observable:** `mean_k [ (PPL_ctrl(k) − PPL_sdsa(k)) / PPL_ctrl(k) ] ≥ 0.05`, with:
- no single register degrading by more than **2%** relative vs. the control,
- overall (mixed) validation loss of SDSA no worse than **+1%** relative vs. the control (capacity-parity guard, mirrors SDSA_RESEARCH.md gate S1),
- the mean improvement larger than **2× the seed spread** (Section 7.5).

**Falsification:** If the mean relative improvement is < 5%, OR any register degrades > 2%, OR overall val loss regresses > 1%, OR the improvement does not exceed 2× seed spread — **H1 is rejected**, SDSA is not adopted, and the baseline remains the default architecture. A rejected H1 is a publishable, documented result (ROADMAP phase 5 requires documenting actual results either way).

### H2 — Secondary hypothesis (dual states reduce register interference)

**Statement:** The interference gap (Section 1a) is smaller for the SDSA model than for the matched control: `mean_k Gap_SDSA(k) ≤ 0.5 × mean_k Gap_ctrl(k)` over registers where a specialist reference is trainable (i.e., SDSA closes ≥ 50% of the interference gap), without H1's capacity-parity guard being violated.

**Falsification:** Gap closure < 50%, or no measurable gap exists at Debug scale for any register (in which case the verdict is "interference not measurable at this scale" and H2 is deferred, not rejected and not confirmed).

### H3 — Secondary hypothesis (dual states reduce catastrophic forgetting)

**Statement:** After an identical dialect-only fine-tuning stage (Section 7.4) applied to both the matched control and the SDSA model, the relative MSA validation perplexity degradation of SDSA is ≤ **0.7×** that of the control (i.e., ≥ 30% relative reduction in forgetting).

**Falsification:** SDSA forgetting ≥ 0.7× control forgetting, or SDSA forgetting exceeds control forgetting in absolute terms in the majority of seeds — H3 rejected.

### Non-hypothesis guardrail

If H2/H3-style benefits appear **only** in the oracle-state ablation (A2b, ground-truth register labels supplied) and **not** in the learned-router configuration (A1), the correct conclusion is "the router cannot infer register from the hidden state" — the architecture claim is then falsified even if the state branches themselves are useful. This distinction is mandatory in the results report.

---

## 4. Mathematical specification

### 4.1 Notation

- `x ∈ R^{B×T×d}`: hidden activations; `d = n_embd`, `L = n_layer`, `h = ffn_mult·d` (branch width), `S` = number of state branches, `K` = number of router classes.
- Baseline FFN (per layer): `FFN(x) = W2 · act(W1 · x + b1) + b2`, `W1 ∈ R^{h×d}`, `W2 ∈ R^{d×h}`, `act = GELU(tanh)`, followed by dropout.
- Register classes: `K = 2` in the primary design: `0 = MSA / formal`, `1 = dialect / vernacular`. English and code tokens are routed freely by the learned gate in the primary design (no routing supervision on them); a `K = 3` ablation (adding `2 = English/code`) is pre-registered.

### 4.2 State variable (router)

At layer `l`, the router reads the same normalized tensor the FFN consumes (no extra norm, no extra read path):

```
z_l = W_{r,l} · ln2_l(x) + b_{r,l}        # W_{r,l} ∈ R^{K×d}, bias-free in primary design
s_l = softmax(z_l / τ) ∈ Δ^{K−1}          # τ = 1; token-level, shape (B, T, K)
```

- Router weights are per-layer (no sharing across layers), standard N(0, 0.02) init (existing `_init_weights` covers it); with zero-initialized bias logits, `s` starts uniform (0.5/0.5 for K=2), i.e., the model starts as a balanced blend and learns to differentiate.
- **Optional explicit state conditioning (ablation only):** a learned state-embedding table `E_reg ∈ R^{K×d}` added to the input embedding (or to each block input): `x ← x + E_reg[k_doc]` with document register, or `E_reg[argmax_k s_0]` when inferred. In the primary design this table is absent — the state is inferred purely from content.

### 4.3 Modified FFN equation (dual-state FFN)

For K = 2, with `g = s_l[..., 0] ∈ (0,1)` broadcast over the hidden dimension:

```
FFN_sdsa(x) = g ⊙ FFN_A(ln2_l(x)) + (1 − g) ⊙ FFN_B(ln2_l(x))
x ← x + FFN_sdsa(x)                        # residual and dropout layout unchanged
```

General S-state form: `FFN_sdsa(x) = Σ_{k=1..S} s_l[..., k] ⊙ FFN_k(ln2_l(x))` (in the primary design S = K = 2; S and K are independently configurable).

- `FFN_A` = formal/MSA-leaning branch, `FFN_B` = vernacular/dialect-leaning branch. "Leaning" is an initialization-free expectation: both branches start random; the routing loss and gradient flow decide their specialization. No branch is pre-assigned weights.
- Dropout is applied per branch exactly as in the baseline (`drop(proj(...))`), before mixing.
- **Soft gating (primary):** both branches computed for every token; fully differentiable.
- **Hard gating (ablation A4):** `ĝ = s + (onehot(argmax s) − s).detach()` (straight-through estimator); at inference only the selected branch executes.

### 4.4 Routing-loss options

Total objective: `Loss = L_LM + λ · L_route + β · L_bal` with frozen primary values `λ = 0.1`, `β = 0.01` (a sensitivity probe is permitted only after the first verdict, as a documented ablation).

1. **Supervised (primary):** register labels derived deterministically from corpus provenance — `ar.wikipedia.org` documents → MSA; `synthetic-dialect` documents → dialect; `en.wikipedia.org` → no routing loss in K=2 (gate unconstrained) / class 2 in K=3; `mixed` and `code` documents → excluded from `L_route` in the primary design (ground truth ambiguous). Labels are document-level and broadcast to all tokens of the document. `L_route = mean over routed tokens and layers of CE(s_l, y_reg)`.
2. **Token-level weak labels (ablation):** script-based labels (Arabic-script tokens inherit the document label; Latin-script tokens → English/neutral) — deterministic, project-computed, no external model.
3. **Unsupervised (ablation A5):** `λ = 0`; router trained by LM gradients alone. Requires the balance term to avoid collapse.
4. **Load-balancing regularizer (generic MoE-style form):** `L_bal = K · Σ_k f̄_k · s̄_k`, where `f̄_k` = fraction of tokens whose hard assignment is k, `s̄_k` = mean router probability for k, computed per batch; penalizes router collapse toward one state.
5. **Hybrid schedule (fallback if supervised routing destabilizes):** supervised warmup for the first 200 steps, then `λ → 0` and unsupervised continuation.

### 4.5 Parameter accounting (exact)

Baseline per-layer ledger (EXP-001 verified numbers, `bias=True`, `d=128`, `h=512`):

| Component | Formula | Params |
|---|---|---:|
| ln1 (RMSNorm) | d | 128 |
| Attention QKV (bias) | d·3d + 3d | 49,536 |
| Attention proj (bias) | d·d + d | 16,512 |
| ln2 (RMSNorm) | d | 128 |
| FFN fc (bias) | d·h + h | 66,048 |
| FFN proj (bias) | h·d + d | 65,664 |
| **Layer total** | | **198,016** |

Embeddings: token 4096·128 = 524,288; positional 256·128 = 32,768; final norm 128; LM head tied (0). **Baseline total = 1,349,248** (matches `training_metadata.json` exactly).

**General SDSA overhead formula** (per the definitions above):

```
ΔP_total = L · [ (S − 1) · (2·d·h + d + h)              # each extra FFN branch
              + (d·K + b_r·K)                            # router (b_r = 1 if router bias)
              ]
         + c_se                                           # K·d if state-embedding table, else 0
```

Primary design (S=2, K=2, b_r=0, no state embedding): `ΔP_total = 4 · (131,712 + 256) = 527,872` → **SDSA total = 1,877,120** (+39.12% vs. EXP-001 baseline). With the state-embedding table: +256 → 1,877,376. With K=3 router (bias-free): +128/layer → +512 → 1,877,632.

**What is shared vs. per-state (fixed by this protocol):**

| Shared (one copy for all states) | Per-state (duplicated) | Per-layer auxiliary |
|---|---|---|
| Token + positional embeddings; LM head (tied); attention QKV + output proj; both RMSNorms (ln1, ln2); final norm; dropout config; residual structure | FFN branch weights only (fc + proj per branch) | Router linear (per layer); optional state-embedding table (global, one table) |

### 4.6 Compute accounting (MACs per token, forward)

| Variant | FFN MACs/layer | Per-layer total | Model total (L=4) |
|---|---:|---:|---:|
| EXP-001 baseline (h=512) | 131,072 | 196,608 | 786,432 |
| Widened control C1 (h=1024) | 262,144 | 327,680 | 1,310,720 |
| SDSA soft (2 branches + router) | 262,144 + 256 | 327,936 | 1,311,744 (+0.078% vs C1) |
| SDSA hard (1 active branch + router) | 131,072 + 256 | 196,864 | 787,456 (−39.9% vs C1) |

Soft SDSA is FLOPs-neutral against the widened control by construction; hard gating converts the second state into a latency saving.

---

## 5. Prototype plan (specification only — no code is written by this protocol)

### 5.1 Config surface (`syria_ai/model/config.py` — new `ModelConfig` fields, all default-off)

| Field | Type / default | Meaning |
|---|---|---|
| `use_sdsa` | `bool = False` | Master switch; `False` must reproduce the baseline bit-for-bit. |
| `sdsa_states` | `int = 2` | S (FFN branches). |
| `sdsa_router_classes` | `int = 2` | K (router classes). |
| `sdsa_router_bias` | `bool = False` | Router bias flag. |
| `sdsa_gate` | `str = "soft"` | `"soft"` or `"hard"` (straight-through). |
| `sdsa_state_embed` | `bool = False` | Register-embedding conditioning table (ablation A3). |
| `sdsa_route_loss_weight` | `float = 0.1` | λ. |
| `sdsa_balance_loss_weight` | `float = 0.01` | β. |
| `sdsa_route_layers` | `str = "all"` | `"all"` or `"last"`. |
| `ffn_hidden` | `Optional[int] = None` | Explicit FFN width override; when set, overrides `ffn_mult·n_embd`. Enables the exact-match control (h=1026). |
| `register_labels`-aware trainer flag | trainer-side | Batch collation supplies per-document register ids; not a model field. |

`validate()` extended: `sdsa_states ≥ 2`; `sdsa_router_classes ≥ 2`; if `use_sdsa` and `sdsa_gate == "hard"`, require `sdsa_gate` handling in generate (below); `ffn_hidden` must be ≥ 64 when set.

### 5.2 Model changes (`syria_ai/model/transformer.py` — minimal surface)

1. **`RegisterRouter(nn.Module)`** — `Linear(n_embd, K, bias=sdsa_router_bias)`; `forward(normed_x) -> s` (softmax over last dim). No other logic.
2. **`DualStateFFN(nn.Module)`** — holds `S` instances of the existing `FeedForward` (reused unchanged) plus a `RegisterRouter`; `forward(normed_x) -> (mixed_output, s, hard_assignment)`. Soft path: convex mixture; hard path: straight-through mask and branch skipping at inference.
3. **`TransformerBlock`** — when `cfg.use_sdsa`, replace `self.ffn` with `DualStateFFN`; forward returns `(x, s_l)` (routing stats) instead of `x` when SDSA is on; attention path untouched.
4. **`SyriaTransformer.forward`** — new optional args `register_targets: Optional[Tensor]` (shape (B,) or (B,T); `-1` = excluded token/document) and returns `(logits, loss, aux)` where `aux = {"route_loss": tensor|None, "gate_stats": per-layer mean gate and entropy}`; `loss` becomes `L_LM + λ·L_route + β·L_bal` when targets are provided. Backward compatibility: without `use_sdsa`, returns exactly the current two-tuple signature.
5. **`generate`** — unchanged logic; the router runs implicitly per step on content. If `sdsa_state_embed` is on, an optional `register_hint: Optional[int] = None` argument is added (default `None` = pure content routing). No KV cache changes (none exists).
6. **Init note:** the existing residual-projection scaler (`pn.endswith("proj.weight")`) will also scale both SDSA branch output projections and must be documented in the run config; this is accepted behavior, identical treatment for both branches.
7. **Instrumentation:** every `eval_interval` steps, log per-layer mean gate per register subset, gate entropy histogram, and a collapse flag (`max_k mean prob > 0.95` over a full mixed-valid pass) into `log.jsonl` + a `gate_stats.json` artifact.

### 5.3 Parameter-matched baseline construction (control)

Two pre-registered constructions, both satisfying the ±2% fairness rule from `SDSA_RESEARCH.md`:

- **C1 (canonical control, zero code risk):** baseline architecture with `ffn_mult=8` (h = 1024). Total = 1,875,584 params. SDSA R0 is heavier by 1,536 params = **+0.082%** — inside ±2%. Built entirely with existing code (`debug_config()` + `ffn_mult=8`).
- **C1x (exact-match option):** baseline with `ffn_hidden=1026` via the new override field. Total = 1,877,640; heavier than SDSA R0 by 520 params = **+0.028%**. Used only if reviewers require ≤0.05% mismatch; otherwise C1 is the control of record.
- Matching is on **total** trainable parameters including embeddings, counted with `num_params(non_embedding=False)` (the same convention as the EXP-001 report), and re-asserted by a unit test (Section 5.6).
- The widened control intentionally matches FLOPs too (Section 4.6), so neither "more params" nor "more compute" can explain an SDSA win. The capacity-neutral variant A7 (Section 6) additionally controls for capacity *distribution*.

### 5.4 Training regime (identical for every compared run)

Inherited from EXP-001 / `train_debug.py` defaults, frozen: AdamW, lr 3e-3, warmup 60 steps, cosine decay, weight decay 0.01, grad clip 1.0, batch 8 × block 256 = 2,048 tokens/step, 1,200 steps (2,457,600 tokens), `torch_threads=2`, seeds {42, 43} minimum. Same tokenizer artifact (corpus_hash `9c4c1ea6bbfa6219`), same shards, same data order per seed. SDSA runs add only λ/β terms and register labels in batches — never a different LR, schedule, or step count. One exception is pre-registered: **A2b (oracle-state)** receives ground-truth register ids as inputs and therefore is not expected to need routing supervision; its `λ` stays 0.1 with `s` forced to the supplied labels at the gate (documented in the run config).

### 5.5 Data requirements for the experiments (EXP-002 deliverable)

- Register-stratified shards produced deterministically from existing document metadata (source + seed file + language detection already in the DATA ENGINE): `train/valid/test` per register (`msa`, `dialect`, `eng`) plus a `mixed`/`code-switch` evaluation slice. No re-labeling by hand; provenance is the label.
- A register histogram (tokens per register per split) published in the EXP-002 report — currently unknown and required before any SDSA verdict (Section 8, precondition P3).
- Per-register evaluation must iterate **all** blocks of the register shard (the existing perplexity function caps batches; the register evaluator must not sample).

### 5.6 Tests to add (pytest, alongside existing 34)

1. Param-count assertions: SDSA R0 total = 1,877,120 ± 0; control C1 total = 1,875,584 ± 0; A7 total = 1,350,784 ± 0.
2. Forward/backward shapes and gradient flow through both branches AND the router at every layer.
3. Straight-through hard gate: gradient reaches both branches and the router.
4. `use_sdsa=False` produces outputs identical (same seed, same input) to the unmodified baseline.
5. Soft gate at g forced to 1.0 (router logits clamped) reproduces `FFN_A`-only behavior — isolates gating arithmetic.
6. Collapse detector fires on a synthetic all-one-state batch.

### 5.7 Inference speed / memory measurement method

- Independent process, batch 1, greedy decoding (temperature 0, no top-k/top-p), fixed 500-token generation from a fixed prompt, 5 repeats, median tokens/s — same protocol family as the EXP-001 measurement (396 tok/s) so numbers are comparable.
- Peak RSS via the existing `monitor.py` (psutil) sampling during one training step and during generation; checkpoint byte size; params via `num_params(non_embedding=False)`.
- Analytic MAC table (Section 4.6) reported next to wall-clock, because wall-clock on 2 CPU cores includes Python overhead the MAC count excludes.
- Variants measured: EXP-001 baseline, C1, SDSA soft, SDSA hard. All on the same machine state (no parallel load), machine reported honestly (2 logical cores, no GPU).

---

## 6. Ablation matrix

All rows: 1,200 steps, 2,048 tokens/step, seeds {42, 43} (extend to {42, 43, 44} if spread > effect), identical data. "Params" = total trainable. Decision rules reference the thresholds frozen in Sections 3 and 10.

| ID | Configuration | Params (total) | Δ vs. control | What it isolates | Expected evidence | Decision rule |
|---|---|---:|---|---|---|---|
| A0 | **Control** — single-state, widened FFN (ffn_mult=8) | 1,875,584 | — | The bar SDSA must beat at equal params/compute | Reference PPL per register + overall | Defines all denominators |
| A1 | **SDSA-full** — S=2, K=2, soft gate, supervised routing (λ=0.1, β=0.01) | 1,877,120 | +0.082% | H1 primary test | Per-register PPL improvement ≥5% mean; gate stats differentiate registers | Adopt for next stage only if H1 thresholds met |
| A2a | No-router / fixed state — learnable scalar g per layer, no router (init 0.5) | 1,875,588 (A0 + 4 gate scalars; unit test asserts exact) | ≈ +0.0002% | Does *dynamic* routing matter, or is it just two branches? | If A1 ≈ A2a: gains are capacity allocation, not routing | If A1 ≤ A2a + noise: routing claim dropped; SDSA reduced to "structured capacity split" |
| A2b | Oracle-state — s = ground-truth register label (no learned router) | ≈ A1 | ≈ +0.08% | Upper bound with perfect routing | If A2b ≫ A1: router is the bottleneck | Router research continues; architecture adoption paused until router closes ≥50% of the A2b−A1 gap |
| A3 | Shared-FFN + state-embed — one FFN (baseline width h=512) with `x += E_reg[k]` | 1,349,504 (+256) | −28% vs A0 | Is explicit conditioning alone sufficient? | If A3 ≈ A1: adopt the cheap conditioning variant | If A3 within 1% of A1: prefer A3 (simpler, fewer params); SDSA dual-FFN not justified |
| A4 | SDSA hard gating (straight-through), otherwise = A1 | 1,877,120 | +0.082% | Latency/PPL trade-off of discreteness | PPL within 1% of A1 AND ≥10% faster per token, else soft stays default | Hard becomes inference default only if both conditions hold |
| A5 | SDSA unsupervised routing (λ=0, β=0.01) | 1,877,120 | +0.082% | Is provenance supervision necessary? | If A5 ≈ A1: labels unnecessary (simpler pipeline) | If A5 < A1 − 2%: supervision is load-bearing, keep it |
| A6 | SDSA K=3 (explicit English/code state), S=2 | 1,877,632 | +0.11% | Does English deserve its own state? | English subset improves ≥3% with no Arabic regression | If yes, K=3 becomes default; else stay K=2 |
| A7 | **Capacity-neutral SDSA** — S=2 with branch width h/2 (256), K=2, soft, supervised | 1,350,784 | +0.114% vs EXP-001 baseline | Routing benefit with zero total-capacity increase (also FLOPs-neutral vs EXP-001) | Direct comparison against the untouched 1,349,248 baseline | If A7 ≥ A1: capacity split irrelevant, routing alone suffices → simplifies the claim; if A7 ≈ baseline: capacity split is necessary |

Note on A2a params: replacing the K-input router with one learnable scalar per layer adds exactly 4 parameters over A0 (1,875,584 → 1,875,588); the exact figure is asserted by the param-count unit test at implementation time. Table values state the pre-registered intent; the unit test is authoritative.

**Interpretation priority:** A1 vs A0 decides H1. A2a/A2b/A3/A7 decide *why* (routing vs capacity vs conditioning). A4/A5/A6 decide *which variant* carries forward. An SDSA "win" that only appears with oracle states, or only with more parameters, or only in one seed, is a loss.

---

## 7. Evaluation protocol

### 7.1 Per-register perplexity (primary metric)

- Register subsets: `valid_msa`, `valid_dialect`, `valid_eng` (from provenance-stratified shards, Section 5.5) + `mixed/code-switch` slice for context.
- Metric: `PPL = exp(mean token NLL)` over **all** blocks of each register shard, fixed RNG, identical tokenizer. Reported alongside `overall val loss` on the unsplit mixed valid shard (comparable to EXP-001's 4.3299).
- **Measurement-quality gate:** a register's PPL is only considered "measurable" if its eval subset has ≥ 2,000 tokens (≥ 5,000 preferred). Given the current valid split is 10,043 tokens across all registers, some subsets will likely fall below this at Debug scale — the EXP-002 register histogram decides, and unmeasurable registers are reported as such, never interpolated.

### 7.2 Overall validation loss

Standard mixed `valid.bin`, identical evaluator code path for every variant. Capacity-parity guard: SDSA must not exceed control by > 1% relative (H1 guard).

### 7.3 Generation quality (small, structured, honest)

- Fixed prompt set: 10 prompts (4 MSA, 4 dialect, 2 mixed/code-switch), sampled at temperature 0.9 / top-k 40 (matching existing practice) with fixed decode seed per model.
- Blind side-by-side comparison (model identities hidden) of control vs. best SDSA variant, rated 1–5 on: fluency, register consistency with the prompt, repetition. Single rater (project owner) — the single-rater limitation is stated in the report and the rubric is secondary evidence only.
- Automatic proxies (pre-registered, deterministic): repetition rate (fraction of duplicated 4-grams in 500-token generations), and register-consistency agreement of a tiny project-authored character/word register classifier (trained on provenance labels only) applied to generations.
- Code-switch metric: switch-point NLL delta on the mixed eval slice (Section 1c) — reported, not load-bearing.

### 7.4 Interference and forgetting stages

- **Specialists (for H2):** matched-size models trained with the identical regime on register-only data; step budget = min(1,200 steps, 8 epochs of the register shard) with the actual token count reported. Caveat printed in results: specialists on small registers may be under- or over-trained; the gap is interpreted with that caveat attached.
- **Fine-tune stage (for H3):** from the S2 mixed-trained checkpoints, continue training on dialect-only data, 300 steps, constant lr 3e-4, batch 8, identical eval before/after; the same schedule applied to control and SDSA. A frozen-state-A-branch variant of SDSA is run as a mechanism probe (is isolation the cause?).

### 7.5 Reproducibility rules

- ≥ 2 seeds per configuration (42, 43); a third seed (44) is mandatory whenever `spread > effect size` for a claimed result. Report `mean ± spread` (spread = max − min across seeds).
- Data order, init, and dropout draws are seed-determined and identical across compared configurations.
- Thresholds (H1 ≥5%, guards ≤1%/≤2%, H2 ≥50%, H3 ≥30%) are applied to seed-means, and a claimed effect must exceed 2× spread.
- Every run lands in `artifacts/experiments/<EXP-ID>/` with the existing artifact family (config.json, metrics.json, log.jsonl, training_metadata.json, evaluation_results.json) plus `eval_per_register.json` and `gate_stats.json`. A run without these artifacts does not exist.

---

## 8. Falsification and risk register

### 8.1 What would kill SDSA (kill criteria)

| # | Result | Consequence |
|---|---|---|
| K1 | H1 thresholds not met after full matrix and required seeds | SDSA rejected at this scale; baseline remains default; results documented |
| K2 | A1 ≈ A2a (fixed gate) — no dynamic-routing contribution | "Dual-state routing" claim dropped; at most a capacity-allocation note survives |
| K3 | A2b (oracle) ≫ A1 (learned router) and router gap not closable | Router mechanism declared unproven; architecture adoption blocked |
| K4 | Wins vanish across seeds (mean improvement < 2× spread) | Treated as no-effect; no claims |
| K5 | Overall val loss regression > 1% persists in every matched comparison | Capacity-parity violated in practice; SDSA rejected on the S1-style guard from `SDSA_RESEARCH.md` |

### 8.2 Known risks and mitigations

| Risk | Failure signature | Mitigation / detection |
|---|---|---|
| Router collapse | One state receives > 95% of gate mass corpus-wide | Balance loss β; collapse flag in gate_stats.json; A5 ablation quantifies supervision dependence |
| State imbalance (both branches do the same thing) | Gate separates but per-register PPL unchanged; branch weight cosine similarity ≈ 1 | A2a comparison; branch-diversity diagnostic logged |
| Extra params not worth it | A1 beats A0 but loses to cheaper A3 | Decision rule of A3 prefers the cheaper variant |
| Register labels noisy (synthetic dialect seeds are formulaic) | Router tracks label artifact, not register | Report seed provenance; mixed/code documents excluded from supervision; interpret dialect results with this caveat |
| Tiny corpus makes effects unmeasurable | Per-register eval subsets < 2,000 tokens; specialists under-trained | "Not measurable at Debug scale" verdict; experiment deferred to expanded data / intermediate stage — never force a verdict |
| Debug-scale noise dominates | Seed spread ≥ effect | Third seed mandatory; effects below spread are reported as null |
| Supervision destabilizes LM loss | Train loss divergence vs. baseline in first 100 steps | Hybrid schedule (Section 4.4 item 5); λ annealing documented |
| Hard-gate training instability | A4 loss spikes / collapse | Soft checkpoint → hard fine-tune fallback is pre-registered as the documented recovery path |

### 8.3 Minimum data / compute preconditions (scaling-plan linkage)

`docs/SCALING_PLAN.md` does not exist yet; the staged scaling rule lives in `docs/ROADMAP.md` (small-first gating: Debug → Nano → Mini → Base → Pro) and `docs/PROJECT_STATUS.md`. This protocol therefore defines its preconditions relative to that order and requires the scaling plan document to be authored (or ROADMAP amended) before gate G2 can pass. Preconditions:

- **P1 (compute feasibility):** estimated wall-clock for the full matrix ≤ 8 CPU-hours at Debug scale (feasible: one run ≈ 8.3 min; ~30 runs ≈ 4 h; measured, not assumed).
- **P2 (eval measurability):** ≥ 2,000 tokens per register in held-out data (≥ 5,000 preferred), verified by the EXP-002 register histogram.
- **P3 (training mass):** ≥ 50,000 training tokens per register for any H2 specialist comparison involving that register; registers below the bar are excluded from H2 (reported as not measurable).
- **P4 (scale consistency):** any SDSA claim promoted beyond "Debug-scale observation" must be re-verified once at the intermediate-model stage (G2) — a Debug-scale win alone never justifies adoption at Nano or above.

---

## 9. Experiment sequence and gates (explicitly ordered; no exceptions)

### Gates (must pass in order; SDSA TRAINING MAY NOT START before G1, G2, G3 all pass)

- **G0 — Baseline integrity (already met):** EXP-001 artifacts exist and reload; 34/34 tests green; checkpoint reload + generation proof present.
- **G1 — EXP-002 verification:** the independent verification rerun (EXP-002, fresh seed, identical data/architecture/hyperparameters, already initiated in `artifacts/experiments/EXP-002/`) **completes** with its full artifact set (metrics.json, evaluation_results.json) and reproduces EXP-001's final validation loss within the documented seed-to-seed spread; additionally the register-stratified evaluation harness and per-register shard histogram (Section 5.5) are delivered and reviewed. Partial logs do not count.
- **G2 — Intermediate-model stage exists:** an intermediate configuration between Debug (~1.35M) and Nano (50M) — exact size and budget defined in the scaling plan document required above — has been trained and evaluated at least once with the standard harness, so that SDSA effects can later be checked for scale-consistency (P4). If no intermediate stage is defined yet, G2 cannot pass and SDSA stays gated.
- **G3 — Protocol registration:** this document is frozen (version + date), and the pre-registered thresholds (H1/H2/H3, guards, ablation matrix) are recorded before the first SDSA training step. Any later threshold change = new version + dated note + "post-hoc" labeling of affected results.

### Stages (S0–S6)

| Stage | Content | Training? | Gate dependency |
|---|---|---|---|
| S0 | Implementation + parity/param tests (Sections 5.1–5.3, 5.6); instrumentation only | None (unit tests only) | May proceed in parallel with G1/G2 |
| S1 | Capacity-parity run: A1 vs A0, 2 seeds | First SDSA training | G1 + G2 + G3 |
| S2 | Main H1 matrix: A0–A7, 2 seeds each | Yes | S1 parity guard passed (≤ +1% overall val loss) |
| S3 | H2 specialist study (Section 7.4) | Yes (specialists) | S2 complete |
| S4 | H3 fine-tune forgetting study (Section 7.4) | Yes (fine-tune) | S2 complete |
| S5 | Latency/memory measurements (Section 5.7) | None (inference) | S2 checkpoints exist |
| S6 | Results report (SDSA_RESULTS_EXP-xxx.md) + verdict: ADOPT / KEEP-RESEARCH / REJECT | None | All above |

**Verdict semantics (mirrors ROADMAP phase 5):** ADOPT = H1 thresholds met and no guard violated → SDSA becomes the default for the next scale, subject to P4 re-verification. KEEP-RESEARCH = partial signal (e.g., oracle-only benefit, or A3-cheaper win) → targeted follow-up, no adoption. REJECT = documented negative result; baseline remains default; the report is written either way.

---

## 10. Success metrics summary

| # | Metric | Threshold (frozen, v1.0) | Source |
|---|---|---|---|
| M1 | Parameter match SDSA vs control | within ±2% (design achieves +0.082%) | Section 5.3 ledger + unit test |
| M2 | Capacity parity (overall val loss, SDSA vs control) | regression ≤ +1% relative | H1 guard |
| M3 | H1: mean per-register PPL improvement (MSA, dialect, EN) | ≥ 5% relative, no register worse than +2%, effect > 2× seed spread | Section 3 |
| M4 | H2: interference-gap closure | ≥ 50% of control gap | Section 3 |
| M5 | H3: forgetting reduction (relative MSA degradation after dialect fine-tune) | ≤ 0.7× control | Section 3 |
| M6 | Routing signal exists | mean gate differs ≥ 0.1 between MSA and dialect eval subsets; no state > 95% corpus-wide | gate_stats.json |
| M7 | Inference cost | soft gate ≤ +10% per-token latency vs control; hard gate ≤ 0.9× control latency with PPL within 1% of soft | Section 5.7 |
| M8 | Reproducibility | ≥ 2 seeds; report mean ± spread; third seed when spread > effect | Section 7.5 |
| M9 | Measurability precondition | ≥ 2,000 tokens per register eval subset (else verdict = "not measurable at this scale") | Section 7.1 |

---

## Appendix A — Exact parameter ledger of pre-registered configurations

| Config | Per-layer | Embeddings + final norm | Total | Δ vs. EXP-001 |
|---|---:|---:|---:|---:|
| EXP-001 baseline (h=512) | 198,016 | 557,184 | **1,349,248** | — |
| C1 control (ffn_mult=8, h=1024) | 329,600 | 557,184 | **1,875,584** | +526,336 |
| C1x control (ffn_hidden=1026) | 330,114 | 557,184 | **1,877,640** | +528,392 |
| SDSA R0 (S=2, K=2, soft, supervised) | 329,984 | 557,184 | **1,877,120** | +527,872 (+39.12%) |
| SDSA R0 + state-embed (K=2) | 329,984 | 557,440 | **1,877,376** | +528,128 |
| SDSA K=3 router (bias-free) | 330,112 | 557,184 | **1,877,632** | +528,384 |
| A7 capacity-neutral (2 × h=256 + router) | 198,400 | 557,184 | **1,350,784** | +1,536 (+0.114%) |

Formulas: layer = 128 (ln1) + 49,536 (QKV) + 16,512 (attn proj) + 128 (ln2) + FFN block(s) + router; FFN(h, bias) = 257·h + 128; router = 128·K (bias-free). Embeddings = 524,288 (token) + 32,768 (pos) + 128 (final norm).

## Appendix B — Per-run artifact contract

Every SDSA-family run must write to `artifacts/experiments/<EXP-ID>/`: `config.json` (full ModelConfig incl. SDSA fields), `metrics.json`, `log.jsonl` (incl. periodic gate statistics), `training_metadata.json` (incl. λ, β, seed, register-label policy, control ID it is compared against), `evaluation_results.json`, `eval_per_register.json` (per-register token counts + PPL), `gate_stats.json` (final per-layer gate histograms per register subset). Missing artifacts = run is void for decision purposes. The results report must state, verbatim, whether each claim passed or failed its pre-registered threshold.
