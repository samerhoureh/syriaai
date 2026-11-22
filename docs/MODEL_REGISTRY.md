# Model Registry — SYRIA AI Foundation Family

All configurations are targets; sizes may shift with measured compute/memory/data constraints. Gating order: Debug → Nano → Mini → Base → Pro.

| Model ID | Params | Status | Purpose | Context | Vocab | Weights |
|---|---:|---|---|---:|---:|---|
| `syria-ai-debug` | 10M | Internal check (complete) | System verification: forward/backward/checkpoint/resume | 512 | 8,192 | not published |
| `syria-ai-nano` | 50M | **Experimentally open** | Research & training validation | 1,024 | 16,384 | published for research review |
| `syria-ai-mini` | 150M | **Training — EXP-024 @ 64%** | Early language experiments | 2,048 | 32,768 | pending |
| `syria-ai-base` | 1B | In planning (12%) | Specialized foundation model | TBD | TBD | — |
| `syria-ai-pro` | 3B | Planned | Advanced research target | TBD | TBD | — |

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
