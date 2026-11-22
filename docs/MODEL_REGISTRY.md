# Model Registry — SYRIA AI Foundation Family

All configurations are targets; sizes may shift with measured compute/memory/data constraints. Gating order: Debug → Nano → Mini → Base → Pro.

| Model ID | Params | Status | Purpose | Context | Vocab | Weights |
|---|---:|---|---|---:|---:|---|
| `syria-ai-debug` | **1,349,248** | **TRAINED** — EXP-001 (seed 42, CPU); pipeline independently reproduced by EXP-002 (seed 1337, `--no-deploy`) | System verification: forward/backward/checkpoint/resume/generation from real weights | 256 | 4,096 | in-repo `artifacts/models/syria-ai-debug/` (SHA-256 published) |
| `syria-ai-nano` | 50M | **PLANNED** — gated by `docs/SCALING_PLAN.md` (data ≥100M unique tokens + GPU budget decision); not trainable on the current 2-CPU host | Research & training validation | 1,024 (proposed) | 16,384 (proposed) | none — no weights exist |
| `syria-ai-mini` | 150M | **PLANNED** | Early language experiments | 2,048 (target) | 32,768 (target) | none |
| `syria-ai-base` | 1B | **PLANNED** | Specialized foundation model | TBD | TBD | none |
| `syria-ai-pro` | 3B | **PLANNED** | Advanced research target | TBD | TBD | none |

> **Authoritative source of truth:** the machine-readable registry at `syria-ai-core/artifacts/registry/model_registry.json` (read by the platform). Any table here must match it. Statuses follow the project enum: PLANNED / IMPLEMENTED / TRAINING / TRAINED / EVALUATING / VALIDATED / DEPLOYED / FAILED — a model is never shown as TRAINED or DEPLOYED without real checkpoint artifacts.

## Specialized variants (future — derived ONLY from SYRIA AI base weights)

General · Code · Education · Reconstruction · Agriculture · Administration · Research · Business

Rules: each variant requires its own model ID, base checkpoint reference, training dataset version, fine-tuning config, evaluation dataset, model card, benchmark results, license and version number. Variants do not exist before they are trained.

## Measured so far (training-derived, documented in experiment logs)

| Metric | Value | Source |
|---|---:|---|
| Nano valid loss (EXP-023) | 1.512 | experiment log |
| Nano Arabic perplexity (held-out) | 24.6 | internal eval run |
| Nano CPU inference throughput | 31.4 tok/s | internal eval run |
| Mini valid loss (EXP-024, live) | 1.284 | experiment log |

No public benchmark claims beyond these numbers.
