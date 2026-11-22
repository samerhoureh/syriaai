"""SYRIA AI Inference Service — independent FastAPI service (port 3010).

Serves ONLY our own trained weights. There is no path to any external model.
If no trained checkpoint exists, generation endpoints return HTTP 503 with
error code MODEL_NOT_READY — never a fake response.
"""

from __future__ import annotations

import os
import signal
import subprocess
import sys
import threading
import time
import uuid

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

import syria_ai as core_pkg
from .engine import InferenceEngine, ModelNotReady
from ..registry import get_experiment, get_registry, list_experiments
from ..training.monitor import full_hardware_report

APP_STARTED = time.time()
ENGINE_DIR = os.environ.get("SYRIA_ARTIFACTS_DIR", "artifacts/models/syria-ai-debug")
CORE_ROOT = os.environ.get("SYRIA_CORE_ROOT", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

app = FastAPI(title="SYRIA AI Inference Service", version=core_pkg.__version__)
engine = InferenceEngine(ENGINE_DIR)
_loaded = False
_load_lock = threading.Lock()


def ensure_loaded() -> InferenceEngine:
    global _loaded
    if not _loaded:
        with _load_lock:
            if not _loaded:
                try:
                    engine.load()
                except ModelNotReady:
                    pass  # stays honest: not ready
                _loaded = True
    return engine


# --------------------------------------------------------------------------- #
# schemas
# --------------------------------------------------------------------------- #

class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    max_new_tokens: int = Field(default=64, ge=1, le=256)
    temperature: float = Field(default=0.9, ge=0.0, le=2.0)
    top_k: int | None = Field(default=40, ge=1)
    top_p: float | None = Field(default=0.95, gt=0.0, le=1.0)
    seed: int | None = None


class GenerateStreamRequest(GenerateRequest):
    pass


class CancelRequest(BaseModel):
    request_id: str


class TrainingStartRequest(BaseModel):
    steps: int = Field(default=1200, ge=50, le=20000)
    vocab_size: int = Field(default=4096, ge=1000, le=16384)
    batch_size: int = Field(default=8, ge=1, le=64)
    lr: float = Field(default=3e-3, gt=0, le=0.1)
    seed: int = Field(default=42)
    notes: str = ""


# --------------------------------------------------------------------------- #
# endpoints
# --------------------------------------------------------------------------- #

@app.get("/health")
def health() -> dict:
    eng = ensure_loaded()
    return {
        "ok": True,
        "service": "syria-ai-inference",
        "version": core_pkg.__version__,
        "uptime_sec": round(time.time() - APP_STARTED, 1),
        "model": eng.info(),
    }


@app.get("/v1/system")
def system() -> dict:
    return full_hardware_report(path=CORE_ROOT)


@app.get("/v1/models")
def models() -> list[dict]:
    return get_registry()


@app.get("/v1/experiments")
def experiments() -> list[dict]:
    return list_experiments()


@app.get("/v1/experiments/{exp_id}")
def experiment_detail(exp_id: str) -> dict:
    exp = get_experiment(exp_id)
    if exp is None:
        raise HTTPException(status_code=404, detail="experiment not found")
    return exp


@app.get("/v1/tests/results")
def test_results() -> list[dict]:
    """Machine-readable pytest reports produced by scripts/run_tests.py."""
    reports_dir = os.path.join(CORE_ROOT, "artifacts", "test_reports")
    out: list[dict] = []
    if os.path.isdir(reports_dir):
        for name in sorted(os.listdir(reports_dir)):
            if not name.endswith(".json"):
                continue
            try:
                with open(os.path.join(reports_dir, name), "r", encoding="utf-8") as f:
                    out.append(json_load(f))
            except Exception:
                continue
    return out


def json_load(f) -> dict:
    import json

    return json.load(f)


@app.post("/v1/generate")
def generate(req: GenerateRequest) -> dict:
    eng = ensure_loaded()
    if not eng.ready:
        raise HTTPException(status_code=503, detail={"error": "MODEL_NOT_READY", "message": eng.info()["message"]})
    with _gen_lock:
        result = eng.generate(
            prompt=req.prompt,
            max_new_tokens=req.max_new_tokens,
            temperature=req.temperature,
            top_k=req.top_k,
            top_p=req.top_p,
            seed=req.seed,
        )
    return {
        "ok": True,
        "data_class": "REAL",
        "engine": "syria-ai-neural-inference",
        "text": result.text,
        "prompt_tokens": result.prompt_tokens,
        "output_tokens": result.output_tokens,
        "truncated": result.truncated,
        "elapsed_ms": result.elapsed_ms,
        "tokens_per_sec": result.tokens_per_sec,
        "model_id": result.model_id,
        "checkpoint_step": result.checkpoint_step,
        "device": result.device,
    }


_gen_lock = threading.Lock()


@app.post("/v1/generate/stream")
def generate_stream(req: GenerateStreamRequest):
    eng = ensure_loaded()
    if not eng.ready:
        raise HTTPException(status_code=503, detail={"error": "MODEL_NOT_READY", "message": eng.info()["message"]})
    request_id = uuid.uuid4().hex

    def event_stream():
        import json as _json

        yield f"data: {_json.dumps({'type': 'open', 'request_id': request_id})}\n\n"
        try:
            for ev in eng.generate_stream(
                request_id,
                prompt=req.prompt,
                max_new_tokens=req.max_new_tokens,
                temperature=req.temperature,
                top_k=req.top_k,
                top_p=req.top_p,
                seed=req.seed,
            ):
                yield f"data: {_json.dumps(ev, ensure_ascii=False)}\n\n"
        except ModelNotReady as e:
            yield f"data: {_json.dumps({'type': 'error', 'error': 'MODEL_NOT_READY', 'message': str(e)})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/v1/generate/cancel")
