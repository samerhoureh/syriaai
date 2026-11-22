# Publishing this repository to GitHub — دليل النشر على GitHub

The repository publishes to **https://github.com/samerhoureh/syriaai** (branch `main`).

## 1. Connect and push

```bash
cd syriaai   # wherever you cloned / keep the repository

# rename the branch if needed
git branch -M main

# point origin at the repository (if a remote already exists, use set-url)
git remote add origin https://github.com/samerhoureh/syriaai.git

git push -u origin main
```

Authentication: use a fine-grained Personal Access Token with **Contents: Read and write**
permission on the `syriaai` repository, or the `gh` CLI:

```bash
gh auth login
git push -u origin main
```

## 2. What gets published (and what never does)

Published:

- `src/` — the SYRIA AI platform (Next.js) — Training Studio, Developer Portal, Chat, Inference views.
- `syria-ai-core/` — the ORIGINAL neural engine: architecture, tokenizer, data engine,
  training engine, inference engine, FastAPI service, scripts, tests, and the REAL trained
  artifacts of EXP-001 (`checkpoint.pt`, tokenizer, metrics, proofs).
- `prisma/`, `public/`, `docs/`, CI workflow, README files.

Never published (kept out by `.gitignore`):

- `.env` (secrets / machine-specific values) — only `.env.example` is published.
- `db/*.db` runtime databases, logs, `node_modules`, `.next`, local proxy config (`Caddyfile`).

## 3. Verify

- CI (`ci.yml`) runs Lint → Typecheck → Build on every push.
- The README renders with the hero banner (`public/images/hero-syria.png`).
- Repository topics suggestion: `ai`, `arabic-nlp`, `foundation-models`, `nextjs`, `open-source`, `syria`, `research`.

## 4. Run it after downloading

```bash
# platform (Next.js)
bun install            # or: npm install / pnpm install
cp .env.example .env   # adjust DATABASE_URL if needed
bunx prisma db push && bun prisma/seed.ts
bun run dev            # http://localhost:3000

# neural core (optional — the real engine)
pip install -r syria-ai-core/requirements.txt
cd syria-ai-core
python3 -m pytest tests/ -v                      # engineering tests
python3 scripts/train_debug.py --steps 1200      # train from scratch on your machine
python3 scripts/generate.py --prompt "دمشق"      # generate from YOUR trained weights
```

## 5. Optional repository settings

- **Default branch:** `main`
- **Branch protection:** require CI to pass for `main`
- **About panel:** description `منصة تطوير وتدريب وإدارة نماذج الذكاء الاصطناعي السورية المستقلة — Independent open-source Syrian foundation models`, website `https://www.syriaai.org`

---

# العربية — خطوات النشر

1. اربط المستودع المحلي بمستودع `samerhoureh/syriaai` وادفع الفرع `main`.
2. استخدم Personal Access Token بصلاحية كتابة على المحتوى (Contents: Read and write).
3. ملف `.env` غير منشور إطلاقاً — انشره دائماً عبر `.env.example` فقط.
4. تأكد من نجاح مسار CI (فحص الشيفرات ← التحقق النوعي ← البناء) بعد أول دفع.
5. لتحميل المشروع وتشغيله محلياً اتبع الأوامر في القسم الرابع أعلاه.
6. اضبط وصف المستودع والموقع من لوحة About.

> ملاحظة: بيانات قاعدة البيانات (`db/*.db`) وملفات السجلات مستثناة من Git عبر `.gitignore` — لا تدفع أي أسرار أو مفاتيح API حقيقية.
