/* ---------------------------------------------------------------------------
 * SYRIA AI — local demo inference engine.
 *
 * This is NOT a neural language model. It is a deterministic, rule-based
 * simulation used to demonstrate the inference/streaming UX while the real
 * SYRIA AI weights (EXP-024 / Mini) are still in pretraining. Per project
 * policy, no external LLM is called anywhere in this platform.
 * ------------------------------------------------------------------------- */

export const ENGINE_ID = "syria-demo-engine"
export const ENGINE_VERSION = "v0.1.0"

export function detectLang(text: string): "ar" | "en" {
  return /[\u0600-\u06FF]/.test(text) ? "ar" : "en"
}

interface Topic {
  keys: RegExp
  ar: string
  en: string
}

const TOPICS: Topic[] = [
  {
    keys: /مرحب|السلام|أهلا|اهلا|هلا|hi|hello|hey/i,
    ar: "أهلاً بك في منصة SYRIA AI.\n\nأنا جزء من **محرك العرض التجريبي** — النموذج الفعلي (SYRIA AI Mini، 150M معامل) لا يزال قيد التدريب المسبق ضمن التجربة EXP-024 وقد بلغ 64%. يمكنك متابعة منحنى الخسارة مباشرة من لوحة التحكم، أو استكشاف النماذج ومجموعات البيانات من القائمة الجانبية.",
    en: "Welcome to the SYRIA AI platform.\n\nI am part of the **demo engine** — the actual model (SYRIA AI Mini, 150M params) is still in pretraining under experiment EXP-024 at 64% progress. Follow the live loss curve on the dashboard, or explore the models and datasets from the sidebar.",
  },
  {
    keys: /من أنت|ما أنت|عرف نفسك|who are you|what are you|about you/i,
    ar: "أنا واجهة **محرك العرض التجريبي** داخل منظومة SYRIA AI.\n\nللتوضيح الكامل: أنا لست نموذجاً عصبياً مُدرّباً، بل محاكاة حتمية تعرض تجربة الاستدلال أثناء إعداد أوزان SYRIA AI الحقيقية. النماذج الأصلية (Nano 50M مفتوح تجريبياً، Mini 150M تحت التدريب، وBase وPro قيد التخطيط) تُبنى وتُدرّب من الصفر بأوزان مستقلة تماماً.",
    en: "I am the **demo engine** interface inside the SYRIA AI system.\n\nFull transparency: I am not a trained neural model — I am a deterministic simulation demonstrating the inference UX while the real SYRIA AI weights are being prepared. The original models (Nano 50M experimentally open, Mini 150M in training, Base and Pro in planning) are built and trained from scratch with fully independent weights.",
  },
  {
    keys: /نماذج|الموديل|models|family|عائلة/i,
    ar: "عائلة نماذج SYRIA AI الأساسية:\n\n- **SYRIA AI Nano** — 50M معامل، مفتوح تجريبياً (أول إصدار بحثي).\n- **SYRIA AI Mini** — 150M معامل، تحت التدريب حالياً (EXP-024، 64%).\n- **SYRIA AI Base** — 1B معامل، قيد التخطيط.\n- **SYRIA AI Pro** — 3B معامل، مخطط مستقبلي.\n\nكلها بمعمارية Decoder-Only تُدرّب من الصفر على مدون SYRIA DATA ENGINE.",
    en: "The SYRIA AI foundation family:\n\n- **SYRIA AI Nano** — 50M params, experimentally open (first research release).\n- **SYRIA AI Mini** — 150M params, currently training (EXP-024, 64%).\n- **SYRIA AI Base** — 1B params, in planning.\n- **SYRIA AI Pro** — 3B params, future target.\n\nAll use a Decoder-Only architecture trained from scratch on the SYRIA DATA ENGINE corpus.",
  },
  {
    keys: /تدريب|التقدم|الخسارة|loss|progress|training|exp-024|تجربة/i,
    ar: "حالة التدريب الحالية (EXP-024 — Mini 150M):\n\n- التقدم: 64%\n- الخطوة الحالية: 256,480 من 400,000\n- التوكنات المعالجة: 18.7B من 30.0B\n- خسارة التدريب: 1.127 — خسارة التحقق: 1.284\n- المعدل: ~42,300 tok/s\n- الوقت المتبقي المتوقع: أسبوعان و6 أيام تقريباً",
    en: "Current training status (EXP-024 — Mini 150M):\n\n- Progress: 64%\n- Current step: 256,480 of 400,000\n- Tokens processed: 18.7B of 30.0B\n- Train loss: 1.127 — Validation loss: 1.284\n- Throughput: ~42,300 tok/s\n- Estimated remaining: about 2 weeks and 6 days",
  },
  {
    keys: /بيانات|datasets|مدون|corpus|مجموعة/i,
    ar: "منظومة **SYRIA DATA ENGINE** تدير دورة البيانات كاملة: جمع، تنظيف، إزالة تكرار، تصفية وترخيص، ثم تجهيز أجزاء التدريب. القمع الحالي يمر بنحو 11.9M وثيقة حتى 10.8M وثيقة جاهزة للتدريب، وتشمل مدون اللهجات السورية، الويب العربي المُصفّى، الموسوعات، والكتب العامة. كل مجموعة موثقة المصدر والترخيص في صفحة مجموعات البيانات.",
    en: "The **SYRIA DATA ENGINE** manages the full data lifecycle: collection, cleaning, deduplication, license filtering, then training shards. The current funnel processes ~11.9M documents down to 10.8M training-ready ones, covering Syrian dialect corpora, filtered Arabic web, encyclopedias and public books. Every dataset has documented source and license on the datasets page.",
  },
  {
    keys: /tokenizer|تقطيع|مفردات|vocab/i,
    ar: "يُدرَّب **Tokenizer مستقل** على بيانات المشروع نفسها (لا نستخدم مُقطّعاً خارجياً جاهزاً). يجري تقييم أحجام مفردات 16K و32K و48K مع قياس كفاءة التقطيع للعربية والإنجليزية والنصوص المختلطة، ويستخدم النموذج الحالي مفردات 32,768 توكن لـ Mini.",
    en: "An **independent tokenizer** is trained on the project's own data (no ready-made external tokenizer). Vocabulary sizes 16K / 32K / 48K are being evaluated for Arabic, English and mixed-text efficiency; the current Mini configuration uses 32,768 tokens vocabulary.",
  },
  {
    keys: /معمارية|architecture|sdsa|transformer/i,
    ar: "خط الأساس: **Decoder-Only Transformer** مكتوب بالكامل بشيفرة المشروع (Embedding، Causal Self-Attention، FFN، Residual، RMSNorm). بعد نجاح خط الأساس تُختبر معمارية بحثية تجريبية باسم **SDSA (Syria Dual-State Architecture)** تميز بين تمثيل لغوي وتمثيل بنيوي للكيانات، وتُعتمد فقط إذا أثبتت فائدة قابلة للقياس مقارنة بخط الأساس.",
    en: "The baseline is a **Decoder-Only Transformer** written entirely in project code (Embedding, Causal Self-Attention, FFN, Residual, RMSNorm). After the baseline succeeds, an experimental research architecture called **SDSA (Syria Dual-State Architecture)** separates a language representation state from a structured entity state, and is only adopted if it proves measurable benefit over the baseline.",
  },
  {
    keys: /خارطة|خطة|مراحل|roadmap|phases|مرحلة/i,
    ar: "خارطة التنفيذ: المرحلة 0-2 مكتملة (أساس هندسي ونموذج Debug)، المرحلة 3-4 مكتملة (Tokenizer وقمع البيانات وأول Pretraining ناجح)، نحن الآن في **المرحلة 6: تدريب Nano** مع التحقق المستمر، تليها المرحلة 7 (محرك الاستدلال) ثم 8-9 (API والويب — المنصة التي تستخدمها الآن).",
    en: "Execution roadmap: Phases 0-2 complete (engineering foundation and Debug model), Phases 3-4 complete (tokenizer, data funnel, first successful pretraining). We are now in **Phase 6: Nano training** with continuous validation, followed by Phase 7 (inference engine) then 8-9 (API and web — the platform you are using now).",
  },
  {
    keys: /مساهمة|contribute|github|مستودع/i,
    ar: "المشروع **مفتوح المصدر بالكامل**. يمكنك المساهمة عبر مستودع GitHub: قراءة تقارير التدريب، مراجعة شيفرة المعمارية، تحسين وثائق النماذج والبيانات، أو اقتراح بروتوكولات تقييم للهجات السورية. راجع CONTRIBUTING.md وCODE_OF_CONDUCT.md في المستودع.",
    en: "The project is **fully open source**. Contribute via the GitHub repository: review training reports, audit architecture code, improve model/dataset documentation, or propose Syrian dialect evaluation protocols. See CONTRIBUTING.md and CODE_OF_CONDUCT.md in the repository.",
  },
  {
    keys: /api|واجهة|mفتاح|key/i,
    ar: "واجهة API (المرحلة 8) تعرض حالياً مفتاحاً تجريبياً داخلياً فقط. عند اكتمال أوزان Mini ستتوفر نقاط النهاية `/v1/models` و`/v1/chat/completions` مع بث SSE، وحدود معدل حسب الفئة. لا تُرسل أي طلبات إلى أي LLM خارجي — كل شيء يعمل داخل منظومتنا.",
    en: "The API (Phase 8) currently exposes an internal demo key only. Once Mini weights complete, `/v1/models` and `/v1/chat/completions` endpoints with SSE streaming and tiered rate limits will go live. No requests are ever sent to external LLMs — everything runs inside our own stack.",
  },
  {
    keys: /سوريا|syria|مشروع|لماذا|why|vision|رؤية/i,
    ar: "**SYRIA AI** مبادرة سورية مستقلة لبناء نماذج أساس عربية مفتوحة المصدر تُصمم وتُدرّب وتُشغّل داخل منظومة نطورها بأنفسنا — من بياناتنا وTokenizer الخاص بنا إلى محرك التدريب والاستدلال. الرؤية: قدرة ذكاء اصطناعي سيادية للغة العربية ولهجاتها تخدم التعليم والزراعة وإعادة الإعمار والعلوم.",
    en: "**SYRIA AI** is an independent Syrian initiative building open-source Arabic foundation models designed, trained and served by a stack we develop ourselves — from our data and custom tokenizer to the training and inference engines. Vision: sovereign Arabic-language AI capability serving education, agriculture, reconstruction and science.",
  },
  {
    keys: /أمثلة|كود|code|مثال|example|python|javascript/i,
    ar: "مثال استخدام قادم للواجهة البرمجية (بعد اكتمال الأوزان):\n\n```python\nfrom syria_ai import Client\nclient = Client(api_key=\"SK-syria-...\")\n\nfor chunk in client.chat.stream(\n    model=\"syria-ai-mini\",\n    messages=[{\"role\": \"user\", \"content\": \"مرحباً\"}],\n):\n    print(chunk.delta, end=\"\")\n```\n\nحتى الآن لا توجد أوزان منشورة للاستدلال العام — النموذج الوحيد المتاح تجريبياً هو Nano لمراجعة بحثية.",
    en: "Example of the upcoming API (once weights complete):\n\n```python\nfrom syria_ai import Client\nclient = Client(api_key=\"SK-syria-...\")\n\nfor chunk in client.chat.stream(\n    model=\"syria-ai-mini\",\n    messages=[{\"role\": \"user\", \"content\": \"Hello\"}],\n):\n    print(chunk.delta, end=\"\")\n```\n\nNo public inference weights exist yet — the only experimentally available model is Nano for research review.",
  },
]

