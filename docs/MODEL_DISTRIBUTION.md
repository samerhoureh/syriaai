# Model Distribution Guide — SYRIA AI

This guide explains how to **download, verify, and run** the trained SYRIA AI model (`syria-ai-debug`, experiment EXP-001) without retraining anything. For model facts, intended use, and limitations, see [MODEL_CARD.md](../MODEL_CARD.md).

Current distribution status:

| Artifact | Location | Size | Distribution channel (today) |
|---|---|---|---|
| Weights (`checkpoint.pt`) | `syria-ai-core/artifacts/models/syria-ai-debug/` | 16,256,510 bytes | Inside the git repository |
| Tokenizer (`tokenizer.json`, v1.0.0) | same directory | 131,521 bytes | Inside the git repository |
| Config (`config.json`) | same directory | 290 bytes | Inside the git repository |
| Evaluation (`evaluation_results.json`) | same directory | 1,577 bytes | Inside the git repository |
| Metrics (`metrics.json`) | same directory | 1,282 bytes | Inside the git repository |
| Provenance (`training_metadata.json`) | same directory | 1,356 bytes | Inside the git repository |

Total model directory size: 16,292,536 bytes (~16 MB) — small enough that git is the correct distribution channel for this model.

## 1. Download Options

### 1.1 Today: weights are inside the repository

The full trained model ships with the repo at `syria-ai-core/artifacts/models/syria-ai-debug/`. No extra download step, no external hosting, no accounts.

```bash
# Option A: full clone (recommended — includes code + weights + docs)
git clone https://github.com/samerhoureh/syriaai.git
cd syriaai/syria-ai-core

# Option B: no git — download the repository ZIP from GitHub
#   Code button -> "Download ZIP", then unzip:
#   syriaai-main/syria-ai-core/artifacts/models/syria-ai-debug/
```

After downloading, verify integrity with the SHA-256 hashes in Section 2 before running anything.

### 1.2 Future policy: Release Assets for large models

The Debug model is the last model that will live in git. Per the project owner's mandate:

- **Never commit multi-hundred-MB weights into git history.** The planned Nano (50M), Mini (150M), Base (1B) and Pro (3B) checkpoints would bloat every clone permanently; they must be distributed as GitHub Release Assets only.
- Repo keeps: configs, tokenizer files, evaluation JSONs, metrics, training metadata, model cards (all small text/JSON files).
- Release keeps: binary checkpoints (`checkpoint.pt`) plus a `SHA256SUMS` manifest.

**Versioned release naming scheme:** `syria-ai-<tier>-v<semver>-exp<experiment-id>`

- First release: `syria-ai-debug-v0.1.0-exp001`
- Example future releases: `syria-ai-nano-v0.1.0-exp002`, `syria-ai-mini-v0.2.0-exp005`

The `-exp<NNN>` suffix binds the release to a documented experiment ID so every published weight is traceable to its training report and artifacts.

**Release asset checklist (every model release must contain):**

1. `checkpoint.pt` — trained weights (the only large file)
2. `tokenizer.json` — the exact tokenizer version the checkpoint was trained with
3. `config.json` — architecture config (must match the embedded `model_config` in the checkpoint)
4. `evaluation_results.json` + `metrics.json` + `training_metadata.json` — honest provenance
5. `SHA256SUMS` — one `sha256  filename` line per asset, generated with `sha256sum`
6. `MODEL_CARD.md` for the release
7. Release notes stating: experiment ID, checkpoint step, tokenizer version, dataset version, license (Apache-2.0 weights; CC BY-SA 4.0 for Wikipedia-derived training data)

## 2. SHA-256 Verification

Hashes below were computed from the actual distributed files. Verify your copy matches before use.

