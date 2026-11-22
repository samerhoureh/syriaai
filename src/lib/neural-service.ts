/* ---------------------------------------------------------------------------
 * SYRIA AI — Neural engine bridge (server-only).
 *
 * Connects the Next.js platform to the REAL trained neural engine running as a
 * standalone Python FastAPI service (syria-ai-core, default port 3010).
 *
 * Lifecycle contract (production-safe):
 *   - The inference engine is meant to run as an INDEPENDENT service with its
 *     own health checks (GET /health) — not spawned per user request.
 *   - If NEURAL_AUTOSTART=0 the bridge NEVER spawns anything: it only probes
 *     the configured URL and honestly reports MODEL_NOT_READY when down.
 *     This is the recommended production posture (systemd/Docker/k8s run the
 *     service, the platform just talks to it).
 *   - In development (default NEURAL_AUTOSTART=1) the bridge lazily starts the
 *     service ONCE via a single in-flight promise guard and reuses it; the
 *     spawn is never repeated per request.
 * ------------------------------------------------------------------------- */

import { spawn, spawnSync } from "child_process"
import { join } from "path"
import { openSync } from "fs"

/**
 * Base URL of the neural inference service. Override for standalone/sidecar
 * deployments or when running the clean-install verification on another port.
 */
const NEURAL_BASE = process.env.NEURAL_SERVICE_URL || "http://127.0.0.1:3010"
/** When "0", the bridge never spawns the Python service (production mode). */
const NEURAL_AUTOSTART = process.env.NEURAL_AUTOSTART !== "0"
/**
 * Root of the SYRIA AI neural core package. Resolved relative to the Next.js
 * project root (process.cwd()) so the platform works from any checkout path.
 * Override with NEURAL_CORE_ROOT if the core lives elsewhere.
 */
const CORE_ROOT = process.env.NEURAL_CORE_ROOT || join(process.cwd(), "syria-ai-core")
const SERVICE_LOG = `${CORE_ROOT}/artifacts/service.log`
const PROBE_TIMEOUT_MS = 1500

export interface NeuralModelInfo {
  ready: boolean
  status: string
  model_id?: string
  params?: number
  vocab_size?: number
  block_size?: number
  n_layer?: number
  n_head?: number
  n_embd?: number
  device?: string
  load_time_ms?: number
  checkpoint_step?: number
  checkpoint_saved_at?: string
  tokenizer_version?: string
  message?: string
  [key: string]: unknown
}

export interface NeuralHealthInfo {
  ok: boolean
  service: string
  version: string
  uptime_sec: number
  model: NeuralModelInfo
}

type NeuralSingleton = {
  starting: Promise<NeuralHealthInfo | null> | null
}

const g = globalThis as unknown as { __syriaNeural?: NeuralSingleton }
if (!g.__syriaNeural) g.__syriaNeural = { starting: null }

/* ------------------------------ probe ------------------------------------ */

