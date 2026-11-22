# SYRIA AI CORE

هذا هو المحرك العصبي الأصلي لمشروع **SYRIA AI** — مكتوب بلغة Python باستخدام PyTorch،
ويُبنى النموذج ويُدرَّب من الصفر بالكامل: لا أوزان مسبقة، لا Tokenizer جاهز، لا اتصال بأي LLM خارجي.

## المكونات

| المكون | المسار | الوصف |
|---|---|---|
| SYRIA NEURAL ENGINE | `syria_ai/model/` | Decoder-Only Transformer من الصفر (Attention يدوي، RMSNorm، GELU، Positional Embeddings) |
| SYRIA TOKENIZER | `syria_ai/tokenizer/` | Byte-level BPE يُدرَّب من الصفر على بيانات المشروع (عربي فصحى + لهجات + إنجليزي + كود) |
| SYRIA DATA ENGINE | `syria_ai/data/` | استيراد، تنظيف، إزالة تكرار، تصفية خصوصية، تقسيم، ترميز، Sharding، DataLoader |
| SYRIA TRAINING ENGINE | `syria_ai/training/` | حلقة تدريب كاملة: AdamW، Warmup+Cosine، Grad Accumulation، Clipping، Checkpoints، Resume، Validation، مراقبة |
| SYRIA INFERENCE ENGINE | `syria_ai/inference/` | تحميل الأوزان، توليد نص (Temperature/Top-k/Top-p)، Streaming، إلغاء، مقاييس |
| Inference Service | `syria_ai/inference/service.py` | خدمة FastAPI مستقلة على المنفذ 3010 |

## التشغيل السريع

```bash
cd syria-ai-core

# 1. تشغيل اختبارات الهندسة (Forward/Backward/Tokenizer/Data/Overfit)
python3 -m pytest tests/ -v

# 2. تنفيذ أول تدريب حقيقي لنموذج Debug (يستغرق دقائق على CPU)
python3 scripts/train_debug.py --steps 1200

# 3. توليد نص من الأوزان المدربة فعلياً (عملية مستقلة تماماً)
python3 scripts/generate.py --prompt "دمشق"

# 4. تشغيل خدمة الاستدلال المستقلة (منفذ 3010)
python3 -m uvicorn syria_ai.inference.service:app --host 127.0.0.1 --port 3010
```

## الحدود الحالية (بصراحة كاملة)

- نموذج Debug (1,349,248 معامل) مدرَّب على مدونة تجريبية صغيرة: **يُثبت صحة التدريب والاستدلال فقط،
  وجودة مخرجاته اللغوية ضعيفة بطبيعتها في هذا الإصدار.**
- لا يوجد GPU في بيئة التنفيذ الحالية: كل التجارب على CPU، والتدريب الأكبر (Nano/Mini) محجوز
  حتى توفر عتاد مناسب.
- نماذج Nano/Mini/Base/Pro **مخططة** (PLANNED) وليست مدرّبة — انظر `artifacts/registry/model_registry.json`.