| File | SHA-256 | Size (bytes) |
|---|---|---|
| `checkpoint.pt` | `448a297df2c0d9afc9a7cc0a283f45bab5d6da377daa26ba325709195f43f541` | 16,256,510 |
| `tokenizer.json` | `11e974014b7dfba2b5eda43ed6f92865cfdd743a3a04b501d786580813e5b417` | 131,521 |
| `config.json` | `45a77a3f06a6a6c4dbd404d02e5ea3d8d73c52d28ad740c03e615365e55df2bc` | 290 |
| `evaluation_results.json` | `9c4950e4039e7cd562f579f005aeafa88598ac5e67508ba988394731a72f9818` | 1,577 |
| `metrics.json` | `6c9f372ba28551a5bf590a0c41d07c63b6209d88f49c52d54cbc2e9bd446cd5f` | 1,282 |
| `training_metadata.json` | `afbff7ffa82c49ce20fa0453f5ce9c562bf7114aec8465ca6097a4e2a3bf5ffb` | 1,356 |

Verify on Linux:

```bash
cd syria-ai-core/artifacts/models/syria-ai-debug
sha256sum checkpoint.pt tokenizer.json config.json
```

Verify on macOS:

```bash
cd syria-ai-core/artifacts/models/syria-ai-debug
shasum -a 256 checkpoint.pt tokenizer.json config.json
```

Expected output for `checkpoint.pt`:

```
448a297df2c0d9afc9a7cc0a283f45bab5d6da377daa26ba325709195f43f541  checkpoint.pt
```

For future Release-Asset distribution, verify in one step against the published manifest:

```bash
sha256sum -c SHA256SUMS        # Linux
shasum -a 256 -c SHA256SUMS    # macOS
```

A mismatch means the file is corrupted or tampered with — do not load it. Note: `checkpoint.pt` in `artifacts/models/syria-ai-debug/` and `artifacts/experiments/EXP-001/` are byte-identical copies (same SHA-256 `448a297d...`); the experiments copy is the trainer's working output, the models copy is the deployed one.

## 3. Model Configuration Reference (`config.json`)

| Field | Value | Meaning |
|---|---|---|
| `model_id` | `syria-ai-debug` | Registry identifier of this model |
| `arch_name` | `decoder-only-baseline` | Custom decoder-only transformer implemented in `syria_ai/model/` |
| `vocab_size` | 4096 | Rows in the embedding/output head; must equal the tokenizer's vocab size (enforced at load) |
| `block_size` | 256 | Maximum context window in tokens; prompts + generations longer than 256 tokens are truncated by the model |
| `n_layer` | 4 | Number of transformer blocks |
| `n_head` | 4 | Attention heads per block (head dim = 128 / 4 = 32) |
| `n_embd` | 128 | Model dimension (d_model) |
| `ffn_mult` | 4 | FFN hidden size multiplier (inner dim = 128 * 4 = 512) |
| `dropout` | 0.1 | Dropout probability used during training (inactive at inference, `model.eval()`) |
| `bias` | true | Linear/layernorm bias terms enabled |
| `norm` | `rmsnorm` | Normalization type: RMSNorm (no mean centering) |
| `weight_tying` | true | Input embedding and output head share weights |
| `activation` | `gelu-tanh` | GELU activation (tanh approximation) |

The inference engine double-checks this file against the `model_config` stored inside `checkpoint.pt` and refuses to load on disagreement (`ValueError: config.json disagrees with checkpoint model_config`).

## 4. Tokenizer Version Binding

This checkpoint is bound to tokenizer **`syria-tokenizer` version 1.0.0** (byte-level BPE, 4096 vocab, 3832 merges, 8 special tokens), recorded in `tokenizer.json` and `training_metadata.json`.

Why the binding matters: the model's embedding matrix and output head have exactly `vocab_size = 4096` rows, and token IDs in the checkpoint's training data were produced by tokenizer 1.0.0. A different tokenizer version would (a) potentially fail the size check outright, and (b) silently map IDs to wrong pieces even at equal size, producing garbage.

The engine validates this on load (from `syria_ai/inference/engine.py`):

- vocab mismatch -> `ValueError: tokenizer/model mismatch: checkpoint vocab 4096 != tokenizer vocab <N>`
- missing files -> `ModelNotReady: missing artifacts: [<paths>]`
- config disagreement -> `ValueError: config.json disagrees with checkpoint model_config`

Practical rule: always move `checkpoint.pt`, `tokenizer.json` and `config.json` **together, as one set, from the same release**. Never mix a checkpoint with a tokenizer from another version.

