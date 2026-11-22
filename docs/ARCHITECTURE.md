# Platform Architecture

## Overview

```
┌────────────────────────────────────────────────────────────────┐
│                        Browser (SPA shell)                     │
│  Sidebar/Topbar/Footer + 11 client views (AR-RTL / EN-LTR)     │
└───────────────▲────────────────────────────────▲───────────────┘
                │ fetch (JSON)                   │ SSE stream
┌───────────────┴────────────────────────────────┴───────────────┐
│                     Next.js 16 (App Router)                    │
│  /api/models  /api/experiments  /api/datasets  /api/benchmarks │
│  /api/keys  /api/system  /api/activity  /api/inference         │
│  /api/chat (SSE)  /api/chat/sessions  /api/system/reset        │
└───────────────▲────────────────────────────────────────────────┘
                │ Prisma Client
┌───────────────┴────────────────────────────────────────────────┐
│                SQLite (file:./db/custom.db)                    │
│  AiModel · Experiment · LossPoint · Dataset · Benchmark        │
│  ApiKey · ChatSession · ChatMessage · ActivityLog · SystemMetric│
└────────────────────────────────────────────────────────────────┘
```

### Key decisions

| Decision | Rationale |
|---|---|
| Single user route + client view switch (`useNav` store) | One coherent studio experience; deep links via nav payload |
| REST API routes instead of server actions | Keeps the data plane explicit and testable, mirrors the future public API |
| TanStack Query for server state | Polling-driven "live" dashboard (10–20s) with cache invalidation on mutations |
| Live drift on running experiments | Stateless computation anchored on `updatedAt` — the dashboard reflects a moving process without cron jobs |
| Custom SVG charts | Loss curve/ring/meters are small, dependency-free and RTL-safe |
| AR-first with language provider | `<html dir>` switched at runtime; dictionaries are per-view modules merged in `src/lib/i18n` |
| SQLite now, PostgreSQL later | Zero-config research deployments; migration path documented in ARCHITECTURE_DECISIONS (ADR-005) |

### Demo engine boundary

`src/lib/demo-engine.ts` is a deterministic rule-based responder used by `/api/chat` and `/api/inference`. It exists to exercise the streaming/UX paths while real weights are in training. It:

- never calls any external model API,
- is always labeled (`demo: true`, engine id/version),
- respects generation params where meaningful (max tokens truncation).

### Data model (Prisma)

- **AiModel** — foundation + specialized family with honest statuses (`planned|planning|training|experimental|debug`).
- **Experiment / LossPoint** — runs with config (optimizer, LR, batch, seq len, precision, seed) and per-step losses.
- **Dataset** — registry with license/provenance, quality, dedup ratio and splits.
- **Benchmark** — suite matrix; measured scores only where evaluation actually ran.
- **ApiKey / ChatSession / ChatMessage / ActivityLog / SystemMetric** — platform state.

### Frontend conventions

- Statuses map to a single `StatusBadge` (filled green for active states, muted for planned, red for failed).
- Numeric cells use the `.num` class + `dir="ltr"`.
- Logical CSS properties everywhere (`ms-/me-`, `text-start`) so both directions render correctly.
- Sticky footer status bar (`mt-auto`) with engine versions and last-update timestamp.

## Model research direction (SDSA)

1. **Baseline**: Decoder-Only autoregressive transformer written in project code (token embeddings, causal self-attention, FFN, residuals, RMSNorm) trained with next-token prediction.
2. **SDSA (experimental)**: dual learned states (language representation + structured world state) with trainable fusion and an auxiliary state-prediction head.
3. **Adoption gate**: matched evaluation (similar params, FLOPs, data) must show reproducible benefit; latency/VRAM overhead must stay acceptable.
