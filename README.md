<div align="center">

<img src="public/syria-logo.svg" width="72" alt="SYRIA AI logo" />

# SYRIA AI — Research Platform

**Independent, open-source Syrian foundation models — trained from scratch, served by our own stack.**

منصة تطوير وتدريب وإدارة نماذج الذكاء الاصطناعي السورية المستقلة

[Website](https://www.syriaai.org) · [Research Center](docs/PROJECT_STATUS.md) · [Roadmap](docs/ROADMAP.md) · [Report an issue](https://github.com/samerhoureh/syriaai/issues)

[![CI](https://github.com/samerhoureh/syriaai/actions/workflows/ci.yml/badge.svg)](https://github.com/samerhoureh/syriaai/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-green.svg)](LICENSE)
![Status: Research](https://img.shields.io/badge/status-research_v0.1-0E9F52)

`العربية` · `English`

</div>

---

## What is this?

SYRIA AI is an independent Syrian initiative to build **original Arabic foundation models** that are designed, trained and served entirely inside a stack we develop ourselves — from our own data engine and tokenizer to the training and inference engines.

**This repository contains the official web platform**: a bilingual (Arabic-first RTL / English LTR) research dashboard and developer portal for the program — the Training Studio described in [Phase 9](docs/ROADMAP.md) of the project roadmap.

> **Honest status (Phase B).** The first original neural model — **SYRIA AI Debug (~1.35M params)** — has been built and trained **from scratch** in this repo (experiment EXP-001: 1,200 steps, 2.46M tokens, loss 7.77 → 3.92, checkpoint verified + reloaded in an independent process). It proves the neural pipeline, **not** language quality. `Nano (50M)`, `Mini (150M)`, `Base (1B)` and `Pro (3B)` are **PLANNED** — none of them has been trained, and no weights exist for them. The platform strictly separates `REAL` (from real artifacts/training logs), `DEMO` (labelled synthetic presentation data) and `UNAVAILABLE` (e.g. `No GPU detected`) states, and never fabricates training progress or GPU numbers. No external LLM is called anywhere in this codebase.

## Highlights

- **Research dashboard** — REAL hardware telemetry (CPU/RAM from the OS, honest `No GPU detected`), real training metrics from the Python engine, data-pipeline funnel (DEMO-labelled), quick actions.
- **Training studio** — wired to the real SYRIA TRAINING ENGINE (Python/PyTorch): start/stop a genuine debug training run, watch the actual loss curve from training logs, inspect checkpoints and automated test reports.
- **Dataset registry (SYRIA DATA ENGINE)** — licensed corpora with quality scores, dedup ratios, train/valid/test splits and import workflow.
- **Benchmark suite** — SYRIA BENCHMARK SUITE matrix with honest "not measured yet" states and methodology notes.
- **Inference playground** — sampling parameters (temperature, top-p, top-k, max tokens) against either the **real neural weights** (FastAPI inference service, port 3010) or a clearly-labelled rule-based demo engine.
- **SYRIA AI Chat** — streaming chat with sessions, persisted history, markdown rendering and stop-generation.
- **API console** — key lifecycle (create/revoke), tiers, rate limits and endpoint documentation with SDK snippets.
- **Developer portal & research center** — quickstart, contribution paths, 13-phase roadmap, architecture decision records.
- **Admin console** — engine status, least-privilege permission matrix, activity log and demo-data reset.
- **Bilingual by design** — Arabic (default, RTL) and English (LTR) with a persistent toggle; dark (default) and light themes.

## Screenshots

<div align="center">
<img src="public/images/hero-syria.png" alt="SYRIA AI dashboard banner" width="800" />
</div>

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) + Lucide icons |
| State | Zustand (navigation) + TanStack Query (server state) |
| Database | Prisma ORM + SQLite (zero-config; PostgreSQL is the documented migration path) |
| i18n | Custom lightweight AR/EN dictionary with RTL/LTR switching |
| Charts | Dependency-free custom SVG primitives (loss curve, progress ring, meters) |

## Getting started

```bash
# 1. Clone
git clone https://github.com/samerhoureh/syriaai.git
cd syria-ai-platform

# 2. Install dependencies (bun recommended)
bun install

# 3. Configure environment
cp .env.example .env

# 4. Create the database schema and seed demo data
bun run db:push
bun prisma/seed.ts

# 5. Run
bun run dev          # http://localhost:3000
```

`npm`/`pnpm` work as well (`npx prisma db push` etc.).

## Project structure

```
src/
├── app/
│   ├── api/                 # REST endpoints (models, experiments, datasets,
│   │                        #   benchmarks, keys, system, activity, chat, inference)
│   ├── layout.tsx           # Root layout (fonts, metadata, providers)
│   ├── page.tsx             # Single-entry platform shell
│   └── globals.css          # SYRIA AI design tokens (dark/light, RTL)
├── components/
│   ├── syria/
│   │   ├── shell.tsx        # Sidebar, topbar, command palette, status-bar footer
│   │   ├── views/           # 11 platform views (dashboard, models, experiments, ...)
│   │   ├── charts.tsx       # Custom SVG chart primitives
│   │   ├── language-provider.tsx
│   │   └── ui-bits.tsx      # Status badges, section cards, flag, headers
│   └── ui/                  # shadcn/ui components
└── lib/
    ├── i18n/                # AR/EN dictionaries (one file per view)
    ├── db.ts                # Prisma client
    ├── seed.ts              # Idempotent demo/research seed data
    ├── demo-engine.ts       # Local rule-based demo inference engine (no external LLM)
    ├── types.ts / api.ts / format.ts / store.ts
prisma/schema.prisma         # Data model (SQLite)
docs/                        # Project & research documentation
```

## API overview

All endpoints return `{ ok: true, data }` or `{ ok: false, error }`.

| Endpoint | Methods | Description |
|---|---|---|
| `/api/models` | GET | Foundation + specialized model family |
| `/api/experiments` | GET, POST | Experiments list (live drift for running runs), create |
| `/api/experiments/[id]` | GET, PATCH | Details incl. loss points; start/pause/resume/stop |
| `/api/datasets` | GET, POST | Dataset registry; register new corpus (status: review) |
| `/api/benchmarks` | GET | SYRIA BENCHMARK SUITE matrix |
| `/api/keys` | GET, POST | API keys; `/api/keys/[id]` DELETE to revoke |
| `/api/system` | GET | Engines, metrics, pipeline, status |
| `/api/activity` | GET | Recent platform events |
| `/api/chat` | POST (SSE) | Streaming chat via the local demo engine |
| `/api/chat/sessions` | GET, POST | Sessions; `[id]` GET/PATCH/DELETE |
| `/api/inference` | POST | Non-streaming playground inference + metrics |
| `/api/system/reset` | POST | Re-seed demo data (admin) |

## Principles

1. **Original weights only.** No checkpoint loading, no pre-trained embeddings, no distillation, no fine-tuning of external models.
2. **Independent tokenizer and data engine.** The tokenizer is trained on project data; every dataset has a documented source and license.
3. **No external LLMs.** The platform and its demo engine never call third-party models.
4. **Honest statuses.** Planned/queued/training states are explicit; unmeasured benchmarks show no scores; simulated features are labeled.
5. **Reproducibility.** Seeds, configurations, checkpoints and evaluation sets are recorded per experiment.

## Documentation

- [Project status](docs/PROJECT_STATUS.md) — current phase, deliverables, what works
- [Roadmap](docs/ROADMAP.md) — PHASE 0 → 12 execution plan
- [Architecture](docs/ARCHITECTURE.md) — platform design & SDSA research direction
- [Model registry](docs/MODEL_REGISTRY.md) — the Nano/Mini/Base/Pro family
- [Dataset registry](docs/DATASET_REGISTRY.md) — SYRIA DATA ENGINE corpora
- [Publishing guide](docs/PUBLISHING.md) — how this repository is published to GitHub
- [README بالعربية](README.ar.md)

## Contributing

We welcome research and engineering contributions — see [CONTRIBUTING.md](CONTRIBUTING.md). By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md). Security issues: [SECURITY.md](SECURITY.md).

## License

Source code: **Apache-2.0** — see [LICENSE](LICENSE). Model weights and datasets, when released, are published under their own documented terms (research-review first).

---

<div align="center">
<sub><b>SYRIA AI</b> — Open-Source AI for Syria · ذكاء اصطناعي مفتوح المصدر من أجل سوريا</sub>
</div>
