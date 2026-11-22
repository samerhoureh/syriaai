# Security Policy / سياسة الأمان

**English** · العربية أدناه

## Supported versions

| Version | Supported |
|---|---|
| `main` (v0.1.x research) | yes |

This platform is an early research release. Security fixes land directly on `main`.

## Reporting a vulnerability

**Do not open a public issue for security problems.**

- Email: `security@syriaai.org`
- Include: a description, reproduction steps, affected component/endpoint, and any logs or screenshots.
- You will receive an acknowledgement within 72 hours and a fix timeline after triage.

## Security model of this repository

- **No external AI providers.** The codebase never sends prompts or data to third-party model APIs; the chat/inference demo engine is local and rule-based.
- **API keys** in this build are demo artifacts stored in the local SQLite database. The production API (Phase 8+) will move to hashed keys, rotation and audit trails.
- **Least privilege.** The Admin view documents the intended role matrix; public users never get training/data-control surfaces.
- **Data hygiene.** Datasets carry license and provenance metadata; personally sensitive corpora are filtered out during ingestion.
- **Secrets.** `.env` files are git-ignored; `.env.example` documents required variables.

## Scope

In scope: the Next.js application, API routes under `src/app/api`, Prisma schema, and any scripts shipped in this repository.
Out of scope (until deployed): the production `www.syriaai.org` infrastructure, model artifacts, and third-party services.

---

## العربية

### نطاق الدعم

| الإصدار | مدعوم |
|---|---|
| `main` (v0.1.x بحثي) | نعم |

### الإبلاغ عن ثغرة

**لا تفتح Issue عاماً للمشاكل الأمنية.**

- البريد: `security@syriaai.org`
- أرفق: وصفاً، خطوات إعادة الإنتاج، المكون/نقطة النهاية المتأثرة، وأي سجلات أو لقطات.
- سيصلك إشعار بالاستلام خلال 72 ساعة وجدول زمني للإصلاح بعد الفرز.

### نموذج الأمان في هذا المستودع

- **لا مزودين خارجيين للذكاء الاصطناعي.** الشيفرة لا ترسل أي بيانات إلى واجهات نماذج خارجية؛ محرك العرض محلي وقاعدي.
- **مفاتيح API** في هذا الإصدار هي عناصر عرض محفوظة في قاعدة SQLite المحلية. ستتحول الواجهة الإنتاجية (المرحلة 8+) إلى مفاتيح مُجزّأة مع تدوير وسجل تدقيق.
- **أقل صلاحية.** وحدة الإدارة توثق مصفوفة الأدوار؛ المستخدم العام لا يصل لأسطح التدريب أو التحكم بالبيانات.
- **نظافة البيانات.** كل مجموعة تحمل بيانات ترخيص ومصدر؛ وتُصفّى المحتويات الشخصية الحساسة عند الاستيراد.
- **الأسرار.** ملفات `.env` مستثناة من Git، و`.env.example` يوثق المتغيرات المطلوبة.