def generate_cancel(req: CancelRequest) -> dict:
    ok = engine.cancel(req.request_id)
    return {"ok": ok, "request_id": req.request_id}


# --------------------------------------------------------------------------- #
# real training control (started from the Training Studio)
# --------------------------------------------------------------------------- #

_train_proc: subprocess.Popen | None = None
_train_meta: dict | None = None
_train_lock = threading.Lock()


@app.post("/v1/training/start")
def training_start(req: TrainingStartRequest) -> dict:
    global _train_proc, _train_meta
    with _train_lock:
        if _train_proc is not None and _train_proc.poll() is None:
            raise HTTPException(status_code=409, detail={"error": "TRAINING_ALREADY_RUNNING"})
        script = os.path.join(CORE_ROOT, "scripts", "train_debug.py")
        cmd = [
            sys.executable, script,
            "--steps", str(req.steps),
            "--vocab", str(req.vocab_size),
            "--batch", str(req.batch_size),
            "--lr", str(req.lr),
            "--seed", str(req.seed),
        ]
        _train_proc = subprocess.Popen(
            cmd, cwd=CORE_ROOT,
            stdout=open(os.path.join(CORE_ROOT, "artifacts", "training_console.log"), "ab"),
            stderr=subprocess.STDOUT,
            preexec_fn=os.setsid,
        )
        _train_meta = {"started_at": time.time(), "pid": _train_proc.pid, "steps": req.steps}
        return {"ok": True, "pid": _train_proc.pid, "exp_id": "EXP-001", "command": " ".join(cmd)}


@app.post("/v1/training/stop")
def training_stop() -> dict:
    global _train_proc, _train_meta
    with _train_lock:
        if _train_proc is None or _train_proc.poll() is not None:
            return {"ok": False, "status": "not_running"}
        try:
            os.killpg(os.getpgid(_train_proc.pid), signal.SIGTERM)
        except Exception:
            _train_proc.terminate()
        _train_proc.wait(timeout=30)
        return {"ok": True, "status": "stopped"}


@app.get("/v1/training/status")
def training_status() -> dict:
    with _train_lock:
        running = _train_proc is not None and _train_proc.poll() is None
        exp = get_experiment("EXP-001")
        return {
            "running": running,
            "pid": _train_proc.pid if _train_proc else None,
            "started_at": _train_meta["started_at"] if _train_meta else None,
            "latest_experiment": exp,
        }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=3010)
