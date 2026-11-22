"""SYRIA INFERENCE ENGINE — loads OUR trained weights and generates text.

Guarantees:
  * Only checkpoints produced by SYRIA TRAINING ENGINE are loaded.
  * Model/tokenizer version validation is performed on load.
  * Generation is autoregressive from the model's neural weights — no rules,
    no canned responses, no external APIs.
  * MODEL_NOT_READY is an explicit, honest state when no checkpoint exists.
"""

from __future__ import annotations

import os
import threading
import time
from dataclasses import dataclass

import torch

from ..model.config import ModelConfig
from ..model.transformer import SyriaTransformer
from ..model.utils import portable_record_path
from ..tokenizer.bpe import SyriaTokenizer
from ..training.trainer import load_checkpoint


class ModelNotReady(Exception):
    """Raised when no trained checkpoint is available."""

    def __init__(self, message: str = "MODEL_NOT_READY — no trained SYRIA AI checkpoint found") -> None:
        super().__init__(message)
        self.code = "MODEL_NOT_READY"


@dataclass
class GenerationResult:
    text: str
    prompt_tokens: int
    output_tokens: int
    truncated: bool
    elapsed_ms: float
    tokens_per_sec: float
    model_id: str
    checkpoint_step: int
    device: str


class InferenceEngine:
    """Loads a trained SYRIA AI checkpoint and runs real neural generation."""

    def __init__(self, artifacts_dir: str = "artifacts/models/syria-ai-debug") -> None:
        self.artifacts_dir = artifacts_dir
        self._lock = threading.Lock()
        self.model: SyriaTransformer | None = None
        self.tokenizer: SyriaTokenizer | None = None
        self.checkpoint_meta: dict | None = None
        self.device = torch.device("cpu")
        self.load_time_ms = 0.0
        self._cancel_flags: dict[str, bool] = {}

    # ------------------------------------------------------------------ #
    @property
    def ready(self) -> bool:
        return self.model is not None and self.tokenizer is not None

    def info(self) -> dict:
        if not self.ready:
            return {
                "ready": False,
                "status": "MODEL_NOT_READY",
                "message": "No trained SYRIA AI checkpoint found. Train first: python3 scripts/train_debug.py",
                "artifacts_dir": portable_record_path(self.artifacts_dir),
            }
        cfg = self.model.cfg
        return {
            "ready": True,
            "status": "READY",
            "model_id": cfg.model_id,
            "architecture": cfg.arch_name,
            "params": self.model.num_params(non_embedding=False),
            "vocab_size": cfg.vocab_size,
            "block_size": cfg.block_size,
            "n_layer": cfg.n_layer,
            "n_head": cfg.n_head,
            "n_embd": cfg.n_embd,
            "device": str(self.device),
            "load_time_ms": round(self.load_time_ms, 1),
            "checkpoint_step": (self.checkpoint_meta or {}).get("step"),
            "checkpoint_saved_at": (self.checkpoint_meta or {}).get("saved_at"),
            "tokenizer_version": self.tokenizer.version,
            "artifacts_dir": portable_record_path(self.artifacts_dir),
        }

    # ------------------------------------------------------------------ #
    def load(self, device: str = "auto") -> dict:
        t0 = time.time()
        ckpt_path = os.path.join(self.artifacts_dir, "checkpoint.pt")
        tok_path = os.path.join(self.artifacts_dir, "tokenizer.json")
        cfg_path = os.path.join(self.artifacts_dir, "config.json")
        missing = [p for p in (ckpt_path, tok_path) if not os.path.exists(p)]
        if missing:
            raise ModelNotReady(f"missing artifacts: {missing}")
        if torch.cuda.is_available() and device == "auto":
            self.device = torch.device("cuda")
        else:
            self.device = torch.device("cpu" if device == "auto" else device)

        self.tokenizer = SyriaTokenizer.load(tok_path)
        ckpt = load_checkpoint(ckpt_path, map_location="cpu")
        cfg = ModelConfig.from_dict(ckpt["model_config"])
        # version validation: tokenizer vocab must match the trained embedding
        if cfg.vocab_size != self.tokenizer.vocab_size:
            raise ValueError(
                f"tokenizer/model mismatch: checkpoint vocab {cfg.vocab_size} != tokenizer vocab {self.tokenizer.vocab_size}"
            )
        # keep the checkpoint's own config file in sync if present
        if os.path.exists(cfg_path):
            disk_cfg = ModelConfig.from_json_file(cfg_path)
            if disk_cfg.to_dict() != cfg.to_dict():
                raise ValueError("config.json disagrees with checkpoint model_config")

        model = SyriaTransformer(cfg)
        model.load_state_dict(ckpt["model_state"], strict=True)
        model.to(self.device)
        model.eval()
        self.model = model
        self.checkpoint_meta = {"step": ckpt.get("step"), "saved_at": ckpt.get("saved_at"), "model_id": ckpt.get("model_id")}
        self.load_time_ms = (time.time() - t0) * 1000
        return self.info()

    # ------------------------------------------------------------------ #
    def _require_ready(self) -> None:
        if not self.ready:
            raise ModelNotReady()

    def cancel(self, request_id: str) -> bool:
        if request_id in self._cancel_flags:
            self._cancel_flags[request_id] = True
            return True
        return False

    def _register(self, request_id: str) -> None:
        # preserve a pre-set cancel flag (cancel() may arrive before the stream starts)
        self._cancel_flags.setdefault(request_id, False)

    def _unregister(self, request_id: str) -> None:
        self._cancel_flags.pop(request_id, None)

    # ------------------------------------------------------------------ #
    def generate(
        self,
        prompt: str,
        max_new_tokens: int = 64,
        temperature: float = 0.9,
        top_k: int | None = 40,
        top_p: float | None = 0.95,
        seed: int | None = None,
        use_special_tokens: bool = False,
    ) -> GenerationResult:
        self._require_ready()
        assert self.model is not None and self.tokenizer is not None
        if seed is not None:
            torch.manual_seed(seed)
        ids = self.tokenizer.encode(prompt, use_special_tokens=use_special_tokens)
        prompt_tokens = len(ids)
        x = torch.tensor([ids], dtype=torch.long, device=self.device)
        t0 = time.time()
        out = self.model.generate(
            x,
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            top_k=top_k,
            top_p=top_p,
        )
        elapsed = time.time() - t0
        new_tokens = out.shape[1] - x.shape[1]
        text = self.tokenizer.decode(out[0].tolist())
        return GenerationResult(
            text=text,
            prompt_tokens=prompt_tokens,
            output_tokens=new_tokens,
            truncated=new_tokens >= max_new_tokens,
            elapsed_ms=round(elapsed * 1000, 1),
            tokens_per_sec=round(new_tokens / max(elapsed, 1e-6), 1),
            model_id=self.model.cfg.model_id,
            checkpoint_step=(self.checkpoint_meta or {}).get("step", 0),
            device=str(self.device),
        )

    # ------------------------------------------------------------------ #
    def generate_stream(
        self,
        request_id: str,
        prompt: str,
        max_new_tokens: int = 64,
        temperature: float = 0.9,
        top_k: int | None = 40,
        top_p: float | None = 0.95,
        seed: int | None = None,
    ):
        """Generator yielding dicts; designed for SSE consumption.

        Events: {"type":"start",...}, {"type":"token","token_id","piece"},
        {"type":"done",...} or {"type":"cancelled"}.
        """
        self._require_ready()
        assert self.model is not None and self.tokenizer is not None
        if seed is not None:
            torch.manual_seed(seed)
        ids = self.tokenizer.encode(prompt, use_special_tokens=False)
        x = torch.tensor([ids], dtype=torch.long, device=self.device)
        prompt_tokens = len(ids)
        pieces: list[str] = []
        self._register(request_id)
        yield {
            "type": "start",
            "request_id": request_id,
            "prompt_tokens": prompt_tokens,
            "model_id": self.model.cfg.model_id,
        }
        t0 = time.time()
        out_count = 0
        try:
            # run real neural generation; cooperative cancellation via callback
            out = self.model.generate(
                x,
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                top_k=top_k,
                top_p=top_p,
                cancel_check=lambda: self._cancel_flags.get(request_id, False),
            )
            full_ids = out[0, x.shape[1]:].tolist()
            for tid in full_ids:
                if self._cancel_flags.get(request_id, False):
                    break
                piece = self.tokenizer.decode([tid])
                pieces.append(piece)
                yield {"type": "token", "token_id": tid, "piece": piece}
                out_count += 1
            cancelled = self._cancel_flags.get(request_id, False)
            elapsed = time.time() - t0
            yield {
                "type": "done" if not cancelled else "cancelled",
                "request_id": request_id,
                "text": "".join(pieces),
                "output_tokens": out_count,
                "elapsed_ms": round(elapsed * 1000, 1),
                "tokens_per_sec": round(out_count / max(elapsed, 1e-6), 1),
            }
        finally:
            self._unregister(request_id)