## 5. Local Inference (No Server)

Tested environment: Python **3.12.16**, PyTorch **2.15.0+cpu** (CPU wheel), 2 logical cores, ~4 GB RAM. Any Python >= 3.10 with `torch >= 2.2` should work; the CPU wheel is sufficient.

### 5.1 Setup

```bash
cd syriaai/syria-ai-core

python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt      # torch>=2.2, fastapi>=0.110, uvicorn>=0.29, numpy>=1.26, pytest>=8.0
# CPU-only torch alternative (smaller download):
# pip install torch --index-url https://download.pytorch.org/whl/cpu
```

### 5.2 CLI generation (`scripts/generate.py`)

Actual CLI flags (from the script's argparse):

| Flag | Default | Meaning |
|---|---|---|
| `--prompt` | `دمشق` | Prompt text (Arabic, English or code) |
| `--max-new-tokens` | 48 | Number of new tokens to generate |
| `--temperature` | 0.9 | Sampling temperature |
| `--top-k` | 40 | Top-k filtering (disable by passing a value with top-p; see below) |
| `--top-p` | 0.95 | Nucleus (top-p) filtering |
| `--seed` | None | RNG seed for deterministic generation |

```bash
python3 scripts/generate.py --prompt "دمشق" --max-new-tokens 40 --seed 7
```

The script loads the checkpoint in an independent process (no training state), prints a JSON result (`ok`, `model` info, `generated_text`, `prompt_tokens`, `output_tokens`, `elapsed_ms`, `tokens_per_sec`, `device`) and records the run in `artifacts/proofs/reload_generation_proof.json`. If no checkpoint exists it exits with code 2 and prints `{"ok": false, "error": "MODEL_NOT_READY", ...}`.

### 5.3 Minimal Python snippet

Run from the `syria-ai-core/` directory (so the `syria_ai` package and artifact paths resolve):

```python
from syria_ai.inference.engine import InferenceEngine

engine = InferenceEngine("artifacts/models/syria-ai-debug")
info = engine.load()          # validates tokenizer version + config against the checkpoint
print(info["status"])         # "READY"
print(info["checkpoint_step"])  # 1200

result = engine.generate(
    prompt="دمشق",
    max_new_tokens=40,
    temperature=0.9,
    top_k=40,
    top_p=0.95,
    seed=7,                   # deterministic output for a given seed
)
print(result.text)
print(result.output_tokens, result.tokens_per_sec, result.device)
```

`InferenceEngine.generate` returns a `GenerationResult` with fields: `text`, `prompt_tokens`, `output_tokens`, `truncated`, `elapsed_ms`, `tokens_per_sec`, `model_id`, `checkpoint_step`, `device`. Streaming (per-token events) is available via `engine.generate_stream(request_id, prompt, ...)`.

## 6. Hardware Requirements

**CPU (measured, debug model):**

- Training was done on **2 logical CPU cores** in 469.5 s for 1200 steps (2,457,600 tokens) — source: `training_metadata.json`.
- Inference loads the 16 MB checkpoint and generates at roughly **396 tokens/sec on 2 CPU cores** (source: `docs/TRAINING_REPORT_EXP-001.md`, `artifacts/proofs/reload_generation_proof.json`; weights reload measured at 62 ms).
- Memory: the environment used for training had 4.06 GB RAM total; the model + tokenizer fit comfortably in ~4 GB. No GPU, no quantization, no special libraries required.

**GPU:**

- **None required for the debug model.** Everything in this guide runs CPU-only by default (`torch 2.15.0+cpu`).
- Optional CUDA: the engine auto-selects CUDA when `torch.cuda.is_available()` and `device="auto"` (see `engine.load()`). Installing a CUDA build of PyTorch is harmless but unnecessary for `syria-ai-debug`; it only matters for the future Nano/Mini/Base/Pro training runs.

## 7. API Server Setup (FastAPI, port 3010)

The independent inference service wraps the same engine. Start it from `syria-ai-core/`:

```bash
python3 -m uvicorn syria_ai.inference.service:app --host 127.0.0.1 --port 3010
```

The served model directory defaults to `artifacts/models/syria-ai-debug` and can be overridden with the `SYRIA_ARTIFACTS_DIR` environment variable. The model loads lazily on first request; until a valid checkpoint is present, generation endpoints return HTTP 503 with `MODEL_NOT_READY` (never a fake response).

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Service + model status (readiness, params, checkpoint step, tokenizer version) |
| GET | `/v1/models` | Model registry (all 11 family entries; only `syria-ai-debug` is `TRAINED`) |
| POST | `/v1/generate` | Non-streaming generation |
| POST | `/v1/generate/stream` | Server-Sent Events streaming generation |
| POST | `/v1/generate/cancel` | Cancel an in-flight stream by `request_id` |

Also available: `GET /v1/system` (hardware report), `GET /v1/experiments`, `GET /v1/experiments/{exp_id}`, `GET /v1/tests/results`, and training-control endpoints (`/v1/training/start|stop|status`) used by the web Training Studio.

### `POST /v1/generate`

Request schema (`GenerateRequest`, from `service.py`):

| Field | Type | Constraints | Default |
|---|---|---|---|
| `prompt` | string | 1..4000 chars | required |
| `max_new_tokens` | int | 1..256 | 64 |
| `temperature` | float | 0.0..2.0 | 0.9 |
| `top_k` | int or null | >= 1 | 40 |
| `top_p` | float or null | 0.0 < p <= 1.0 | 0.95 |
| `seed` | int or null | — | null |

```bash
curl -s -X POST http://127.0.0.1:3010/v1/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "دمشق", "max_new_tokens": 40, "temperature": 0.9, "top_k": 40, "top_p": 0.95, "seed": 7}'
```

Response (illustrative; the `text` value is the verbatim EXP-001 evaluation sample for this prompt):

```json
{
  "ok": true,
  "data_class": "REAL",
  "engine": "syria-ai-neural-inference",
  "text": "دمشق يوم بس في في السوق في بس في في في وقت.\nفريق الآخر في وقت.\nالسوق طويل، طرطوس في حمص، بس شو صعب الأثمنة",
  "prompt_tokens": 2,
  "output_tokens": 40,
  "truncated": true,
  "elapsed_ms": 101.0,
  "tokens_per_sec": 396.0,
  "model_id": "syria-ai-debug",
  "checkpoint_step": 1200,
  "device": "cpu"
}
```

`data_class: "REAL"` means the text came from the trained neural weights. `prompt_tokens`/`elapsed_ms`/`tokens_per_sec` values vary per machine and seed.

### `GET /health`

```json
{
  "ok": true,
  "service": "syria-ai-inference",
  "version": "0.2.0",
  "uptime_sec": 42.1,
  "model": {
    "ready": true,
    "status": "READY",
    "model_id": "syria-ai-debug",
    "architecture": "decoder-only-baseline",
    "params": 1349248,
    "vocab_size": 4096,
    "block_size": 256,
    "n_layer": 4,
    "n_head": 4,
    "n_embd": 128,
    "device": "cpu",
    "checkpoint_step": 1200,
    "checkpoint_saved_at": "2026-11-22T14:55:57Z",
    "tokenizer_version": "1.0.0"
  }
}
```

### `POST /v1/generate/stream` (SSE)

Same request body as `/v1/generate`. Response is `text/event-stream`; each line is `data: {json}`. Event types in order:

```
data: {"type": "open", "request_id": "<hex>"}
data: {"type": "start", "request_id": "<hex>", "prompt_tokens": 2, "model_id": "syria-ai-debug"}
data: {"type": "token", "token_id": 1015, "piece": "دمشق"}
data: {"type": "token", "token_id": 263, "piece": " يوم"}
...
data: {"type": "done", "request_id": "<hex>", "text": "...", "output_tokens": 40, "elapsed_ms": 101.0, "tokens_per_sec": 396.0}
data: [DONE]
```

(Token IDs and pieces above are illustrative structure, not a recorded transcript.) Consume with `curl -N -X POST ...` or an EventSource client.

### `POST /v1/generate/cancel`

```bash
curl -s -X POST http://127.0.0.1:3010/v1/generate/cancel \
  -H "Content-Type: application/json" \
  -d '{"request_id": "<hex-from-stream-open-event>"}'
```

Response: `{"ok": true, "request_id": "<hex>"}`. The stream then ends with a `{"type": "cancelled"}` event instead of `done`. Cancelling an unknown ID returns `{"ok": false, ...}`.

### `MODEL_NOT_READY` behavior

If `checkpoint.pt` / `tokenizer.json` are missing (or invalid), `/v1/generate` and `/v1/generate/stream` return:

```
HTTP 503
{"detail": {"error": "MODEL_NOT_READY", "message": "No trained SYRIA AI checkpoint found. Train first: python3 scripts/train_debug.py"}}
```

`/health` stays reachable and reports `"ready": false, "status": "MODEL_NOT_READY"` inside `model`. This is an explicit honest state — the service never fabricates output.

## 8. Python Client Integration

```python
# client.py — Python 3.10+, no SDK required. `pip install requests` if not present.
import requests

BASE = "http://127.0.0.1:3010"

# 1) readiness check
health = requests.get(f"{BASE}/health", timeout=5).json()
if not health["model"]["ready"]:
    raise SystemExit("MODEL_NOT_READY — deploy checkpoint.pt + tokenizer.json first")

# 2) generate (deterministic with seed)
resp = requests.post(
    f"{BASE}/v1/generate",
    json={"prompt": "دمشق", "max_new_tokens": 40, "temperature": 0.9, "seed": 7},
    timeout=120,
)
if resp.status_code == 503:
    raise SystemExit(f"model not ready: {resp.json()}")
data = resp.json()
print(data["text"])
print(f"[{data['model_id']} step {data['checkpoint_step']} | {data['output_tokens']} tok | "
      f"{data['elapsed_ms']} ms | {data['device']}]")
```

Prefer stdlib-only? Replace `requests` with `urllib.request`: `urllib.request.urlopen(urllib.request.Request(url, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"}))` and `json.loads(response.read())`.

For streaming, read the SSE body incrementally (e.g. with `requests.post(..., stream=True)` and line-by-line iteration, parsing `data: {...}` events until `data: [DONE]`).

## 9. JavaScript / TypeScript Integration

Direct against the FastAPI service (Node 18+ or browser):

```typescript
// syriaClient.ts
const BASE = "http://127.0.0.1:3010";

interface GenerateResponse {
  ok: boolean;
  data_class: "REAL";
  text: string;
  prompt_tokens: number;
  output_tokens: number;
  elapsed_ms: number;
  tokens_per_sec: number;
  model_id: string;
  checkpoint_step: number;
  device: string;
}

export async function generate(prompt: string, maxNewTokens = 64, seed?: number): Promise<GenerateResponse> {
  const res = await fetch(`${BASE}/v1/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, max_new_tokens: maxNewTokens, temperature: 0.9, top_k: 40, top_p: 0.95, seed: seed ?? null }),
  });
  if (res.status === 503) {
    const detail = await res.json();
    throw new Error(`MODEL_NOT_READY: ${JSON.stringify(detail.detail ?? detail)}`);
  }
  if (!res.ok) throw new Error(`generate failed: HTTP ${res.status}`);
  return res.json();
}

