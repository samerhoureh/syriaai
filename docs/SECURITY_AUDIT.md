# SYRIA AI — Repository Security Audit

**Scope:** full working tree, complete git history, GitHub Actions configuration, artifacts, checkpoints, training logs, dependency manifest, and the local machine state used during publishing.
**Date:** 2026-11-22 · **Auditor:** Phase C security task (automated + manual review)
**Verdict summary:** no live credential is stored in the repository, the git history, the local machine, or any artifact. One exposed token must be revoked by the account owner (external action). Two hygiene issues (tracked `__pycache__` files, auto-committed sandbox artifacts) were found and fixed in this working tree; both remain visible in existing commits — see Residual risks.

---

## 1. Context — the publishing token

A GitHub Personal Access Token was used interactively during the initial publishing session to push this repository to `https://github.com/samerhoureh/syriaai`.

**Policy applied (per project mandate):**

1. The token transited a chat channel and is therefore **considered exposed**, regardless of whether it appears in any scanned surface.
2. The token was **never written to any repository file, log, or document**, and it is **not stored on this machine** (verified below).
3. The token is **not reused** anywhere in this codebase or its workflows. Nothing in the repository authenticates to GitHub.
4. **Revocation is an owner-only action**: revoke the fine-grained token at *GitHub → Settings → Developer settings → Personal access tokens*, and create a replacement with minimal scope (`Contents: Read/Write` on the single `syriaai` repository, no admin scopes, short expiry) delivered through a secure channel — never through chat, and never committed.
5. Git history rewriting is **not** claimed as a substitute for revocation. Revocation invalidates the token immediately; rewriting history only removes traces.

## 2. Scan inventory and results

Every scan below was executed against the working tree and full history (`--all` refs).

| # | Surface | Method | Result |
|---|---|---|---|
| 1 | Working tree — token patterns (`github_pat_…`, `ghp_…`, `gho_…`, `ghs_…`, `ghu_…`, `x-access-token`) | `git grep -i -E` across tracked files | **Clean.** 3 matches are UI placeholder strings (`SK-syria-****`, `sy-your-api-key`, `SK-syria-...`) in API-documentation examples — not credentials. |
| 2 | Git history — the actual publishing token prefix | `git log --all -S "11BTENSHY02X"` | **Not found in any commit.** |
| 3 | Git history — generic token patterns | `git log --all -S "github_pat"` and `-S "ghp_"` | **Not found in any commit.** |
| 4 | Git remote configuration | `git config --local --list`, `.git/config` | **Clean.** `origin` = `https://github.com/samerhoureh/syriaai.git` with **no embedded credentials**; every authenticated push is performed with an ephemeral in-memory token (`x-access-token` URL constructed from an env var, never persisted). No `insteadOf` rewrites. Verified again after the 2026-11-22T22:2xZ push: no `credential`, `token`, `pat` or `password` strings in `.git/config`. |
| 5 | Machine credential stores | `~/.git-credentials`, `~/.netrc`, `~/.config/gh/hosts.yml`, credential-helper config | **All absent.** No credential helper is configured; nothing was cached. |
| 6 | Checkpoints & artifacts (`artifacts/models/syria-ai-debug/*`, `artifacts/experiments/EXP-001/*`) | Manual review of JSON metadata + hash inventory (see `docs/MODEL_DISTRIBUTION.md`) | **No credentials.** Files contain only architecture hyperparameters, training metrics, seeds, timestamps, and file sizes. |
| 7 | Training logs (`artifacts/experiments/*/log.jsonl`, test reports) | Key-level review | **No credentials.** Keys: timestamp, event, step, loss, lr, tokens, tokens/sec, CPU/RAM usage, GPU message. |
| 8 | Environment files | `.gitignore` covers `.env`/`.env.*`; only `.env.example` (a template with no real values) is tracked | **Clean.** |
| 9 | Dependency manifest (`package.json`, `bun.lock`) | Manual review | One dev-environment SDK dependency (`z-ai-web-dev-sdk`) was present but **never imported** anywhere in `src/`. **Removed** from `package.json` and `bun.lock` (supply-chain reduction + environment-neutrality). |
| 10 | Local path disclosure | `git grep "/home/z"` | Matches existed only inside **compiled bytecode** (`__pycache__/*.pyc`) — see finding F1. |
| 11 | GitHub Actions workflows (`.github/workflows/ci.yml`, `python-tests.yml`) | Manual review | **No secrets used, no `secrets.*` context, no third-party actions** — only official actions (`actions/checkout@v4`, `oven-sh/setup-bun@v2`, `actions/setup-python@v5`). Workflows create their own throwaway `DATABASE_URL`; they never read repository secrets. **Fixed:** the trigger branch list in `ci.yml` was malformed (`branches: ain]`) and would never have matched `main`; now `branches: [main]`. |

