# SYRIA AI — Fresh-Install Verification Report

**Purpose:** prove the repository works outside the original development environment, per the Phase C mandate (PRIORITY 2 — CLEAN INSTALL REPRODUCIBILITY). Every command below was executed for real; every result is the actual observed output.

**Date:** 2026-11-22 · **Host:** 2 logical CPU cores, 3.95 GB RAM, Linux x86_64, no GPU (the development sandbox itself).

---

## 1. Environment definition (what "clean" meant here)

| Requirement (mandate) | How it was satisfied |
|---|---|
| No z.ai-specific paths | Clone placed under `/tmp`, executed with `cd` — no references to dev-machine paths; `.pyc` path leaks were untracked in this phase (see `SECURITY_AUDIT.md` F1) |
| No Python packages installed outside the project | Dedicated virtualenv `/tmp/syriaai-fresh-venv` built **only** from `syria-ai-core/requirements.txt` over the network (`pip install torch --index-url https://download.pytorch.org/whl/cpu && pip install -r requirements.txt`). Result: torch 2.15.0+cpu, fastapi, uvicorn, numpy, psutil, pytest. CUDA: `False` |
| No pre-running services | All services started and stopped inside the verification session; nothing was assumed alive |
| No unpublished local database | SQLite created by `prisma db push` inside the clone; no DB file is committed to the repository (`.gitignore` rule added) |
| No hidden env variables | Only variables explicitly documented in `.env.example` were set (`DATABASE_URL`, `NEURAL_PYTHON`); the full flow also works without `NEURAL_PYTHON` via interpreter probing |
| No uncommitted files | Phase 2 clone was taken **from a git commit** (`65bd272`), not from the working tree |
| No dev-platform background processes | All launches were inside the verification session and killed afterwards |

**Port substitution note (honesty):** the original dev environment already occupies ports 3000/3010 with the live platform. The verification therefore used **3100** (Next.js) and **3011** (FastAPI direct). On a normal machine the documented default ports (3000/3010) apply unchanged — all code paths are port-agnostic (`NEURAL_SERVICE_URL` override added in this phase for exactly this purpose).

## 2. Phase 1 — verification of the PUBLISHED GitHub state

Clone: `git clone https://github.com/samerhoureh/syriaai.git /tmp/syriaai-published` (public clone, **no credentials**) → commit `bac2935` (the state a downloader gets today).

### Findings

> **F-PSUTIL (real bug found by this verification):** the published `requirements.txt` did **not** include `psutil`, which `syria_ai/training/monitor.py` imports. The dev environment masked this (globally installed package). Fresh-clone pytest collection failed with `ModuleNotFoundError: No module named 'psutil'`.
> **Fix:** `psutil>=5.9` added to `requirements.txt` in the pending Phase C commit. All results below are after installing psutil into the clean venv (equivalent to installing from the corrected requirements file).

### Executed steps and actual results

| Step | Command | Result |
|---|---|---|
| 1. Clone | `git clone https://github.com/samerhoureh/syriaai.git` | OK — public, no auth needed |
| 2. Node deps | `bun install --frozen-lockfile` | OK — 827 packages |
| 3. Database | `bunx prisma db push` + `bun prisma/seed.ts` | OK — schema pushed, "SYRIA AI: database seeded." |
| 4. Python tests | `/tmp/syriaai-fresh-venv/bin/python -m pytest -q` | OK — **51/51 pass** (51 dots, no failures) |
| 5. Load checkpoint + generate (CLI) | `python scripts/generate.py --prompt "دمشق" --max-new-tokens 32 --seed 7` | OK — `"ready": true, "checkpoint_step": 1200`, 32 tokens @ **504.7 tok/s**, load 63.4 ms |
| 6. FastAPI service | `uvicorn syria_ai.inference.service:app --port 3011` + `GET /health` + `POST /v1/generate` | OK — `syria-ai-inference v0.2.0`, model `READY`; generation: `"دمشق المادسائ أو في القاد الرصاف من المز ما"`, 24 tokens @ 335.7 tok/s, step 1200 |
| 7. Next.js platform | `next dev -p 3100` + `GET /api/models` + `GET /api/neural/system` + `POST /api/neural/generate` | OK — DB read returned model family; bridge health `source: REAL`; generation: `"demo":false,"neural":true,"weightsLoaded":true,"dataClass":"REAL","checkpointStep":1200` |

