"""Licensed corpus fetcher for the SYRIA DATA ENGINE.

Downloads plain-text articles from Wikipedia (ar + en) through the public
MediaWiki API. Wikipedia text is licensed CC BY-SA 4.0 (with GFDL); the
attribution list (titles + canonical URLs) is written to ATTRIBUTION.md as
required by the license. Nothing here involves external AI models — this is
plain HTTP retrieval of openly licensed human-authored text.

If the network is unavailable, callers fall back to the project-authored
synthetic seed corpus (see seed_synthetic.py) and record the blockage.
"""

from __future__ import annotations

import json
import os
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone

API = "https://{lang}.wikipedia.org/w/api.php"
UA = "SYRIA-AI-Corpus/0.2 (research corpus builder; https://www.syriaai.org)"
MAX_CHARS_PER_DOC = 6000

CATEGORIES = {
    "ar": [
        "تصنيف:سوريا",
        "تصنيف:مدن سوريا",
        "تصنيف:تاريخ سوريا",
        "تصنيف:جغرافيا",
        "تصنيف:علوم",
        "تصنيف:اقتصاد",
        "تصنيف:طب",
        "تصنيف:زراعة",
    ],
    "en": [
        "Category:Syria",
        "Category:Science",
        "Category:History",
        "Category:Computer science",
        "Category:Agriculture",
        "Category:Medicine",
    ],
}


def _get_json(url: str, params: dict, timeout: int = 20) -> dict:
    full = url + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(full, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _list_titles(lang: str, categories: list[str], per_category: int) -> list[str]:
    titles: list[str] = []
    for cat in categories:
        try:
            data = _get_json(
                API.format(lang=lang),
                {
                    "action": "query",
                    "format": "json",
                    "list": "categorymembers",
                    "cmtitle": cat,
                    "cmlimit": min(50, per_category),
                    "cmtype": "page",
                    "redirects": 1,
                },
            )
            for m in data.get("query", {}).get("categorymembers", []):
                t = m.get("title")
                if t and t not in titles:
                    titles.append(t)
        except Exception as e:  # noqa: BLE001 — network resilience
            print(f"[corpus] category {cat} failed: {e}")
    return titles


def _fetch_extracts(lang: str, titles: list[str], batch: int = 10, intro_only: bool = False) -> list[dict]:
    out: list[dict] = []
    for i in range(0, len(titles), batch):
        chunk = titles[i : i + batch]
        try:
            data = _get_json(
                API.format(lang=lang),
                {
                    "action": "query",
                    "format": "json",
                    "prop": "extracts",
                    "explaintext": 1,
                    "exsectionformat": "plain",
                    "redirects": 1,
                    "exlimit": batch,
                    "titles": "|".join(chunk),
                    **({"exintro": 1} if intro_only else {}),
                },
            )
            pages = data.get("query", {}).get("pages", {})
            for pid, page in pages.items():
                extract = page.get("extract")
                title = page.get("title")
                if not extract or not title:
                    continue
                extract = extract[:MAX_CHARS_PER_DOC]
                out.append(
                    {
                        "doc_id": f"wiki-{lang}-{pid}",
                        "title": title,
                        "url": f"https://{lang}.wikipedia.org/wiki/{urllib.parse.quote(title.replace(' ', '_'))}",
                        "text": extract,
                        "source": f"{lang}.wikipedia.org",
                        "license": "CC BY-SA 4.0",
                        "license_url": "https://creativecommons.org/licenses/by-sa/4.0/",
                        "language": lang,
                        "retrieved_at": datetime.now(timezone.utc).isoformat(),
                    }
                )
        except Exception as e:  # noqa: BLE001
            print(f"[corpus] extract batch {i} failed: {e}")
        time.sleep(0.2)  # polite delay
    return out


def fetch_wikipedia_corpus(
    out_path: str,
    lang_config: dict[str, int] | None = None,
    max_chars_per_doc: int = MAX_CHARS_PER_DOC,
) -> dict:
    """Download an openly licensed corpus and write JSONL + attribution."""
    lang_config = lang_config or {"ar": 150, "en": 100}
    all_docs: list[dict] = []
    per_lang: dict[str, int] = {}
    for lang, target in lang_config.items():
        cats = CATEGORIES.get(lang, [])
        if not cats:
            continue
        titles = _list_titles(lang, cats, per_category=target)
        print(f"[corpus] {lang}: {len(titles)} candidate titles")
        docs = _fetch_extracts(lang, titles)
        docs = [d for d in docs if len(d["text"]) >= 300]
        for d in docs:
            d["text"] = d["text"][:max_chars_per_doc]
        all_docs.extend(docs)
        per_lang[lang] = len(docs)
        print(f"[corpus] {lang}: {len(docs)} documents kept")

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        for d in all_docs:
            f.write(json.dumps(d, ensure_ascii=False) + "\n")

    attribution_path = os.path.join(os.path.dirname(out_path), "ATTRIBUTION.md")
    with open(attribution_path, "w", encoding="utf-8") as f:
        f.write("# Corpus Attribution (required by CC BY-SA 4.0)\n\n")
        f.write(f"Generated: {datetime.now(timezone.utc).isoformat()}\n\n")
        for lang, n in per_lang.items():
            f.write(f"\n## {lang}.wikipedia.org — {n} articles\n\n")
            for d in all_docs:
                if d["source"] == f"{lang}.wikipedia.org":
                    f.write(f"- [{d['title']}]({d['url']}) — CC BY-SA 4.0\n")

    return {"docs": len(all_docs), "per_language": per_lang, "attribution": attribution_path}


if __name__ == "__main__":
    import sys

    out = sys.argv[1] if len(sys.argv) > 1 else "data/seed_corpus/wiki_general.jsonl"
    result = fetch_wikipedia_corpus(out)
    print(json.dumps(result, ensure_ascii=False, indent=2))
