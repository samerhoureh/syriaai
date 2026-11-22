# Model Card: SYRIA AI Debug (syria-ai-debug)

## Model Details

| Field | Value |
|---|---|
| Model ID | `syria-ai-debug` |
| Version | v0.1.0 (release scheme `syria-ai-debug-v0.1.0-exp001`; see [docs/MODEL_DISTRIBUTION.md](docs/MODEL_DISTRIBUTION.md)) |
| Provenance experiment | EXP-001 |
| Architecture | `decoder-only-baseline` (custom, built from scratch — no pretrained weights) |
| Trainable parameters | **1,349,248** (source: `training_metadata.json`, metrics init log) |
| Status | `TRAINED (debug scale)` (source: `evaluation_results.json`, `honest_status`) |
| Checkpoint step | 1200 (of 1200) |
| Checkpoint saved at | 2026-11-22T14:55:57Z (checkpoint metadata) |
| Trained at | 2026-11-22T14:55:58Z (`training_metadata.json`) |
| Package | `syria_ai` 0.2.0 |
| Repository | github.com/samerhoureh/syriaai |
| Weights license | Apache License 2.0 (see root `LICENSE`) |
| Checkpoint SHA-256 | `448a297df2c0d9afc9a7cc0a283f45bab5d6da377daa26ba325709195f43f541` |

## Architecture

All values from `syria-ai-core/artifacts/models/syria-ai-debug/config.json`:

| Field | Value |
|---|---|
| `arch_name` | `decoder-only-baseline` |
| `vocab_size` | 4096 |
| `block_size` (context) | 256 |
| `n_layer` | 4 |
| `n_head` | 4 |
| `n_embd` (d_model) | 128 |
| `ffn_mult` | 4 |
| `dropout` | 0.1 |
| `bias` | true |
| `norm` | rmsnorm |
| `weight_tying` | true |
| `activation` | gelu-tanh |

The transformer, tokenizer, data pipeline, training loop and inference engine were all implemented and trained inside this repository from scratch. No pretrained weights were loaded and no external model was called at any point.

## Intended Use

- **In scope:** research and engineering artifact. EXP-001 proves the full neural pipeline of the project (architecture, tokenizer, data engine, training loop, checkpoint reload, inference) end to end with real trained weights. It is suitable for verifying download/integrity, running the local inference engine, developing clients against the FastAPI service, and reproducing the training run.
- **Out of scope:** production language modeling of any kind. This is a 1.35M-parameter debug model trained on a small experimental corpus; outputs are mostly incoherent by design. It must not be used for user-facing text generation, factual question answering, code generation, translation, or any decision-making. The project's own quality note (verbatim from `evaluation_results.json`):

  > "Debug-scale model: outputs are mostly incoherent by design. This run proves the neural pipeline, not language quality."

## Training Data

Training used dataset **SDS-001 — "SYRIA AI Debug Corpus" v1.0.0** (built 2026-11-21T07:16:55Z; source: `data/processed/dataset_stats.json`). The raw corpus is 782,383 bytes (~782 KB) / 163,411 words (25,224 unique). 652 documents were imported — 266 from `ar.wikipedia.org`, 126 from `en.wikipedia.org`, and 171 project-authored synthetic seeds (`SYRIA-AI-Project/synthetic-seed`) — of which 89 were rejected by validation, leaving 563 validated documents (0 duplicates removed; 2 privacy redactions applied). Language mix: 383 Arabic, 126 English, 54 mixed. Licensing: 392 documents under CC BY-SA 4.0 (Wikipedia-derived) and 171 Project-Authored. The dataset policy explicitly forbids external AI-generated data ("external_ai_generated_data": "FORBIDDEN — none used").

The SYRIA TOKENIZER (byte-level BPE, id `syria-tokenizer`, version 1.0.0) was trained from scratch on this corpus: 3832 learned merges, vocab 4096 (8 special tokens + 256 byte coverage). Encoded splits: train 230,168 tokens (529 sequences), valid 10,043 (22), test 10,484 (12), all uint16 shards.

Per-document attribution is recorded in `syria-ai-core/data/seed_corpus/ATTRIBUTION.md`; machine-readable dataset statistics are in `syria-ai-core/data/processed/dataset_stats.json`. Larger registered corpora (planned/future use) are catalogued in `docs/DATASET_REGISTRY.md`.

## Training Provenance

- **Experiment:** EXP-001 (only training run to date; `resumed_from_step: null`).
- **Command:** `python3 scripts/train_debug.py --steps 1200 --seed 42`.
- **Hardware:** CPU only — 2 logical threads (`hardware.threads: 2`), device `cpu`, `"message": "No GPU detected"`. No GPU, no distributed training, no bf16. Training environment: Linux x86_64, 4.06 GB RAM (per `docs/TRAINING_REPORT_EXP-001.md`).
- **Duration:** 469.5 seconds (source: `training_metadata.json` / `metrics.json`), throughput 5,234.3 tokens/sec.
- **Random seed:** 42 (all runs reproducible from this seed; RNG state stored in checkpoint).
- **Optimizer:** AdamW with warmup + cosine LR decay and gradient clipping (`"optimizer": "AdamW (warmup + cosine decay, grad clip 1.0)"`).

