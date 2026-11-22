# Contributing to SYRIA AI / المساهمة في SYRIA AI

**English** · [العربية أدناه](#المساهمة-بالعربية)

Thank you for considering contributing to an independent, open-source Syrian AI project. Every contribution — code, research, documentation, evaluation protocols — moves the program forward.

## Ground rules

1. **Originality.** Contributions to the model/training pipeline must respect the originality policy: no pre-trained checkpoints, no pre-trained embeddings, no external tokenizers, no distillation from external LLMs, no using external models to generate training data or reference answers.
2. **No external model calls** in platform code. The demo engine is local and rule-based on purpose.
3. **Honesty.** Never fake metrics, statuses, or benchmark results. Unmeasured means unmeasured.
4. **Least privilege.** UI features that touch training/data/admin surfaces must respect the role matrix in the Admin view.

## How to contribute

1. **Discuss first** — open an [issue](https://github.com/samerhoureh/syriaai/issues) describing the change (bug, research idea, feature).
2. **Fork & branch** — `feat/<topic>`, `fix/<topic>`, `docs/<topic>`, `research/<topic>`.
3. **Implement** — TypeScript strict, ESLint clean (`bun run lint`), Tailwind + shadcn/ui patterns, bilingual labels (AR + EN) for any user-visible string.
4. **Verify locally**
   ```bash
   bun install
   cp .env.example .env
   bun run db:push && bun prisma/seed.ts
   bun run dev
   ```
   Check the affected views in both AR and EN, dark and light themes, and mobile widths.
5. **Open a PR** — small, focused PRs merge faster. Describe what changed, why, and how you verified it.

## Areas where help is most needed

- Evaluation protocols for **Syrian dialect** understanding (they must be original, licensed and documented).
- Dataset auditing: license reviews, dataset cards, provenance notes.
- Documentation quality: model cards, training reports, reproducibility guides.
- Frontend polish: accessibility, RTL edge cases, performance.
- Backend hardening: rate limiting, request validation, test coverage.

## Code style

- TypeScript everywhere; `type` imports preferred where possible.
- Server-side data access via Prisma only (`src/lib/db.ts`).
- API responses always `{ ok: true, data }` / `{ ok: false, error }`.
- Numbers rendered with the `num` class + `dir="ltr"`; text uses logical properties (`ms-/me-`, `text-start/end`).
- No emojis in UI or code comments.

---

## المساهمة بالعربية

شكراً لاهتمامك بالمساهمة في مشروع سوري مستقل ومفتوح المصدر. كل مساهمة — برمجية أو بحثية أو توثيقية — تدفع المشروع قدماً.

### القواعد الأساسية

1. **الأصالة.** أي مساهمة في مسار النموذج/التدريب يجب أن تحترم سياسة الأصالة: لا Checkpoints جاهزة، لا Embeddings مُسبقة، لا Tokenizer خارجي، لا Distillation من نماذج خارجية، ولا استخدام نماذج خارجية لتوليد بيانات التدريب أو الإجابات المرجعية.
2. **لا استدعاء لنماذج خارجية** في شيفرة المنصة؛ محرك العرض محلي وقاعدي عن قصد.
3. **الصدق.** لا تختلق مقاييس أو حالات أو نتائج تقييم — غير المقاس يبقى غير مقاس.
4. **أقل صلاحية.** أي ميزة تلمس أسطح التدريب/البيانات/الإدارة يجب أن تحترم مصفوفة الأدوار في وحدة الإدارة.

### خطوات المساهمة

1. **ناقش أولاً** — افتح Issue يشرح التغيير المقترح.
2. **Fork وفرع** — `feat/<موضوع>` أو `fix/<موضوع>` أو `docs/<موضوع>` أو `research/<موضوع>`.
3. **نفّذ** — TypeScript صارم، ESLint نظيف (`bun run lint`)، وفق أنماط Tailwind + shadcn/ui، وكل نص ظاهر للمستخدم ثنائي اللغة (عربي + إنجليزي).
4. **تحقق محلياً** — شغّل المنصة، وافحص الواجهات المتأثرة بالعربية والإنجليزية وبالمظهرين الداكن والفاتح وبعرض الجوال.
5. **افتح Pull Request** — صغير ومركز، مع وصف ما تغير ولماذا وكيف تحققت منه.

### المجالات الأكثر احتياجاً

- بروتوكولات تقييم **اللهجات السورية** (أصلية ومرخصة وموثقة).
- تدقيق البيانات: مراجعة التراخيص وبطاقات المجموعات وتوثيق المصادر.
- جودة التوثيق: بطاقات النماذج وتقارير التدريب وأدلة إعادة الإنتاج.
- تحسين الواجهة: الوصولية، حالات RTL الحدية، الأداء.
- متانة الخادم: حدود المعدل، التحقق من الطلبات، التغطية الاختبارية.