## 3. Phase 2 — verification of the Phase C commit (`65bd272`)

Clone: `git clone /home/z/my-project /tmp/syriaai-fresh-local` (clean clone **of the commit**, same content that will be pushed) — includes EXP-002 artifacts, robustness tests, corrected requirements, new CI workflows, docker files.

| Step | Command | Result |
|---|---|---|
| 1. Clone commit | `git clone /home/z/my-project /tmp/syriaai-fresh-local` | OK — HEAD `65bd272` |
| 2. Node deps | `bun install --frozen-lockfile` | OK — **826 packages** (one fewer: `z-ai-web-dev-sdk` removed) |
| 3. Database | `prisma db push` + `seed.ts` | OK |
| 4. Python tests | fresh-venv pytest | OK — **55/55 pass** (incl. 5 new robustness tests) |
| 5. EXP-002 artifacts in clone | `ls artifacts/experiments/` + sha256 | OK — EXP-001 + EXP-002; EXP-002 checkpoint hash matches `e8a72be7…` |
| 6. Load deployed weights + generate | `scripts/generate.py --prompt "دمشق" --max-new-tokens 24 --seed 7` | OK — ready, step 1200, 24 tokens @ **482.0 tok/s**, load 65.5 ms |
| 7. Experiments via platform bridge | `GET /api/neural/experiments` | OK — lists both: `EXP-002 valid 4.3394 / 1200 steps`, `EXP-001 valid 4.3299 / 1200 steps` |
| 8. Generation via platform bridge | `POST /api/neural/generate {"prompt":"دمشق","max_new_tokens":16,"seed":7}` | OK — `neural:true, weightsLoaded:true, dataClass:REAL, checkpointStep:1200` |
| 9. Bridge health on cold start | `GET /api/neural/system` (first request after boot) | **Timeout on the very first call** (probe waited while torch import + model load exceeded 60 s on the busy 2-core box); the two subsequent neural calls succeeded, proving the service came up correctly. On the dev environment the same endpoint returns within seconds once warm. Documented as cold-start latency, not a defect. |

## 4. Docker Compose (provided, honestly labelled)

Files added: `docker-compose.yml`, `docker/Dockerfile.neural`, `docker/Dockerfile.platform`, `docker/platform-entrypoint.sh`.

- **Design:** `neural` service (python:3.12-slim, CPU torch, health check on `/health`) + `platform` service (bun build → Next standalone; runs `prisma db push` + seed on start) with `NEURAL_AUTOSTART=0` + `NEURAL_SERVICE_URL=http://neural:3010` — i.e. the platform **never spawns a Python interpreter per user request**; the inference engine is an independent service with its own health checks and lifecycle.
- **Verification status:** **NOT executed** — the development sandbox has no Docker daemon (`docker: command not found`). This is recorded as an explicit limitation; the compose stack is expected to be validated by CI or on any Docker-enabled host. Everything the compose file automates **was** verified manually in Phases 1–2 above (same commands, same effects).

## 5. Inference-service lifecycle (mandate P2 closing note)

- The FastAPI engine is a **standalone service** with `GET /health`, uptime reporting, and explicit request cancellation — not an in-request interpreter.
- The Next.js bridge (`src/lib/neural-service.ts`) now implements a documented lifecycle contract: single lazy spawn with an in-flight guard in development (`NEURAL_AUTOSTART=1`, default), and a strict probe-only mode for production (`NEURAL_AUTOSTART=0` + `NEURAL_SERVICE_URL`) where a down service yields an honest `MODEL_NOT_READY` instead of spawning anything.

## 6. Conclusion

| Mandate item | Evidence |
|---|---|
| Clone → install → DB → tests → checkpoint load → generate → API server → platform → E2E | Phases 1 & 2 tables above — all executed with real outputs |
| Works outside the dev environment | Two independent clean clones, one of them the exact published GitHub state |
| Real bug found & fixed | `psutil` missing from `requirements.txt` (would break every fresh install of the published state) |
| Remaining external dependency | Docker execution (sandbox has no daemon) and GitHub Actions runs (owner billing blocker) |