Full hyperparameters from `metrics.json` (`config` block):

| Parameter | Value |
|---|---|
| `exp_id` | EXP-001 |
| `batch_size` | 8 |
| `grad_accum` | 1 |
| `max_steps` | 1200 |
| `lr` | 0.003 |
| `min_lr_ratio` | 0.1 |
| `warmup_steps` | 60 |
| `weight_decay` | 0.01 |
| `grad_clip` | 1.0 |
| `betas` | [0.9, 0.95] |
| `eval_interval` | 120 |
| `eval_batches` | 12 |
| `log_interval` | 10 |
| `checkpoint_interval` | 300 |
| `seed` | 42 |
| `torch_threads` | 2 |
| `train_bin` | `data/processed/shards/train.bin` |
| `valid_bin` | `data/processed/shards/valid.bin` |

Tokens processed during training: 2,457,600.

## Evaluation

All values from `evaluation_results.json` / `metrics.json` (artifact files, not claims):

| Metric | Value |
|---|---|
| First train loss | 8.3441 |
| Final train loss | 3.9207 |
| Validation loss | 4.3299 |
| Best validation loss | 4.3171 |
| Held-out perplexity | **75.35** |

Sample generations (verbatim from `evaluation_results.json`, all noted as "generated from trained weights (quality expected to be weak)"):

1. Prompt: `دمشق`
   Output: `دمشق يوم بس في في السوق في بس في في في وقت.\nفريق الآخر في وقت.\nالسوق طويل، طرطوس في حمص، بس شو صعب الأثمنة`
2. Prompt: `المدرسة`
   Output: `المدرسة في اليوم المدرسة مرتفعة شو الأثمنة بتعلمنا في المدرسة الآخر كنت في بده في كنت رأيك في الأخبار، بس صعب الأخبار، اليوم كنت في`
3. Prompt: `The project`
   Output: `The project of be confertiating is are be and The the and report وإنجليزية be for a يعمل report data إدلب.\nنموذج report data `
4. Prompt: `def add`
   Output: `def adds TSine M); the thetri Jares Ti Ca of "A) (SNio "T5 (UM5"-Ar`

Interpretation (from `docs/TRAINING_REPORT_EXP-001.md`): the model learned real language structure from weights (connected Arabic/dialect phrases such as "شو الأثمنة بتعلمنا", "في السوق"), but quality is weak and repetitive by nature for a 1.3M-parameter model trained on 230K tokens. The run validates the neural pipeline, not language quality.

## Limitations

1. **Output quality:** outputs are mostly incoherent by design at debug scale; not usable for any real text task.
2. **Vocabulary:** only 4096 BPE tokens — limited coverage; rare Arabic dialect words, names and code identifiers fragment heavily.
3. **Context:** 256-token block size — no long-document or conversation capability.
4. **Dialect data scarcity:** trained on a 782 KB raw experimental corpus; Syrian/Levantine dialect coverage is thin and the model memorizes/repeats frequent training phrases (memorization risk is high at this scale).
5. **Single run:** one experiment (EXP-001); no architecture comparisons, no scaling data.
6. **Hardware scope:** trained and evaluated on CPU only; no GPU-specific results exist ("No GPU detected").
7. Larger family members (Nano 50M / Mini 150M / Base 1B / Pro 3B) are **PLANNED, not trained** — no weights exist for them (source: `artifacts/registry/model_registry.json`, `docs/PROJECT_STATUS.md`).

## License

- **Model weights, code, and this card:** Apache License 2.0 — the root `LICENSE` file of the repository contains the full Apache License, Version 2.0, January 2004 text. Redistribution must comply with its notice/redistribution conditions (Sections 4 and 6).
- **Training data:** Wikipedia-derived content (392 documents) is CC BY-SA 4.0; 171 synthetic-seed documents are Project-Authored. Licenses are enforced at ingestion ("licenses_enforced": ["CC BY-SA 4.0", "Project-Authored"], policy: "no external AI-generated data; licenses enforced"). Attribution pointer: `syria-ai-core/data/seed_corpus/ATTRIBUTION.md`. Users redistributing outputs or derivatives built on the CC BY-SA 4.0 portion must respect that license's attribution and share-alike terms.

## Versioning and Compatibility Bindings

- **Tokenizer binding:** this checkpoint is valid only with tokenizer `syria-tokenizer` version **1.0.0** (vocab_size 4096, 3832 merges — recorded in `tokenizer.json` and `training_metadata.json`). The inference engine enforces this on load: a tokenizer with a different vocab size raises `ValueError: tokenizer/model mismatch: checkpoint vocab ... != tokenizer vocab ...`.
- **Config binding:** `config.json` on disk must match the `model_config` embedded in `checkpoint.pt`; otherwise the engine raises `ValueError: config.json disagrees with checkpoint model_config`.
- **Checkpoint version:** step 1200 (final step), `format_version` field present in checkpoint, `saved_at` 2026-11-22T14:55:57Z.
- **Dataset version:** SDS-001 v1.0.0.
- Verify any downloaded copy against the SHA-256 hashes in [docs/MODEL_DISTRIBUTION.md](docs/MODEL_DISTRIBUTION.md) before use.
