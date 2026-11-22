"""SYRIA NEURAL ENGINE tests — the decoder-only transformer built from scratch.

Covers: forward shapes, loss, gradients, causal masking, parameter counting,
weight tying and autoregressive generation. No pretrained weights involved.
"""

from __future__ import annotations

import torch

from syria_ai.model.config import debug_config
from syria_ai.model.transformer import SyriaTransformer
from syria_ai.model.utils import build_model


def _tiny(cfg_overrides: dict | None = None) -> SyriaTransformer:
    cfg = debug_config()
    cfg.vocab_size = 320
    cfg.block_size = 32
    cfg.n_layer = 2
    cfg.n_embd = 64
    cfg.n_head = 4
    cfg.dropout = 0.0
    for k, v in (cfg_overrides or {}).items():
        setattr(cfg, k, v)
    cfg.validate()
    return SyriaTransformer(cfg)


# --------------------------------------------------------------------------- #
# 1. forward shapes (train mode with targets)
# --------------------------------------------------------------------------- #
def test_forward_shapes_with_targets():
    model = _tiny()
    model.train()
    x = torch.randint(0, 320, (2, 16))
    y = torch.randint(0, 320, (2, 16))
    logits, loss = model(x, y)
    assert logits.shape == (2, 16, 320)
    assert loss is not None and loss.ndim == 0
    assert torch.isfinite(loss)


# --------------------------------------------------------------------------- #
# 2. forward without targets returns loss=None (inference mode)
# --------------------------------------------------------------------------- #
def test_forward_without_targets_returns_no_loss():
    model = _tiny()
    model.eval()
    x = torch.randint(0, 320, (1, 8))
    logits, loss = model(x)
    assert logits.shape == (1, 8, 320)
    assert loss is None


# --------------------------------------------------------------------------- #
# 3. backward pass produces gradients on all trainable parameters
# --------------------------------------------------------------------------- #
def test_backward_produces_gradients():
    model = _tiny()
    model.train()
    x = torch.randint(0, 320, (2, 16))
    y = torch.randint(0, 320, (2, 16))
    _, loss = model(x, y)
    loss.backward()
    grads = [p.grad for p in model.parameters() if p.requires_grad]
    assert grads and all(g is not None for g in grads)
    assert any(float(g.abs().sum()) > 0 for g in grads)


# --------------------------------------------------------------------------- #
# 4. causal masking: future tokens never influence past logits
# --------------------------------------------------------------------------- #
def test_causal_masking_is_strict():
    torch.manual_seed(0)
    model = _tiny()
    model.eval()
    prefix = torch.randint(0, 320, (1, 6))
    changed_suffix_a = torch.randint(0, 320, (1, 4))
    changed_suffix_b = torch.randint(0, 320, (1, 4))
    assert not torch.equal(changed_suffix_a, changed_suffix_b)
    seq_a = torch.cat([prefix, changed_suffix_a], dim=1)
    seq_b = torch.cat([prefix, changed_suffix_b], dim=1)
    with torch.no_grad():
        logits_a, _ = model(seq_a)
        logits_b, _ = model(seq_b)
    # positions inside the prefix must be identical despite different futures
    assert torch.allclose(logits_a[:, :6], logits_b[:, :6], atol=1e-5)
    # positions in the suffix may differ
    assert not torch.allclose(logits_a[:, 6:], logits_b[:, 6:], atol=1e-5)


# --------------------------------------------------------------------------- #
# 5. parameter counting (with and without embeddings)
# --------------------------------------------------------------------------- #
def test_num_params_counts():
    model = _tiny()
    total = model.num_params(non_embedding=False)
    non_emb = model.num_params(non_embedding=True)
    assert total > 0 and non_emb > 0
    assert total >= non_emb


# --------------------------------------------------------------------------- #
# 6. weight tying: lm_head shares the token-embedding matrix
# --------------------------------------------------------------------------- #
def test_weight_tying_when_enabled():
    model = _tiny({"weight_tying": True})
    assert model.lm_head.weight.data_ptr() == model.tok_emb.weight.data_ptr()


# --------------------------------------------------------------------------- #
# 7. autoregressive generation: exact length, deterministic with fixed seed
# --------------------------------------------------------------------------- #
def test_generation_length_and_determinism():
    torch.manual_seed(0)
    model = _tiny()
    model.eval()
    x = torch.randint(0, 320, (1, 6))
    torch.manual_seed(123)
    out1 = model.generate(x.clone(), max_new_tokens=10, temperature=1.0, top_k=10)
    torch.manual_seed(123)
    out2 = model.generate(x.clone(), max_new_tokens=10, temperature=1.0, top_k=10)
    assert out1.shape == (1, 16)
    assert torch.equal(out1, out2)
    # context preserved at the front
    assert torch.equal(out1[:, :6], x)


def test_build_model_respects_seed():
    cfg = debug_config()
    cfg.vocab_size = 320
    cfg.block_size = 16
    cfg.n_layer = 1
    cfg.n_embd = 32
    cfg.n_head = 2
    m1 = build_model(cfg, seed=7)
    m2 = build_model(cfg, seed=7)
    for p1, p2 in zip(m1.parameters(), m2.parameters()):
        assert torch.equal(p1, p2)
