<div align="center">

<img src="public/syria-logo.svg" width="72" alt="شعار SYRIA AI" />

# SYRIA AI — منصة البحث والتطوير

**نماذج أساس سورية مستقلة ومفتوحة المصدر — تُدرّب من الصفر وتُشغّل بمنظومتنا الخاصة.**

Independent, open-source Syrian foundation models — trained from scratch, served by our own stack.

[الموقع الرسمي](https://www.syriaai.org) · [حالة المشروع](docs/PROJECT_STATUS.md) · [خارطة الطريق](docs/ROADMAP.md) · [التبليغ عن مشكلة](https://github.com/samerhoureh/syriaai/issues)

[![CI](https://github.com/samerhoureh/syriaai/actions/workflows/ci.yml/badge.svg)](https://github.com/samerhoureh/syriaai/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-green.svg)](LICENSE)
![Status: Research](https://img.shields.io/badge/status-research_v0.1-0E9F52)

`العربية` · [English](README.md)

</div>

---

## ما هذا المشروع؟

**SYRIA AI** مبادرة سورية مستقلة لبناء **نماذج أساس عربية أصلية** تُصمم وتُدرّب وتُشغّل بالكامل داخل منظومة نطورها بأنفسنا — من محرك البيانات والـ Tokenizer الخاص بنا إلى محركي التدريب والاستدلال.

**هذا المستودع يحتوي على المنصة الرسمية**: لوحة بحثية وتطويرية ثنائية اللغة (العربية افتراضياً باتجاه RTL / الإنجليزية LTR) تعمل كاستوديو تدريب وبوابة مطورين لبرنامج المشروع — وهي المرحلة التاسعة من [خارطة الطريق](docs/ROADMAP.md).

> **وضع صادق ومعلن (المرحلة B/المرحلة C).** أول نموذج عصبي أصلي — **SYRIA AI Debug (1,349,248 معامل)** — بُني ودُرِّب **من الصفر** داخل هذا المستودع (تجربة EXP-001: 1,200 خطوة، 2,457,600 توكن معالج ≈ 10.7 دورة كاملة على مدونة التدريب البالغة 230 ألف توكن، خسارة التدريب 8.34 → 3.92، خسارة التحقق 4.33، مع Checkpoint مُتحقق منه بـ SHA-256 وأُعيد تحميله في عملية مستقلة؛ وتجربة تحقق مستقلة **EXP-002** ببذرة مختلفة تعيد إنتاج خط الأنابيب — راجع [docs/TRAINING_REPORT_EXP-002.md](docs/TRAINING_REPORT_EXP-002.md)). هذا يُثبت سلامة خط الأنابيب العصبي، **وليس** جودة لغوية. النماذج `Nano (50M)` و`Mini (150M)` و`Base (1B)` و`Pro (3B)` جميعها **مخططة (PLANNED)** — لم يُدرَّب أي منها ولا توجد أوزان له. المنصة تفصل بدقة بين حالات `REAL` (من artifacts وسجلات تدريب حقيقية) و`DEMO` (بيانات عرض اصطناعية موسومة) و`UNAVAILABLE` (مثل `No GPU detected`)، ولا تختلق تقدماً تدريبياً أو أرقام GPU مطلقاً. لا يُستدعى أي LLM خارجي في أي مكان من هذا الكود.

## أبرز المزايا

- **لوحة التحكم البحثية** — قياسات عتاد حقيقية (CPU/RAM من النظام، وعبارة `No GPU detected` الصادقة عند غياب GPU)، مقاييس تدريب حقيقية من محرك Python، قمع معالجة البيانات (موسوم DEMO)، إجراءات سريعة.
- **استوديو التدريب** — مربوط بمحرك التدريب الحقيقي (Python/PyTorch): بدء تدريب Debug فعلي وإيقافه آمناً، متابعة منحنى الخسارة الحقيقي من سجلات التدريب، فحص ملفات Checkpoint وتقارير الاختبارات الآلية.
- **سجل مجموعات البيانات (SYRIA DATA ENGINE)** — مدون مرخصة مع درجات الجودة ونسب إزالة التكرار وتقسيمات التدريب وسير عمل استيراد.
- **منظومة التقييم** — مصفوفة SYRIA BENCHMARK SUITE بحالات "لم يُقاس بعد" الصادقة وملاحظات المنهجية.
- **ساحة الاستدلال** — معاملات أخذ العينات (درجة الحرارة، Top-P، Top-K، حد التوكنات) مع الأوزان العصبية الحقيقية (خدمة FastAPI على المنفذ 3010) أو محرك عرض قاعدي موسوم بوضوح.
- **وضعا استدلال مفصولان تماماً.** `NEURAL` — توليد من Checkpoint المدرّب الفعلي عبر خدمة FastAPI المستقلة (`syria-ai-core`، المنفذ 3010)؛ وعند غياب الخدمة أو الأوزان تُعيد كل نقاط النهاية العصبية حالة `MODEL_NOT_READY` الصادقة. `DEMO` — محرك قاعدي للعرض فقط، لا يُقدَّم أبداً على أنه النموذج المدرّب.
- **منصة المحادثة SYRIA AI Chat** — محادثة ببث فوري وجلسات محفوظة ودعم Markdown وزر إيقاف التوليد.
- **وحدة API** — دورة حياة المفاتيح (إنشاء/إلغاء)، الفئات، حدود المعدل، ووثائق نقاط النهاية مع أمثلة SDK.
- **بوابة المطورين ومركز البحث** — البدء السريع، طرق المساهمة، خارطة 13 مرحلة، سجلات القرارات المعمارية.
- **وحدة إدارة النظام** — حالة المحركات، مصفوفة صلاحيات بأقل الامتيازات، سجل النشاط، وإعادة تهيئة البيانات.
- **ثنائي اللغة بالتصميم** — العربية (افتراضياً RTL) والإنجليزية (LTR) مع زر تبديل دائم؛ مظهر داكن (افتراضي) وفاتح.

## لقطات

<div align="center">
<img src="public/images/hero-syria.png" alt="لافتة منصة SYRIA AI" width="800" />
</div>

## التقنيات

| الطبقة | الاختيار |
|---|---|
| الإطار | Next.js 16 (App Router) + React 19 + TypeScript 5 |
| التنسيق | Tailwind CSS 4 + shadcn/ui (New York) + Lucide |
| الحالة | Zustand (التنقل) + TanStack Query (حالة الخادم) |
| قاعدة البيانات | Prisma ORM + SQLite (بدون إعداد؛ PostgreSQL هو مسار الترحيل الموثق) |
| التعريب | قاموس عربي/إنجليزي خفيف مع تبديل RTL/LTR |
| الرسوم | مكونات SVG مخصصة بلا اعتماديات خارجية (منحنى خسارة، حلقة تقدم، مقاييس) |

## البدء السريع

```bash
# 1. الاستنساخ
git clone https://github.com/samerhoureh/syriaai.git
cd syriaai

# 2. تثبيت الاعتماديات (bun مستحسن)
bun install

# 3. إعداد البيئة
cp .env.example .env

# 4. إنشاء المخطط وتعبئة بيانات العرض
bun run db:push
bun prisma/seed.ts

# 5. التشغيل
bun run dev          # http://localhost:3000
```

يعمل `npm` و`pnpm` أيضاً (`npx prisma db push` وهكذا).

### المحرك العصبي (Python، لا يحتاج GPU)

النواة العصبية الأصلية في [`syria-ai-core/`](syria-ai-core/) — محول Decoder-Only مكتوب من الصفر بـ PyTorch، وTokenizer BPE مُدرّب من الصفر، ومحركات البيانات والتدريب والاستدلال:

```bash
cd syria-ai-core
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt        # نسخة CPU من torch كافية

python -m pytest                       # اختبارات هندسية (Forward/Backward، الـ Tokenizer،
                                       #   خط البيانات، الـ Checkpoints، الاستدلال — CPU فقط)
python scripts/generate.py --prompt "دمشق" --max-new-tokens 48   # استدلال من الأوزان الحقيقية

python -m uvicorn syria_ai.inference.service:app --host 127.0.0.1 --port 3010   # خدمة الاستدلال
```

راجع [MODEL_CARD.md](MODEL_CARD.md) و[docs/MODEL_DISTRIBUTION.md](docs/MODEL_DISTRIBUTION.md) لأدلة التنزيل والتحقق بـ SHA-256 والتكامل.

## بنية المشروع

```
syria-ai-core/              # المحرك العصبي الأصلي (Python/PyTorch، من الصفر)
├── syria_ai/
│   ├── model/              # محول Decoder-Only + الإعدادات
│   ├── tokenizer/          # SYRIA TOKENIZER (BPE من الصفر)
│   ├── data/               # SYRIA DATA ENGINE (تنظيف، إزالة تكرار، تقسيم، حزم)
│   ├── training/           # SYRIA TRAINING ENGINE (AdamW، Checkpoints، مراقبة)
│   ├── inference/          # محرك الاستدلال + خدمة FastAPI (المنفذ 3010)
│   └── registry.py         # سجل النماذج والتجارب
├── scripts/                # prepare_data, train_debug, generate, selftest
├── tests/                  # مجموعة اختبارات pytest (CPU فقط)
├── artifacts/              # Checkpoints وسجلات التجارب وتقارير الاختبارات
└── data/                   # المدونات المرخصة + الشُرَط المُعالجة/الـ Tokenizer
src/
├── app/
│   ├── api/                 # نقاط النهاية REST (النماذج، التجارب، البيانات، ...)
│   ├── layout.tsx           # الجذر (الخطوط، الميتاداتا، المزودات)
│   ├── page.tsx             # هيكل المنصة أحادي المسار
│   └── globals.css          # رموز التصميم (داكن/فاتح، RTL)
├── components/
│   ├── syria/
│   │   ├── shell.tsx        # الشريط الجانبي والعلوي والبحث وحالة النظام
│   │   ├── views/           # 11 واجهة (لوحة التحكم، النماذج، التجارب، ...)
│   │   ├── charts.tsx       # رسوم SVG مخصصة
│   │   ├── language-provider.tsx
│   │   └── ui-bits.tsx      # شارات الحالة وبطاقات الأقسام والعلم
│   └── ui/                  # مكونات shadcn/ui
└── lib/
    ├── i18n/                # قواميس AR/EN (ملف لكل واجهة)
    ├── db.ts                # عميل Prisma
    ├── seed.ts              # بيانات العرض/البحث (قابلة لإعادة التهيئة)
    ├── demo-engine.ts       # محرك عرض محلي قاعدي (بلا LLM خارجي)
    ├── neural-service.ts    # الجسر إلى محرك FastAPI العصبي (فحوص صحة، دورة حياة بمثيل واحد، حالة MODEL_NOT_READY الصادقة)
    └── types.ts / api.ts / format.ts / store.ts
prisma/schema.prisma         # نموذج البيانات (SQLite)
docs/                        # وثائق المشروع والبحث
```

## واجهة API

كل الاستجابات بصيغة `{ ok: true, data }` أو `{ ok: false, error }`.

| نقطة النهاية | الطرق | الوصف |
|---|---|---|
| `/api/models` | GET | عائلة النماذج الأساسية والمتخصصة |
| `/api/experiments` | GET, POST | قائمة التجارب (سجلات حقيقية مخزنة؛ لا يوجد drift اصطناعي) وإنشاء تجربة |
| `/api/experiments/[id]` | GET, PATCH | التفاصيل مع نقاط الخسارة؛ بدء/إيقاف/استئناف |
| `/api/datasets` | GET, POST | سجل البيانات؛ تسجيل مدونة جديدة (حالة: مراجعة) |
| `/api/benchmarks` | GET | مصفوفة منظومة التقييم |
| `/api/keys` | GET, POST | مفاتيح API؛ الإلغاء عبر DELETE على `/api/keys/[id]` |
| `/api/system` | GET | المحركات والمقاييس وخط المعالجة والحالة |
| `/api/activity` | GET | أحداث المنصة الأخيرة |
| `/api/chat` | POST (SSE) | محادثة ببث عبر محرك العرض المحلي (موسومة DEMO) |
| `/api/chat/sessions` | GET, POST | الجلسات؛ `[id]` عبر GET/PATCH/DELETE |
| `/api/inference` | POST | استدلال ساحة التجريب مع المقاييس |
| `/api/system/reset` | POST | إعادة تعبئة بيانات العرض (للمدير) |

### جسر المحرك العصبي (`/api/neural/*` — وسيط إلى خدمة FastAPI)

تتحدث هذه النقاط مع Checkpoint المدرّب الفعلي. وعند غياب خدمة Python أو الأوزان تُعيد حالة `MODEL_NOT_READY` صريحة بدلاً من التظاهر.

| نقطة النهاية | الطرق | الوصف |
|---|---|---|
| `/api/neural/system` | GET | صحة المحرك العصبي وتقرير العتاد وجاهزية النموذج |
| `/api/neural/models` | GET | النماذج من سجل الـ artifacts الحقيقي |
| `/api/neural/experiments` | GET | التجارب الحقيقية (EXP-001، EXP-002) بمقاييسها الفعلية |
| `/api/neural/training` | GET/POST | حالة/بدء/إيقاف التدريب الحقيقي (محرك Python) |
| `/api/neural/generate` | POST | توليد من الأوزان المدرّبة |
| `/api/neural/chat` | POST (SSE) | توليد ببث من الأوزان المدرّبة |

## المبادئ

1. **أوزان أصلية فقط.** لا تحميل Checkpoints جاهزة، لا Embeddings مُدرّبة مسبقاً، لا Distillation، لا Fine-Tuning لنماذج خارجية.
2. **Tokenizer ومحرك بيانات مستقلان.** يُدرَّب الـ Tokenizer على بيانات المشروع، وكل مجموعة موثقة المصدر والترخيص.
3. **لا نماذج خارجية.** المنصة ومحرك العرض لا يستدعيان أي نموذج تابع لطرف ثالث.
4. **حالات صادقة.** حالات "مخطط/في الانتظار/تحت التدريب" صريحة، والاختبارات غير المقاسة تظهر بلا درجات، والميزات المحاكاة موسومة.
5. **قابلية إعادة الإنتاج.** البذور والتكوينات وCheckpoints ومجموعات التقييم مسجلة لكل تجربة.

## الوثائق

- [حالة المشروع](docs/PROJECT_STATUS.md) — المرحلة الحالية والمخرجات
- [خارطة الطريق](docs/ROADMAP.md) — خطة التنفيذ من PHASE 0 إلى 12
- [المعمارية](docs/ARCHITECTURE.md) — تصميم المنصة واتجاه بحث SDSA
- [سجل النماذج](docs/MODEL_REGISTRY.md) — عائلة Nano/Mini/Base/Pro
- [بطاقة النموذج](MODEL_CARD.md) — حقائق syria-ai-debug (EXP-001) وحدوده والترخيص
- [توزيع النموذج](docs/MODEL_DISTRIBUTION.md) — التنزيل والتحقق بـ SHA-256 وأدلة التشغيل
- [مراجعة البيانات](docs/DATASET_REVIEW.md) — المصادر والتراخيص والتوكنات الفريدة مقابل المعالجة واختبار التلوث
- [خطة التوسع](docs/SCALING_PLAN.md) — Debug → 5M → 15M → Nano مع تقديرات الموارد وبوابات القرار
- [بروتوكول بحث SDSA](docs/SDSA_RESEARCH_PROTOCOL.md) — فرضية معمارية الحالتين القابلة للدحض
- [تحقق التثبيت النظيف](docs/FRESH_INSTALL_VERIFICATION.md) — أدلة إعادة الإنتاج من نسخة نظيفة
- [تدقيق الأمن](docs/SECURITY_AUDIT.md) — التعامل مع الرموز وفحص أسرار المستودع
- [سجل البيانات](docs/DATASET_REGISTRY.md) — مدون SYRIA DATA ENGINE
- [دليل النشر](docs/PUBLISHING.md) — كيفية نشر هذا المستودع على GitHub
- [README بالإنجليزية](README.md)

## المساهمة

نرحب بمساهمات بحثية وهندسية — راجع [CONTRIBUTING.md](CONTRIBUTING.md). بالمشاركة أنت توافق على [مدونة السلوك](CODE_OF_CONDUCT.md). المشاكل الأمنية: [SECURITY.md](SECURITY.md).

## الترخيص

الشيفرة المصدرية: **Apache-2.0** — راجع [LICENSE](LICENSE). الأوزان ومجموعات البيانات، عند إصدارها، تُنشر بشروطها الموثقة الخاصة (مراجعة بحثية أولاً).

---

<div align="center">
<sub><b>SYRIA AI</b> — ذكاء اصطناعي مفتوح المصدر من أجل سوريا · Open-Source AI for Syria</sub>
</div>