const FALLBACK = {
  ar: "سؤال مهم. النظام الآن في مرحلة بحثية نشطة: نموذج Nano مفتوح تجريبياً، وتدريب Mini يجري ضمن EXP-024 (64%). لا أستطيع الإجابة خارج نطاق المنظومة لأنني محرك عرض تجريبي وليس النموذج الفعلي — جرّب السؤال عن النماذج، التدريب، البيانات، المعمارية، خارطة الطريق، أو المساهمة.",
  en: "Good question. The system is in an active research phase: Nano is experimentally open and Mini is training under EXP-024 (64%). I cannot answer outside the platform's scope because I am a demo engine, not the actual model — try asking about the models, training, datasets, architecture, roadmap, or contributing.",
}

export function generateReply(prompt: string, forcedLang?: "ar" | "en"): string {
  const lang = forcedLang ?? detectLang(prompt)
  for (const topic of TOPICS) {
    if (topic.keys.test(prompt)) return topic[lang]
  }
  return FALLBACK[lang]
}

/** split reply into human-feeling streaming chunks (keeps code blocks intact) */
export function chunkReply(text: string): string[] {
  const chunks: string[] = []
  let buf = ""
  let inCode = false
  for (const token of text.split(/(\s+)/)) {
    if (token.includes("```")) inCode = !inCode
    buf += token
    if (!inCode && (buf.length >= 12 || /\n/.test(token))) {
      chunks.push(buf)
      buf = ""
    }
  }
  if (buf) chunks.push(buf)
  return chunks
}

/** deterministic pseudo-sampling effect for playground params */
export function applySampling(text: string, params: { temperature: number; topP: number; topK: number; maxTokens: number }): string {
  // emulate truncation by max tokens (~4 chars per token) and slight temperature "flavor"
  const approxTokens = Math.max(16, Math.round(params.maxTokens * 4))
  let out = text.length > approxTokens ? text.slice(0, approxTokens) + (text.length > approxTokens ? "…" : "") : text
  if (params.temperature > 1.1) {
    out = out.replace(/\. /g, "! ")
  }
  return out
}