// usage
const out = await generate("دمشق", 40, 7);
console.log(out.text, out.checkpoint_step);
```

**Next.js platform proxy:** inside the SYRIA AI web platform, do not call port 3010 directly — use the built-in server-side proxy routes under `/api/neural/*` (implemented in `src/app/api/neural/`), which forward to the Python service and enforce the REAL/DEMO separation:

```typescript
// Via the platform proxy — request shape wraps generation params in `params`:
const res = await fetch("/api/neural/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: "دمشق",
    params: { maxTokens: 40, temperature: 0.9, topK: 40, topP: 0.95 },
    seed: 7,
  }),
});
const json = await res.json();
// success: { ok: true, data: { model, text, checkpointStep, device, metrics: {...}, dataClass: "REAL", neural: true } }
// not ready: HTTP 503 { ok: false, error: "MODEL_NOT_READY", message: "..." }
```

Other platform proxy routes: `/api/neural/models`, `/api/neural/training`, `/api/neural/experiments`, `/api/neural/system`.

## 10. Redeployment Without Retraining

The trained checkpoint is fully portable. **No retraining, no fine-tuning, no data regeneration is required to serve these weights** — loading is verified at process start by the reload proof (`artifacts/proofs/reload_generation_proof.json`).

To deploy on a new machine or directory:

1. Copy the set `checkpoint.pt`, `tokenizer.json`, `config.json` (plus the metadata JSONs for provenance) into `syria-ai-core/artifacts/models/<model-dir>/` — keeping the three required files together from the same release.
2. Install requirements and run either the CLI, the Python engine snippet (Section 5.3, pointing `InferenceEngine("artifacts/models/<model-dir>")`), or the FastAPI service with `SYRIA_ARTIFACTS_DIR=artifacts/models/<model-dir>`.
3. The engine validates tokenizer vocab (4096) and config consistency on load; if validation passes, the model is immediately ready (`checkpoint_step: 1200`).

The `checkpoint.pt` at `artifacts/models/syria-ai-debug/checkpoint.pt` is byte-identical (same SHA-256) to the trainer output at `artifacts/experiments/EXP-001/checkpoint.pt`, so either copy can seed a deployment.

## 11. Future Large-Model Release Workflow

For Nano (50M) / Mini (150M) / Base (1B) / Pro (3B) once trained:

1. **Tag:** create release tag `syria-ai-<tier>-v<semver>-exp<NNN>` (e.g. `syria-ai-nano-v0.1.0-exp002`) on the commit containing the model's configs/eval metadata.
2. **Assets:** attach `checkpoint.pt`, `tokenizer.json`, `config.json`, eval/metadata JSONs, and `MODEL_CARD.md` to the GitHub Release.
3. **SHA256SUMS:** generate `sha256sum checkpoint.pt tokenizer.json config.json ... > SHA256SUMS` and attach it as a release asset; consumers run `sha256sum -c SHA256SUMS`.
4. **Repo hygiene:** commit only small artifacts (configs, metadata, card). The weights stay out of git history — this is a hard owner mandate to keep clones light.
5. **Model card:** every release carries its own card (params, data, eval, limitations, license) — required by the registry rules in `docs/MODEL_REGISTRY.md` before a variant is considered published.
6. **Tokenizer binding note in release notes:** state the exact tokenizer version so users cannot mix checkpoints with mismatched tokenizers.

## 12. Post-Download Verification Checklist

Run this after any download/redeployment, before relying on the model:

- [ ] **Hash check:** `sha256sum checkpoint.pt tokenizer.json config.json` (Linux) or `shasum -a 256 ...` (macOS) matches the table in Section 2 (or passes `sha256sum -c SHA256SUMS` for release assets).
- [ ] **Files present:** `checkpoint.pt`, `tokenizer.json` in the same model directory (config.json recommended; metadata JSONs optional but expected).
- [ ] **Environment:** `python3 --version` (>= 3.10; tested on 3.12.16), `python3 -c "import torch; print(torch.__version__)"` (>= 2.2; tested on 2.15.0+cpu).
- [ ] **Load check:** `python3 scripts/generate.py --prompt "دمشق" --max-new-tokens 8 --seed 7` exits 0, prints `"ok": true`, `"status": "READY"`, `checkpoint_step: 1200`, `tokenizer_version: 1.0.0`.
- [ ] **Generate 1 sample:** the command above produced non-empty `generated_text` (quality will be weak/incoherent — that is expected and documented in the model card).
- [ ] **Health check (if serving):** `curl -s http://127.0.0.1:3010/health` returns `"ok": true` and `model.ready: true`; one `POST /v1/generate` returns `data_class: "REAL"`.
- [ ] **Version binding:** `tokenizer_version` reported by `/health` or engine info is `1.0.0`; any `tokenizer/model mismatch` error means files from different releases were mixed — re-download the full set.
