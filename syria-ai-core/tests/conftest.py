"""Shared fixtures for the SYRIA AI CORE test suite.

Everything here is built from scratch on the fly (tiny corpora, tiny
tokenizers, tiny models) so the suite stays fast and self-contained:
no pretrained artifacts, no network, no external services.
"""

from __future__ import annotations

import os
import random
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import torch

from syria_ai.model.config import ModelConfig
from syria_ai.model.utils import build_model
from syria_ai.tokenizer.bpe import SyriaTokenizer
from syria_ai.data.engine import Document, write_shards

TINY_CORPUS = [
    "دمشق مدينة عربية قديمة وفاضنة، وفي أسواقها رائحة الياسمين.",
    "التعليم هو أساس تقدم الأمم وبناء جيل المستقبل.",
    "Syria is a country in the Levant with a rich history.",
    "def add(a, b):\n    return a + b\n",
    "الأطفال يلعبون في الحديقة كل مساء بعد العودة من المدرسة.",
    "Machine learning models are trained on large text corpora.",
    "حلب القلعة شامخة وتحيك بها الحكايا منذ قرون طويلة.",
    "print('hello world')  # a small python snippet",
    "اللغة العربية بحر واسع من المعاني والبلاغة والأدب.",
    "The tokenizer learns byte-pair merges from raw text data.",
] * 6


@pytest.fixture(scope="session")
def tiny_tokenizer() -> SyriaTokenizer:
    """A small real BPE tokenizer trained on the tiny corpus."""
    return SyriaTokenizer.train(TINY_CORPUS, vocab_size=400, min_pair_count=2)


@pytest.fixture(scope="session")
def tiny_shards(tmp_path_factory, tiny_tokenizer) -> dict:
    """Real packed shard files (train/valid/test) built from the tiny corpus."""
    rng = random.Random(7)
    docs = [
        Document(doc_id=f"d{i}", text=t, source="test", license="CC0")
        for i, t in enumerate(TINY_CORPUS)
    ]
    rng.shuffle(docs)
    splits = {"train": docs[:40], "valid": docs[40:50], "test": docs[50:]}
    tokenized = {
        split: [tiny_tokenizer.encode(d.text, use_special_tokens=False) for d in group]
        for split, group in splits.items()
    }
    out_dir = tmp_path_factory.mktemp("shards")
    stats = write_shards(tokenized, str(out_dir))
    paths = {s: os.path.join(str(out_dir), f"{s}.bin") for s in stats}
    return {"stats": stats, "paths": paths}


@pytest.fixture(scope="session")
def tiny_config(tiny_tokenizer) -> ModelConfig:
    """Tiny decoder-only config matching the tiny tokenizer vocab."""
    return ModelConfig(
        model_id="syria-ai-test",
        vocab_size=tiny_tokenizer.vocab_size,
        block_size=32,
        n_layer=2,
        n_head=2,
        n_embd=64,
        ffn_mult=4,
        dropout=0.0,
    )


@pytest.fixture(scope="session")
def tiny_artifacts(tmp_path_factory, tiny_tokenizer, tiny_config) -> str:
    """A real trained checkpoint directory (few steps, tiny model) used by
    the inference tests: checkpoint.pt + tokenizer.json + config.json."""
    from syria_ai.training.trainer import Trainer, TrainingConfig

    artifacts = tmp_path_factory.mktemp("artifacts")

    shards = tmp_path_factory.mktemp("shards")
    corpus = TINY_CORPUS * 3
    tokenized = {
        "train": [tiny_tokenizer.encode(t, use_special_tokens=False) for t in corpus[:50]],
        "valid": [tiny_tokenizer.encode(t, use_special_tokens=False) for t in corpus[50:60]],
    }
    write_shards(tokenized, str(shards))

    model = build_model(tiny_config, seed=42)
    tcfg = TrainingConfig(
        exp_id="TEST-000",
        out_dir=str(artifacts),
        train_bin=os.path.join(str(shards), "train.bin"),
        valid_bin=os.path.join(str(shards), "valid.bin"),
        batch_size=4,
        max_steps=8,
        lr=3e-3,
        warmup_steps=2,
        eval_interval=8,
        eval_batches=2,
        checkpoint_interval=1000,
        seed=42,
        torch_threads=1,
    )
    Trainer(model, tcfg).train()

    import json

    torch.save(
        {"model_state": model.state_dict(), "model_config": tiny_config.to_dict(), "step": 8},
        os.path.join(str(artifacts), "checkpoint.pt"),
    )
    tiny_tokenizer.save(os.path.join(str(artifacts), "tokenizer.json"))
    with open(os.path.join(str(artifacts), "config.json"), "w", encoding="utf-8") as f:
        json.dump(tiny_config.to_dict(), f)
    return str(artifacts)


@pytest.fixture(autouse=True)
def _deterministic_torch():
    torch.manual_seed(0)
    yield