/** Probe the running service. Returns health info or null (down / unreachable). */
export async function probeNeuralService(): Promise<NeuralHealthInfo | null> {
  try {
    const res = await fetch(`${NEURAL_BASE}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    })
    if (!res.ok) return null
    const json = (await res.json()) as NeuralHealthInfo
    if (!json || !json.model) return null
    return json
  } catch {
    return null
  }
}

/* --------------------------- lazy auto-start ------------------------------ */

/**
 * Resolve a Python interpreter that can actually run the neural service.
 *
 * Machines differ: some have the scientific stack in the default `python3`,
 * others in a versioned binary or a virtualenv. Resolution order:
 *   1. NEURAL_PYTHON environment variable (explicit override)
 *   2. first candidate from a probe that can import torch + fastapi + uvicorn
 *   3. fallback: plain "python3" (spawn may fail -> honest MODEL_NOT_READY)
 */
function resolvePythonInterpreter(): string {
  const candidates = [
    process.env.NEURAL_PYTHON,
    "python3",
    "python3.12",
    "python3.11",
    "python3.13",
    "python",
  ].filter((p): p is string => !!p)

  for (const py of candidates) {
    try {
      const probe = spawnSync(py, ["-c", "import torch, fastapi, uvicorn"], {
        cwd: CORE_ROOT,
        timeout: 20_000,
        encoding: "utf-8",
      })
      if (probe.status === 0) return py
    } catch {
      // try the next candidate
    }
  }
  return "python3"
}

function spawnNeuralService(): void {
  const out = openSync(SERVICE_LOG, "a")
  const err = openSync(SERVICE_LOG, "a")
  try {
    const python = resolvePythonInterpreter()
    const child = spawn(
      python,
      ["-m", "uvicorn", "syria_ai.inference.service:app", "--host", "127.0.0.1", "--port", "3010"],
      { cwd: CORE_ROOT, detached: true, stdio: ["ignore", out, err] }
    )
    child.unref()
  } catch (e) {
    console.error("neural-service: spawn failed", e)
  }
}

/**
 * Ensure the Python neural service is up:
 *  - probe first; if healthy, return immediately
 *  - otherwise spawn once (in-flight promise guard) and poll /health up to 30s
 *    (the torch import + model load takes several seconds on first boot)
 */
export async function ensureNeuralService(): Promise<NeuralHealthInfo | null> {
  const alive = await probeNeuralService()
  if (alive) return alive

  // Production posture: never spawn; surface an honest not-ready state.
  if (!NEURAL_AUTOSTART) return null

  const singleton = g.__syriaNeural!
  if (singleton.starting) {
    // another request is already booting the service — wait for it
    const waited = await singleton.starting
    return waited ?? (await probeNeuralService())
  }

  singleton.starting = (async () => {
    try {
      spawnNeuralService()
      const deadline = Date.now() + 30_000
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 1000))
        const info = await probeNeuralService()
        if (info) return info
      }
      return null
    } finally {
      singleton.starting = null
    }
  })()

  return singleton.starting
}

/* ------------------------------ fetch ------------------------------------ */

/**
 * Server-side fetch to the neural service. Returns parsed JSON or null when
 * the service is unavailable (never throws to the caller).
 */
export async function neuralFetch<T = unknown>(
  path: string,
  init?: { method?: string; body?: unknown; headers?: Record<string, string> },
  timeoutMs = 8000
): Promise<T | null> {
  const health = await ensureNeuralService()
  if (!health) return null
  try {
    const res = await fetch(`${NEURAL_BASE}${path}`, {
      method: init?.method ?? "GET",
      headers: init?.body !== undefined ? { "Content-Type": "application/json", ...(init?.headers ?? {}) } : init?.headers,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    })
    const text = await res.text()
    try {
      return JSON.parse(text) as T
    } catch {
      // Non-JSON (e.g. error page) — surface status for 4xx/5xx handling
      return (res.ok ? null : { __httpStatus: res.status }) as T
    }
  } catch {
    return null
  }
}

/** Raw fetch (for SSE proxying). Returns null when the service is unreachable. */
export async function neuralRawFetch(
  path: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string>; signal?: AbortSignal },
  timeoutMs = 20000
): Promise<Response | null> {
  const health = await ensureNeuralService()
  if (!health) return null
  try {
    const res = await fetch(`${NEURAL_BASE}${path}`, {
      method: init.method ?? "GET",
      headers: init.body !== undefined ? { "Content-Type": "application/json", ...(init.headers ?? {}) } : init.headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      signal: init.signal ?? AbortSignal.timeout(timeoutMs),
    })
    return res
  } catch {
    return null
  }
}

/** Convenience: health + model readiness in one call. */
export async function neuralModelState(): Promise<{
  health: NeuralHealthInfo | null
  ready: boolean
  model: NeuralModelInfo | null
}> {
  const health = await ensureNeuralService()
  const model = health?.model ?? null
  return { health, ready: !!model?.ready, model }
}
