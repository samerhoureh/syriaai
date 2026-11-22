"""SYRIA AI NEURAL ENGINE — Decoder-Only Transformer implemented from scratch.

This file implements the complete architecture manually on top of raw PyTorch
tensor operations:

  * Token Embeddings
  * Learned Positional Embeddings
  * Causal Self-Attention (manual scaled dot-product with an explicit
    lower-triangular mask — future tokens can never attend to past tokens)
  * Multi-Head Attention (manual reshape / split / merge)
  * Feed-Forward Network with a manually-implemented GELU (tanh approximation)
  * Residual Connections (post Pre-Norm blocks)
  * RMSNorm / LayerNorm (manually implemented, not a pretrained module)
  * Language Modeling Head (optionally weight-tied to token embeddings)
  * Cross-Entropy Loss (F.cross_entropy — a math op, no pretrained component)
  * Autoregressive sampling with temperature / top-k / top-p

NO pretrained weights are loaded anywhere. All parameters are initialized
randomly by `_init_weights` at construction time.
"""

from __future__ import annotations

import math
from typing import Callable, Optional

import torch
import torch.nn as nn
import torch.nn.functional as F

from .config import ModelConfig


class RMSNorm(nn.Module):
    """Root-Mean-Square LayerNorm, implemented manually."""

    def __init__(self, dim: int, eps: float = 1e-6) -> None:
        super().__init__()
        self.eps = eps
        self.weight = nn.Parameter(torch.ones(dim))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        dtype = x.dtype
        x = x.float()
        norm = x.pow(2).mean(dim=-1, keepdim=True).add(self.eps).rsqrt()
        x = x * norm
        return (x * self.weight.float()).to(dtype)


class LayerNorm(nn.Module):
    """LayerNorm implemented manually (mean/var computed by hand)."""

    def __init__(self, dim: int, eps: float = 1e-5) -> None:
        super().__init__()
        self.eps = eps
        self.weight = nn.Parameter(torch.ones(dim))
        self.bias = nn.Parameter(torch.zeros(dim))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        mu = x.mean(dim=-1, keepdim=True)
        var = x.var(dim=-1, keepdim=True, unbiased=False)
        return (x - mu) / torch.sqrt(var + self.eps) * self.weight + self.bias


def gelu_tanh(x: torch.Tensor) -> torch.Tensor:
    """GELU (tanh approximation) computed manually from basic tensor ops."""
    return 0.5 * x * (1.0 + torch.tanh(math.sqrt(2.0 / math.pi) * (x + 0.044715 * torch.pow(x, 3.0))))


class CausalSelfAttention(nn.Module):
    """Multi-head causal self-attention, written from scratch.

    Q, K, V are produced by a single fused linear projection, split into
    heads, scaled-dot-product attention is applied with an explicit causal
    (lower-triangular) mask, heads are merged back and re-projected.
    """

    def __init__(self, cfg: ModelConfig) -> None:
        super().__init__()
        cfg.validate()
        self.n_head = cfg.n_head
        self.n_embd = cfg.n_embd
        self.head_dim = cfg.n_embd // cfg.n_head
        # fused QKV projection
        self.qkv = nn.Linear(cfg.n_embd, 3 * cfg.n_embd, bias=cfg.bias)
        self.proj = nn.Linear(cfg.n_embd, cfg.n_embd, bias=cfg.bias)
        self.attn_drop = nn.Dropout(cfg.dropout)
        self.resid_drop = nn.Dropout(cfg.dropout)
        # explicit causal mask (lower-triangular), not persisted in checkpoints
        mask = torch.tril(torch.ones(cfg.block_size, cfg.block_size, dtype=torch.bool))
        self.register_buffer("causal_mask", mask.view(1, 1, cfg.block_size, cfg.block_size), persistent=False)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B, T, C = x.shape
        qkv = self.qkv(x)
        q, k, v = qkv.split(self.n_embd, dim=2)
        # split heads: (B, T, C) -> (B, n_head, T, head_dim)
        q = q.view(B, T, self.n_head, self.head_dim).transpose(1, 2)
        k = k.view(B, T, self.n_head, self.head_dim).transpose(1, 2)
        v = v.view(B, T, self.n_head, self.head_dim).transpose(1, 2)
        # scaled dot-product attention with causal mask
        att = (q @ k.transpose(-2, -1)) * (1.0 / math.sqrt(self.head_dim))
        att = att.masked_fill(self.causal_mask[:, :, :T, :T] == 0, float("-inf"))
        att = F.softmax(att, dim=-1)
        att = self.attn_drop(att)
        y = att @ v
        # merge heads: (B, n_head, T, head_dim) -> (B, T, C)
        y = y.transpose(1, 2).contiguous().view(B, T, C)
        return self.resid_drop(self.proj(y))


