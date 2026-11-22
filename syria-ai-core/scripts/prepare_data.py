"""SYRIA DATA ENGINE — end-to-end dataset preparation script.

Pipeline: fetch licensed corpus (Wikipedia CC BY-SA + project-authored
synthetic seed) -> import -> clean -> dedup -> privacy filter -> validate ->
split -> TRAIN TOKENIZER FROM SCRATCH -> tokenize -> pack shards -> stats.

Run:  python3 scripts/prepare_data.py [--vocab 4096] [--skip-network]
"""

from __future__ import annotations

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from syria_ai.data.corpus_fetch import fetch_wikipedia_corpus
from syria_ai.data.engine import (
    Document,
    clean_text,
    deduplicate,
    detect_language,
    load_jsonl,
    looks_like_code,
    privacy_filter,
    split_dataset,
    validate_document,
    write_shards,
)
from syria_ai.data.seed_synthetic import write_seed_corpus
from syria_ai.tokenizer.bpe import SyriaTokenizer

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SEED_DIR = os.path.join(ROOT, "data", "seed_corpus")
RAW_DIR = os.path.join(ROOT, "data", "raw")
PROC_DIR = os.path.join(ROOT, "data", "processed")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--vocab", type=int, default=4096)
    ap.add_argument("--skip-network", action="store_true")
    ap.add_argument("--wiki-ar", type=int, default=150)
    ap.add_argument("--wiki-en", type=int, default=100)
    args = ap.parse_args()

    # ------------------------------------------------------------------ #
    # 1. build the raw corpus files
    # ------------------------------------------------------------------ #
    synthetic = write_seed_corpus(SEED_DIR, {"dialect": 120, "mixed": 60, "code": 80})
    print(f"[prepare] synthetic seed written: {synthetic}")

    wiki_status = "skipped"
    if not args.skip_network:
        try:
            wiki_path = os.path.join(SEED_DIR, "wiki_general.jsonl")
            if not os.path.exists(wiki_path) or os.path.getsize(wiki_path) < 10_000:
                res = fetch_wikipedia_corpus(
                    wiki_path,
                    {"ar": args.wiki_ar, "en": args.wiki_en},
                )
                wiki_status = f"fetched {res['docs']} docs ({res['per_language']})"
            else:
                wiki_status = "cached"
        except Exception as e:  # noqa: BLE001
            wiki_status = f"BLOCKED: {e}"
    print(f"[prepare] wikipedia corpus: {wiki_status}")

    # ------------------------------------------------------------------ #
    # 2. import + clean + dedup + privacy + validate
    # ------------------------------------------------------------------ #
    seed_files = [os.path.join(SEED_DIR, n) for n in
                  ("wiki_general.jsonl", "seed_dialect.jsonl", "seed_mixed.jsonl", "seed_code.jsonl")]
    existing = [p for p in seed_files if os.path.exists(p)]
    docs = load_jsonl(existing)
    print(f"[prepare] imported {len(docs)} documents")

    cleaned = 0
    redaction_count = 0
    validated: list[Document] = []
    rejected = 0
    for doc in docs:
        doc.text = clean_text(doc.text)
        cleaned += 1
        doc.text, redactions = privacy_filter(doc.text)
        redaction_count += len(redactions)
        if doc.language == "unknown":
            doc.language = "code" if looks_like_code(doc.text) else detect_language(doc.text)
        errors = validate_document(doc, min_chars=200, max_chars=8000)
        if errors:
            rejected += 1
            continue
        validated.append(doc)
    print(f"[prepare] cleaned={cleaned} privacy_redactions={redaction_count} rejected={rejected}")

    deduped, dedup_stats = deduplicate(validated)
    print(f"[prepare] dedup: {dedup_stats}")

    # ------------------------------------------------------------------ #
    # 3. deterministic split
    # ------------------------------------------------------------------ #
    splits = split_dataset(deduped, seed=42, train=0.94, valid=0.04)
    for name, docs_split in splits.items():
        print(f"[prepare] {name}: {len(docs_split)} docs")

    # ------------------------------------------------------------------ #
    # 4. train tokenizer FROM SCRATCH on the train split only
    # ------------------------------------------------------------------ #
    os.makedirs(os.path.join(PROC_DIR, "tokenizer"), exist_ok=True)
    tok_path = os.path.join(PROC_DIR, "tokenizer", "tokenizer.json")
    if os.path.exists(tok_path):
        tok = SyriaTokenizer.load(tok_path)
        if tok.vocab_size == args.vocab:
            print(f"[prepare] tokenizer cached (vocab {tok.vocab_size}, {len(tok.merges)} merges)")
        else:
            tok = None
    else:
        tok = None
    if tok is None:
        print(f"[prepare] training tokenizer from scratch (target vocab {args.vocab}) ...")
        tok = SyriaTokenizer.train(
            texts=[d.text for d in splits["train"]],
            vocab_size=args.vocab,
            min_pair_count=2,
        )
        tok.save(tok_path)
    print(f"[prepare] tokenizer: {json.dumps(tok.stats(), ensure_ascii=False)}")

    # ------------------------------------------------------------------ #
    # 5. tokenize all splits + write shards + stats
    # ------------------------------------------------------------------ #
    tokenized: dict[str, list[list[int]]] = {}
    for name in ("train", "valid", "test"):
        tokenized[name] = [tok.encode(d.text, use_special_tokens=False) for d in splits[name]]
        print(f"[prepare] tokenized {name}: {sum(len(s) for s in tokenized[name]):,} tokens")

    shards_dir = os.path.join(PROC_DIR, "shards")
    shard_stats = write_shards(tokenized, shards_dir)
    print(f"[prepare] shards: {json.dumps(shard_stats)}")

    # ------------------------------------------------------------------ #
    # 6. dataset stats + registry
    # ------------------------------------------------------------------ #
    sources: dict[str, int] = {}
    licenses: dict[str, int] = {}
    langs: dict[str, int] = {}
    for d in deduped:
        sources[d.source] = sources.get(d.source, 0) + 1
        licenses[d.license] = licenses.get(d.license, 0) + 1
        langs[d.language] = langs.get(d.language, 0) + 1

    stats = {
        "dataset_id": "SDS-001",
        "name": "SYRIA AI Debug Corpus",
        "version": "1.0.0",
        "built_at": __import__("time").strftime("%Y-%m-%dT%H:%M:%SZ", __import__("time").gmtime()),
        "network_status": wiki_status,
        "documents": {"imported": len(docs), "validated": len(validated), "after_dedup": len(deduped), "rejected": rejected},
        "dedup": dedup_stats,
        "privacy_redactions": redaction_count,
        "languages": langs,
        "sources": sources,
        "licenses": licenses,
        "tokenizer": tok.stats(),
        "shards": shard_stats,
        "splits": {name: {"docs": len(d)} for name, d in splits.items()},
        "attribution": "data/seed_corpus/ATTRIBUTION.md",
        "policy": {
            "external_ai_generated_data": "FORBIDDEN — none used",
            "licenses_enforced": sorted(
                {"CC BY-SA 4.0", "Project-Authored"} & set(licenses.keys())
            ),
        },
    }
    os.makedirs(PROC_DIR, exist_ok=True)
    with open(os.path.join(PROC_DIR, "dataset_stats.json"), "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)
    print("[prepare] dataset_stats.json written")


if __name__ == "__main__":
    main()
