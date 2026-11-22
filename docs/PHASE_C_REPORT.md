# SYRIA AI — Phase C Consolidated Report
## Reproducibility · Security · Scientific Validation · Research Scaling

**Date:** 2026-11-22 · **Scope:** the full Phase C mandate (Priorities 0–7) executed on the existing platform — no UI redesign, no page changes, no history rewrite, no production push to www.syriaai.org.

---

## 1. The headline result

> The EXP-001 debug-model result is now **independently reproduced**: EXP-002 (new random weights, seed 1337, identical data/architecture/hyperparameters) reached validation loss **4.3394** vs EXP-001's **4.3299** — a seed spread of **0.0095**, five times tighter than the pre-registered gate (≤ 0.05). The checkpoint was reloaded in a separate process and generated text from its own weights. A clean clone of the **published** GitHub repository was installed and verified end-to-end in a fresh virtualenv — which caught and fixed a real packaging bug (`psutil` missing from `requirements.txt`).

## 2. Deliverables index (the 12 mandated items)

| # | Mandated deliverable | Where | Status |
|---|---|---|---|
| 1 | Security audit report | `docs/SECURITY_AUDIT.md` | **DONE** — no token in tree/history/machine/artifacts; owner-side revocation documented as the single open action |
| 2 | Fixed docs & install instructions | `README.md`, `README.ar.md` (en/ar now technically identical), `syria-ai-core/README.md` | **DONE** — `cd syriaai` corrected, accurate Neural/Demo mode descriptions replace outdated drift language, Python quickstart + project structure added |
| 3 | Python CI tests + GitHub blocker documentation | `.github/workflows/python-tests.yml` (+ fixed broken trigger in `ci.yml`) | **DONE (workflow)** — runs CPU-only pytest + selftest smoke; **BLOCKED at GitHub**: Actions failing from billing/account lock — owner must resolve, then re-run both workflows to green |
| 4 | Fresh Clone Verification report | `docs/FRESH_INSTALL_VERIFICATION.md` | **DONE** — 2 phases, real commands/outputs; found & fixed the `psutil` packaging bug |
| 5 | Experiment EXP-002 results | `docs/TRAINING_REPORT_EXP-002.md` + `syria-ai-core/artifacts/experiments/EXP-002/` | **DONE** — 1,200 steps from scratch, seed 1337, valid 4.3394, ppl 76.23 |
| 6 | Weight reload + inference tests | `artifacts/proofs/reload_generation_proof_exp002.json` + `tests/test_robustness.py` | **DONE** — strict reload in an independent process, generation from reloaded weights, 55/55 tests pass |
| 7 | Data & license audit | `docs/DATASET_REVIEW.md` | **DONE** — splits proven disjoint, unique-vs-processed tokens quantified (230,168 vs 2,457,600 ≈ 10.7 epochs), CC BY-SA obligations documented, dialect share honestly measured at 5.8% |
| 8 | Scaling plan to Nano | `docs/SCALING_PLAN.md` | **DONE** — verified parameter formula, 5M/15M intermediate stages, Nano verdict: NOT feasible on 2-CPU (117–273 days); cloud-GPU path with go/no-go gates G1–G3 |
| 9 | SDSA Research Protocol | `docs/SDSA_RESEARCH_PROTOCOL.md` | **DONE** — falsifiable H1, exact math, parameter-matched control (+0.082%), ablation matrix, gates G0–G3; no training before gates |
| 10 | Model download & run instructions | `MODEL_CARD.md` + `docs/MODEL_DISTRIBUTION.md` | **DONE** — SHA-256 verification tables, local/API/Python/JS integration, redeploy-without-retraining procedure, Release-Assets policy for future large models |
| 11 | Updated Model Registry & Project Status | `docs/MODEL_REGISTRY.md`, `docs/PROJECT_STATUS.md`, `syria-ai-core/artifacts/registry/model_registry.json` | **DONE** — stale demo rows (10M debug, EXP-024 @64%, "nano experimentally open") replaced with artifact-backed statuses |
| 12 | Completed / Planned / Resource-blocked report | §4 below | **DONE** |

## 3. Key engineering changes in this phase

- `scripts/train_debug.py`: `--exp-id`, `--deploy/--no-deploy`, `--notes` (EXP-001 default behavior preserved).
- FastAPI `/v1/training/start`: accepts `exp_id` (validated charset) and `deploy`; status reports the active experiment — Training Studio can now launch named verification runs.
- `src/lib/neural-service.ts`: `NEURAL_SERVICE_URL` override + `NEURAL_AUTOSTART=0` production posture (probe-only, honest `MODEL_NOT_READY`) — the inference engine is now explicitly an independent service, never a per-request interpreter.
- `requirements.txt`: `psutil>=5.9` added (fresh-install bug fix).
- `.github/workflows/ci.yml`: repaired trigger (`branches: [main]`); new `python-tests.yml` (setup-python 3.12, CPU torch, pytest `-v`, selftest smoke).
- Hygiene: `__pycache__` and sandbox `tool-results/` untracked + ignored; unused `z-ai-web-dev-sdk` dependency removed from `package.json`/`bun.lock`; `.gitignore` extended (`.venv/`, `*.pyc`, `/db/`).
- `docker-compose.yml` + 2 Dockerfiles + entrypoint (written, not executable in this sandbox — labelled as such).
- New tests: `tests/test_robustness.py` — validation-leakage disjointness, generation-is-weight-driven (perturbation + seed tests), bit-equal checkpoint round-trip (model + optimizer), exact resume (RNG + optimizer + step), streaming/batch agreement, tokens-per-sec & perplexity math. Suite: **51 → 55 tests, all passing** in the dev environment AND in the fresh clone.

