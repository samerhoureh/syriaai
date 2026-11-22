# SYRIA AI — First Real Neural Training Report (EXP-001)

**النموذج:** SYRIA AI Debug — decoder-only-baseline
**التاريخ:** 2026-11-21
**البيئة:** CPU فقط — 2 logical cores (Linux x86_64)، 4.06 GB RAM، **No GPU detected**
**الحالة:** TRAINED (debug scale) — أول نموذج عصبي أصلي يُدرَّب فعلياً في المشروع

---

## 1. ملخص التنفيذ

تم بناء النموذج وتدريبه **من الصفر بالكامل**: تهيئة عشوائية لكل الأوزان، Tokenizer مُدرَّب من الصفر على بيانات المشروع، مدونة مرخصة (ويكيبيديا CC BY-SA 4.0 + بذور اصطناعية من إعداد المشروع)، وحلقة تدريب مكتوبة داخل المشروع. لم يُحمَّل أي وزن مسبق، ولم يُستدعَ أي نموذج خارجي.

## 2. الأرقام الفعلية (من artifacts، ليست ادعاءات)

| المقياس | القيمة | المصدر |
|---|---|---|
| المعاملات القابلة للتدريب | **1,349,248** | `training_metadata.json` + سجل init |
| معمارية | vocab 4096, block 256, 4 layers, 4 heads, d_model 128, RMSNorm, weight-tying | `config.json` |
| خطوات التدريب | 1,200 / 1,200 | `metrics.json` |
| التوكنات المعالجة | **2,457,600** | `metrics.json` |
| الخسارة الأولى (أول batch) | 8.3441 | `metrics.json` (`first_train_loss`) |
| الخسارة عند الخطوة 10 (سجل التدريب) | 7.7714 | `log.jsonl` |
| الخسارة النهائية (تدريب) | **3.9207** | `metrics.json` |
| الخسارة النهائية (تحقق) | **4.3299** | `metrics.json` |
| Perplexity (تحقق مستبعد) | 75.35 | `evaluation_results.json` |
| المدة | 469.5 ثانية (~7.8 دقيقة) | `metrics.json` |
| متوسط الإنتاجية التدريبية | 5,234.3 tok/s (CPU) | `metrics.json` (`avg_tokens_per_sec`) |
| إنتاجية الاستدلال | ~396 tok/s (توليد) | `proofs/reload_generation_proof.json` |
| الحجم | checkpoint.pt = 16,256,510 bytes | `ls -l` |
| العتاد | CPU: 2 logical cores؛ GPU: غير متوفر | `monitor.py` (psutil/torch.cuda) |

منحنى الخسارة الكامل موثق خطوة-بخطوة في `syria-ai-core/artifacts/experiments/EXP-001/log.jsonl`.

## 3. الأوامر المنفذة والمخرجات

```bash
# 1) بناء المدونة وتدريب الـTokenizer (392 وثيقة ويكيبيديا + 260 بذرة اصطناعية)
python3 scripts/prepare_data.py --vocab 4096
# → 652 وثيقة مستوردة، 89 مرفوضة (فحص طول)، 563 بعد التحقق،
#   tokenizer: 3832 merge، corpus_hash 9c4c1ea6bbfa6219
# → train 230,168 توكن / valid 10,043 / test 10,484

# 2) التدريب الحقيقي
python3 scripts/train_debug.py --steps 1200 --seed 42
# → [train] SYRIA AI Debug initialized: 1,349,248 trainable parameters
# → final_train_loss 3.9207 · valid_loss 4.3299 · ppl 75.35

# 3) إعادة التحميل والتوليد في عملية مستقلة تماماً
python3 scripts/generate.py --prompt "دمشق" --max-new-tokens 40 --seed 7
# → weights loaded from checkpoint in an independent process (62 ms)
```

## 4. مخرجات التوليد من الأوزان المدربة فعلاً

| Prompt | المخرَج العصبي |
|---|---|
| `دمشق` | `دمشق يوم بس في في السوق في بس في في في وقت.\nفريق الآخر في وقت.\nالسوق طويل، طرطوس` |
| `المدرسة` | `المدرسة في اليوم المدرسة مرتفعة شو الأثمنة بتعلمنا في المدرسة الآخر كنت في بده ف` |
| `The project` | `The project of be confertiating is are be and The the and report وإنجليزية be fo` |

**تقييم صادق:** النموذج تعلم بنى لغوية حقيقية (كلمات عربية ولهجية متصلة مثل "شو الأثمنة بتعلمنا"، "في السوق") — وهذا دليل على تعلم فعلي من الأوزان — لكن الجودة ضعيفة ومتكررة بطبيعتها لنموذج 1.3M معامل على 230K توكن. **هذا التدريب يُثبت صحة خط الأنابيب العصبي، وليس جودة لغوية.**

## 5. الاختبارات الآلية (34/34 ناجحة)

`python3 scripts/run_tests.py` → `artifacts/test_reports/pytest.json`:
- `test_transformer.py` (7): Forward shapes، Backward وتدفق التدرج عبر كل المعاملات، تحديث الأوزان فعلياً، سلامة القناع السببي، توليد autoregressive، خفض الخسارة على batch ثابت.
- `test_tokenizer.py` (13): Round-trip عربي/إنجليزي/كود/رموز، تغطية 256 بايت، Special tokens، حفظ/تحميل، ضغط فعلي.
- `test_data_engine.py` (7): تنظيف، كشف لغة، dedup، تصفية PII، تحقق، تقسيم حتمي، shards+loader.
- `test_trainer.py` (3): جدول LR (warmup+cosine)، **Overfit حقيقي** (خسارة < 2.0 من ~6.9)، حفظ/استئناف Checkpoint بتطابق أوزان تام.
- `test_inference.py` (4): MODEL_NOT_READY، إعادة تحميل + توليد حتمي بالـseed، بروتوكول streaming، إلغاء.

الفحص الذاتي الهندسي: `artifacts/test_reports/selftest.json` — تدرج عبر **43/43** معامل، تحديث أوزان موثق (max delta 0.010)، خسارة أولية 6.2447 = ln(512) نظرياً.

## 6. حدود هذه التجربة (بصراحة)

1. حجم نموذج Debug (~1.35M) — جودة مخرجات محدودة بالتصميم.
2. مدونة تجريبية صغيرة (782KB خام) — النموذج يعرف كلمات قليلة.
3. CPU فقط: لا bf16، لا distributed، لا GPU metrics (العبارة الصادقة: `No GPU detected`).
4. تجربة واحدة (EXP-001) — لا مقارنات معمارية بعد.
5. Nano/Mini/Base/Pro **لم تُدرَّب** وتبقى PLANNED حتى توفر عتاد مناسب.

## 7. الخطوة التالية المباشرة

SYRIA AI Nano (50M) بعد تقدير الموارد: يتطلب GPU واحد ~24GB وزمن تدريب أيام-أسابيع على مدونة أكبر بعشرات GB — خطة الحوسبة موثقة في `docs/ROADMAP.md`.
