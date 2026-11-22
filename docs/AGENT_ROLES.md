# SYRIA AI — Development Agent Roles & Execution Log (Phase B)

**المرحلة:** B — Original AI Model Engineering
**التنسيق:** Master Orchestrator (الجلسة الرئيسية) — بيئة التنفيذ لا تدعم وكلاء مستقلين بالتوازي على مستوى العمليات، لذا نُفّذت الأدوار **بصورة متسلسلة/متداخلة موثقة** مع فصل صارم للملفات بين الأدوار المتوازية (Python core vs Next.js backend).

## الأدوار والمسؤوليات والنواتج

### 1. Research Agent (Neural Architecture)
- **المهمة:** تصميم وتنفيذ Decoder-Only Transformer من الصفر.
- **الناتج:** `syria-ai-core/syria_ai/model/{config,transformer,utils}.py`
- **الإثبات:** `artifacts/test_reports/selftest.json` (تدفق تدرج 43/43 معامل، قناع سببي سليم، تحديث أوزان فعلي).

### 2. Tokenizer Agent
- **المهمة:** بناء SYRIA TOKENIZER (Byte-BPE) من الصفر.
- **الناتج:** `syria-ai-core/syria_ai/tokenizer/bpe.py` + `data/processed/tokenizer/tokenizer.json`
- **الإثبات:** 13 اختباراً ناجحاً في `tests/test_tokenizer.py`.

### 3. Dataset Agent
- **المهمة:** SYRIA DATA ENGINE + مدونة مرخصة (ويكيبيديا CC BY-SA + بذور المشروع).
- **الناتج:** `syria_ai/data/{engine,corpus_fetch,seed_synthetic}.py`، `scripts/prepare_data.py`، `data/seed_corpus/ATTRIBUTION.md`، `data/processed/dataset_stats.json`
- **الإثبات:** 7 اختبارات ناجحة + إحصاءات المدونة المكتوبة فعلياً.

### 4. Training Agent
- **المهمة:** SYRIA TRAINING ENGINE وتنفيذ أول تدريب حقيقي (EXP-001).
- **الناتج:** `syria_ai/training/{trainer,monitor}.py`، `scripts/train_debug.py`، `artifacts/experiments/EXP-001/`، `artifacts/models/syria-ai-debug/`
- **الإثبات:** اختبار Overfit + سجل `log.jsonl` بخطوات فعلية + `metrics.json`.

### 5. GPU Agent (Hardware Analysis)
- **المهمة:** تقارير عتاد صادقة عبر psutil/torch.cuda/nvidia-smi.
- **الناتج:** `syria_ai/training/monitor.py`
- **النتيجة في هذه البيئة:** `No GPU detected` (2 CPU، 4GB RAM) — موثقة في كل مخرجات `/v1/system`.

### 6. Inference Agent
- **المهمة:** محرك الاستدلال + خدمة FastAPI مستقلة.
- **الناتج:** `syria_ai/inference/{engine,service}.py`، `scripts/generate.py`
- **الإثبات:** `tests/test_inference.py` (4 اختبارات: إعادة تحميل، توليد حتمي بالـseed، بروتوكول streaming، إلغاء).

### 7. Evaluation Agent
- **المهمة:** تنفيذ الاختبارات الآلية وتقارير JSON.
- **الناتج:** `tests/` (34 اختباراً)، `scripts/run_tests.py`، `scripts/selftest.py`، `artifacts/test_reports/{pytest,selftest}.json`

### 8. Backend Integration Agent
- **المهمة:** ربط Next.js بخدمة Python؛ إزالة الإيهام (withDrift، GPU وهمية، منحنيات اصطناعية)؛ فصل REAL/DEMO/UNAVAILABLE؛ تحديث Training Studio والشات.
- **الناتج:** تعديلات على `src/app/api/neural/*`، `src/app/api/{experiments,system,chat}/route.ts`، `src/lib/seed.ts`، `src/components/syria/views/{experiments,chat,dashboard}.tsx`

### 9. QA Agent
- **المهمة:** تحقق مستقل: lint + فحص متصفح + مراجعة الادعاءات مقابل الملفات.
- **الناتج:** ملخص التحقق النهائي في تقرير التسليم.

## قواعد التنسيق المعتمدة
1. **فصل الملفات:** وكلاء Python يعملون داخل `syria-ai-core/` حصراً؛ وكلاء الواجهة داخل `src/` حصراً — لا تعارض كتابة.
2. **العقد أولاً:** تم تثبيت عقد REST (منفذ 3010) قبل البناء المتوازي.
3. **بلا ادعاءات:** كل "نجاح" يجب أن يرتبط بملف/أمر/مخرَج فعلي، وإلا يُصنف NOT IMPLEMENTED أو BLOCKED.
4. **الأولوية:** Debug → Real Training → Checkpoint → Real Inference → API Integration → (لاحقاً Nano).