## 4. What is COMPLETED / PLANNED / BLOCKED (mandate item 12)

**COMPLETED (with test evidence):**
1. Original neural core (decoder-only transformer, from scratch) — EXP-001 + EXP-002.
2. Original tokenizer (BPE from scratch, 4096 vocab) — round-trip tests.
3. Data engine — cleaning, dedup, privacy filter, deterministic disjoint splits (proven), packing.
4. Training engine — AdamW + warmup/cosine, checkpointing, exact resume, CPU monitoring.
5. Inference engine + FastAPI service — load, generate, stream, cancel, MODEL_NOT_READY honesty.
6. Platform bridge — real/demarcated REAL/DEMO/UNAVAILABLE states, lifecycle contract.
7. Verification: two-seed reproducibility, reload proofs, 55/55 tests, fresh-install evidence.
8. Documentation set (audit, review, plan, protocol, card, distribution, status).

**PLANNED (designed, not started — no false claims):**
1. Intermediate models 5M / 15M per `SCALING_PLAN.md` (both RAM-feasible locally; 5M needs no new data gate beyond corpus growth; 15M hard-gated at ≥10M unique tokens).
2. SDSA prototype & ablation matrix — strictly gated behind G1+G2+G3 of the protocol.
3. Nano 50M — config corrected to L=13 (≈49.88M; the previous `nano_config` was silently 34.1M), gated at ≥100M unique tokens + dialect ≥10% + GPU budget decision.

**BLOCKED BY RESOURCES / EXTERNAL ACTIONS (explicitly not bypassed):**
1. **GitHub Actions green runs** — blocked by the account billing/lock state (owner action). Both workflows are ready; re-run and require green after billing is fixed. No attempt was made to circumvent the restriction.
2. **Push of the Phase C commit (`65bd272`) to GitHub** — the previously used PAT is treated as exposed and is not reused; no credential store exists on this machine; `gh` CLI is unavailable. **The owner must revoke the old token, then push from an authenticated environment** (`git push origin main`) or via a fresh fine-scoped token delivered outside chat. Everything is committed and push-ready; nothing destructive is required (fast-forward on `main`).
3. **Nano-scale training compute** — 117–273 CPU-days on this host; requires the cloud-GPU budget decision documented in the scaling plan (est. $20–200 for the full gate package on one modest GPU instance).
4. **Docker stack execution** — no Docker daemon in this sandbox; compose files provided with the manual equivalent already verified.
5. **Git history cleanup of `.pyc`/`tool-results/` blobs** — requires owner-approved filter-repo + force push (explicitly not done; low sensitivity, no secrets inside).

## 5. Honesty ledger

- Every number in the new documents is either measured from artifacts or explicitly labelled ESTIMATE (scaling plan).
- The debug model's outputs remain mostly incoherent — stated in the model card, training reports, and README; nothing presents the debug model as a usable language model.
- Known doc discrepancies found by the audit (EXP-001 duration/first-loss/checkpoint-bytes mismatches; stale registry rows; core-README param count; SDSA doc's missing-scaling-plan flag) were corrected rather than hidden.
- The auto-generated commit `8b99fc4` (UUID subject, created by the development environment mid-session) is noted; squashing it later is an owner decision requiring history rewrite approval.

## 6. Recommended owner actions (in order)

1. **Revoke the old GitHub PAT** (Settings → Developer settings → Fine-grained tokens) — it is considered exposed regardless of scan results.
2. **Resolve the GitHub Actions billing/account lock**, then re-run `ci.yml` and `python-tests.yml`; require green before further merges.
3. **Push the Phase C commit**: from any authenticated environment — `git clone https://github.com/samerhoureh/syriaai.git && cd syriaai && git pull && git merge <this-commit>` or simply push from the dev checkout once credentials are configured locally (e.g. `gh auth login`). Fast-forward, no force.
4. (Optional, owner-approved history rewrite) remove `.pyc`/`tool-results/` blobs from early commits with `git filter-repo`, then force-push **with** the documented caveats.
5. Decide the cloud-GPU budget line for the 15M → Nano gate (scaling plan §6) **only after** the ≥10M unique-token data gate is met.

---

**SYRIA AI** — https://www.syriaai.org — نُهندس الذكاء لمستقبل سوريا.