class FeedForward(nn.Module):
    """Position-wise feed-forward network with manual GELU."""

    def __init__(self, cfg: ModelConfig) -> None:
        super().__init__()
        hidden = cfg.ffn_mult * cfg.n_embd
        self.fc = nn.Linear(cfg.n_embd, hidden, bias=cfg.bias)
        self.proj = nn.Linear(hidden, cfg.n_embd, bias=cfg.bias)
        self.drop = nn.Dropout(cfg.dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.drop(self.proj(gelu_tanh(self.fc(x))))


class TransformerBlock(nn.Module):
    """Pre-Norm transformer block: x = x + attn(norm(x)); x = x + ffn(norm(x))."""

    def __init__(self, cfg: ModelConfig) -> None:
        super().__init__()
        norm_cls = RMSNorm if cfg.norm == "rmsnorm" else LayerNorm
        self.ln1 = norm_cls(cfg.n_embd)
        self.attn = CausalSelfAttention(cfg)
        self.ln2 = norm_cls(cfg.n_embd)
        self.ffn = FeedForward(cfg)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = x + self.attn(self.ln1(x))
        x = x + self.ffn(self.ln2(x))
        return x


class SyriaTransformer(nn.Module):
    """The SYRIA AI decoder-only language model, built completely from scratch."""

    def __init__(self, cfg: ModelConfig) -> None:
        super().__init__()
        cfg.validate()
        self.cfg = cfg
        # --- Token + Positional embeddings -------------------------------
        self.tok_emb = nn.Embedding(cfg.vocab_size, cfg.n_embd)
        self.pos_emb = nn.Embedding(cfg.block_size, cfg.n_embd)
        self.drop = nn.Dropout(cfg.dropout)
        # --- Transformer body ---------------------------------------------
        self.blocks = nn.ModuleList([TransformerBlock(cfg) for _ in range(cfg.n_layer)])
        norm_cls = RMSNorm if cfg.norm == "rmsnorm" else LayerNorm
        self.ln_f = norm_cls(cfg.n_embd)
        # --- Language modeling head ---------------------------------------
        self.lm_head = nn.Linear(cfg.n_embd, cfg.vocab_size, bias=False)
        if cfg.weight_tying:
            self.lm_head.weight = self.tok_emb.weight  # weight tying
        # --- Fresh random initialization (NO pretrained weights) ----------
        self.apply(self._init_weights)
        # scale residual projections by 1/sqrt(2*n_layer) for stable training
        for pn, p in self.named_parameters():
            if pn.endswith("proj.weight") or pn.endswith("fc.weight"):
                nn.init.normal_(p, mean=0.0, std=0.02 / math.sqrt(2 * cfg.n_layer))

    def _init_weights(self, module: nn.Module) -> None:
        if isinstance(module, nn.Linear):
            nn.init.normal_(module.weight, mean=0.0, std=0.02)
            if module.bias is not None:
                nn.init.zeros_(module.bias)
        elif isinstance(module, nn.Embedding):
            nn.init.normal_(module.weight, mean=0.0, std=0.02)

    # ------------------------------------------------------------------ #
    def num_params(self, non_embedding: bool = True) -> int:
        """Exact trainable parameter count."""
        n = sum(p.numel() for p in self.parameters() if p.requires_grad)
        if non_embedding and self.cfg.weight_tying:
            # embeddings counted once; subtract positional embeddings only
            n -= self.pos_emb.weight.numel()
        return n

    def forward(
        self,
        idx: torch.Tensor,
        targets: Optional[torch.Tensor] = None,
    ) -> tuple[torch.Tensor, Optional[torch.Tensor]]:
        """Forward pass.

        idx:     (B, T) int64 token ids, T <= block_size
        targets: (B, T) int64 next-token targets (optional)

        Returns (logits (B, T, vocab_size), loss or None).
        """
        B, T = idx.shape
        if T > self.cfg.block_size:
            raise ValueError(f"sequence length {T} exceeds block_size {self.cfg.block_size}")
        pos = torch.arange(T, device=idx.device)
        x = self.tok_emb(idx) + self.pos_emb(pos)  # (B, T, C)
        x = self.drop(x)
        for block in self.blocks:
            x = block(x)
        x = self.ln_f(x)
        logits = self.lm_head(x)  # (B, T, vocab_size)
        loss = None
        if targets is not None:
            loss = F.cross_entropy(
                logits.view(-1, logits.size(-1)),
                targets.view(-1),
                ignore_index=-1,
            )
        return logits, loss

    # ------------------------------------------------------------------ #
    @torch.no_grad()
    def generate(
        self,
        idx: torch.Tensor,
        max_new_tokens: int,
        temperature: float = 1.0,
        top_k: Optional[int] = None,
        top_p: Optional[float] = None,
        eos_token_id: Optional[int] = None,
        token_callback: Optional[Callable[[int], None]] = None,
        cancel_check: Optional[Callable[[], bool]] = None,
    ) -> torch.Tensor:
        """Autoregressive sampling from the model's own weights.

        The context is recomputed each step (no KV cache — the debug model is
        small enough that this is faster to keep correct than to cache).
        Supports temperature scaling, top-k and nucleus (top-p) filtering,
        EOS stopping, per-token callback (for streaming) and cooperative
        cancellation.
        """
        self.eval()
        for _ in range(max_new_tokens):
            if cancel_check is not None and cancel_check():
                break
            idx_cond = idx[:, -self.cfg.block_size:]
            logits, _ = self(idx_cond)
            logits = logits[:, -1, :]  # last position only
            if temperature <= 0:
                next_id = torch.argmax(logits, dim=-1, keepdim=True)
            else:
                logits = logits / max(temperature, 1e-6)
                if top_k is not None and top_k > 0:
                    k = min(top_k, logits.size(-1))
                    vth = torch.topk(logits, k, dim=-1).values[..., -1, None]
                    logits = logits.masked_fill(logits < vth, float("-inf"))
                if top_p is not None and 0.0 < top_p < 1.0:
                    sorted_logits, sorted_idx = torch.sort(logits, descending=True, dim=-1)
                    probs = F.softmax(sorted_logits, dim=-1)
                    cum = torch.cumsum(probs, dim=-1)
                    remove = cum - probs > top_p  # keep first token above threshold
                    sorted_logits = sorted_logits.masked_fill(remove, float("-inf"))
                    logits = torch.full_like(logits, float("-inf")).scatter_(-1, sorted_idx, sorted_logits)
                probs = F.softmax(logits, dim=-1)
                next_id = torch.multinomial(probs, num_samples=1)
            idx = torch.cat((idx, next_id), dim=1)
            if token_callback is not None:
                token_callback(int(next_id.item()))
            if eos_token_id is not None and int(next_id.item()) == eos_token_id:
                break
        return idx