## 3. Findings and dispositions

### F1 — Compiled bytecode tracked in git (fixed going forward)

- **Finding:** 16 `__pycache__/*.pyc` files were tracked. Python bytecode embeds absolute source paths (`/home/z/my-project/syria-ai-core/...`), leaking the developer's directory layout, and can go stale relative to sources.
- **Disposition:** untracked (`git rm -r --cached`) and ignored via `.gitignore` (`__pycache__/`, `*.pyc`, `.venv/`, `venv/`, `.pytest_cache/`).
- **Residual:** the blobs remain in existing commits (see Residual risks). No secret material is inside them — only source file paths.

### F2 — Sandbox tool artifacts auto-committed (fixed going forward)

- **Finding:** the development environment periodically creates automatic commits (e.g. `8b99fc4` with a UUID subject). One of them captured a `tool-results/` folder of internal tool output that does not belong in a published repository.
- **Disposition:** untracked and added to `.gitignore`. Reviewed for secrets: the files contain file-read extracts of already-public repository content (README sections) — no credentials.

### F3 — Outdated CI trigger (fixed)

- **Finding:** `ci.yml` triggers were corrupted (`branches: ain]`), so the workflow could never run on `main` — this contributed to "CI is failing / never green" observations.
- **Disposition:** corrected to `branches: [main]`; a dedicated Python neural-engine workflow (`python-tests.yml`) was added (CPU-only pytest, no GPU needed).

### F4 — Publishing token lifecycle (owner action required)

- **Status:** token treated as exposed; not present anywhere scannable; **revocation pending on the account owner**. This is the single open security action for this repository.

## 4. Residual risks (honest statement)

1. **History contains the `.pyc` blobs and the `tool-results/` folder** inside commits `42555b5`, `09425b9`, `bac2935`, `8b99fc4`. Removing them requires `git filter-repo` + force-push — a destructive history operation that this audit explicitly did **not** perform, per the project rule "no force push / history rewrite without explicit owner approval". Sensitivity is low (local paths and public-content extracts, no secrets), so revocation of the token is **not** dependent on this cleanup.
2. **GitHub Actions status cannot be verified from this environment** (no authenticated GitHub API access, by design). The billing/account-lock state of Actions is an external blocker the owner must resolve in GitHub billing settings; afterwards the two workflows should be re-run and required to pass (see `docs/PHASE_C_REPORT.md`).
3. **`docs/screenshots/*.png`** are committed UI screenshots of the platform. They contain no credential material (all API-key imagery uses placeholders), but the owner may re-verify them before any future public distribution.

## 5. Rules going forward (binding for this repository)

1. Never store tokens in files, logs, docs, checkpoints, or CI configuration.
2. Authenticate to GitHub only via the owner's local `gh auth login` (keyring-backed) or credential manager — never via chat-transferred tokens, and never embedded in remote URLs.
3. CI uses only official, pinned-by-tag actions and no repository secrets for the current test suite.
4. Any future workflow that needs credentials must use short-lived `GITHUB_TOKEN` with least-privilege `permissions:` blocks.
5. New model-distribution files ship with SHA-256 checksums (`docs/MODEL_DISTRIBUTION.md`) so consumers can verify integrity independently.

## 6. Reproduction commands

```bash
# token patterns in the working tree
git grep -I -n -i -E "github_pat|ghp_[A-Za-z0-9]|gho_[A-Za-z0-9]|x-access-token"

# token patterns across the entire history
git log --all -S "github_pat" --oneline
git log --all -S "ghp_" --oneline

# remote and credential-store hygiene
git config --local --list; ls ~/.git-credentials ~/.netrc ~/.config/gh 2>/dev/null

# local-path disclosure (should now be empty of tracked matches)
git grep -l "/home/z" -- .

# workflows under audit
cat .github/workflows/ci.yml .github/workflows/python-tests.yml
```


## 7. Publishing events log (this machine)

| UTC time (2026-11-22) | Event | Auth method | Persistence of credential |
|---|---|---|---|
| earlier session | Initial publishing of the repository (up to `bac2935`) | Interactive fine-grained PAT (owner-operated) | None — not stored on disk |
| ~22:20Z | Push `bac2935..947ac57` (Phase C deliverables + EXP-001 reproduction evidence) via `git push` to `origin` | Fine-grained PAT supplied in-chat by the owner, held **only** in a shell env var for the duration of the command | **None** — env var unset immediately after push; absent from `.git/config`, logs, and history |

**Standing requirement:** any token shared through a chat channel is treated as exposed. The token used for the ~22:20Z push must be revoked by the owner after this session (GitHub → Settings → Developer settings → Fine-grained tokens), and replacements must be delivered out-of-band only. Revocation — not history rewriting — is the invalidation mechanism.
