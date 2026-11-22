# Status: Phase B — Original AI Model Engineering (live)

## المرحلة الحالية

**PHASE B — بناء النموذج العصبي الأصلي**: أول نموذج SYRIA AI (Debug) **أُنشئ ودُرِّب فعلياً من الصفر** — تجربة EXP-001 موثقة بالأوزان والسجلات.

## الحالة الصادقة للعائلة

| النموذج | الحالة | الدليل |
|---|---|---|
| **SYRIA AI Debug** (~1.35M) | **TRAINED** (debug scale) | `syria-ai-core/artifacts/models/syria-ai-debug/checkpoint.pt` (16.2MB) + `TRAINING_REPORT_EXP-001.md` |
| SYRIA AI Nano — 50M | **PLANNED** | يتطلب GPU ~24GB — لم يبدأ التدريب، لا أوزان موجودة |
| SYRIA AI Mini — 150M | **PLANNED** | لم يبدأ التدريب |
| SYRIA AI Base — 1B | PLANNED | — |
| SYRIA AI Pro — 3B | PLANNED | — |
| النماذج المتخصصة (Code/Education/Reconstruction/Agriculture/Administration/Research) | PLANNED | تُشتق فقط بعد وجود نموذج أساس مدرَّب |

> **ملاحظة صرامة علمية:** الحالات السابقة (Nano "experimentally open"، Mini "EXP-024 @ 64%") كانت **بيانات عرض تجريبية** وليست تدريباً حقيقياً — صُححت جميعها الآن، وأُزيلت آلية التقدم الوهمي (`withDrift`) نهائياً من المنصة. كل بيانات العرض القديمة موجودة فقط تحت علم `DEMO`.

## تتبع المراحل

| المرحلة | الحالة | ملاحظات |
|---|---|---|
| 0 — اكتشاف تقني | مكتمل | تدقيق بيئة: 2 CPU / 4GB RAM / لا GPU |
| 1 — أساس هندسي | مكتمل | منصة Next.js + توثيق |
| 2 — النموذج العصبي الأصلي | **مكتمل (فعلي)** | Transformer من الصفر: 34/34 اختبار، تدفق تدرج 43/43 معامل |
| 3 — Tokenizer + خط البيانات | **مكتمل (فعلي)** | SYRIA TOKENIZER (3832 merge) + DATA ENGINE + مدونة مرخصة 230K توكن |
| 4 — أول تدريب مسبق ناجح | **مكتمل (فعلي)** | **EXP-001**: 1,200 خطوة، 2.46M توكن، loss 7.77→3.92، ppl 75.35 |
| 5 — بحث المعمارية (SDSA) | وثيقة بحثية جاهزة | `docs/SDSA_RESEARCH.md` — لا ادعاء تفوق قبل التجارب |
| 6 — Nano 50M | **BLOCKED: يتطلب GPU** | خطة الموارد جاهزة في ROADMAP |
| 7 — محرك الاستدلال | **مكتمل (فعلي)** | FastAPI مستقلة (3010) + إعادة تحميل موثقة + streaming + إلغاء |
| 8 — API Backend | مكتمل | `/api/neural/*` بوابة حقيقية + فصل REAL/DEMO/UNAVAILABLE |
| 9 — الويب واللوحات | مكتمل | Training Studio مربوط بالمحرك الفعلي (بدء/إيقاف/متابعة حقيقية) |
| 10-12 | مخطط | نماذج متخصصة → إصدار → تحصين |

## مؤشرات التحقق المستقلة

- **34/34** اختبار pytest ناجح → `syria-ai-core/artifacts/test_reports/pytest.json`
- الفحص الذاتي: تدرج على **43/43** معامل، تحديث أوزان فعلي → `selftest.json`
- إعادة تحميل Checkpoint في عملية مستقلة + توليد عصبي موثق → `artifacts/proofs/reload_generation_proof.json`
- تقرير العتاد الصادق: `No GPU detected` (لا GPU في بيئة التنفيذ الحالية)
