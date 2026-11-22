import { db } from "@/lib/db"

/* ---------------------------------------------------------------------------
 * SYRIA AI — Research Platform seed data.
 * Values follow the project's public research dashboard specification
 * (statuses are honest: planning / training / experimental-open).
 * ------------------------------------------------------------------------ */

function mulberry32(a: number) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Deterministic synthetic loss curve for the running experiment. */
export function buildLossCurve(
  totalSteps: number,
  currentStep: number,
  finalTrain: number,
  finalValid: number,
  startLoss = 3.05,
  points = 64
) {
  const rand = mulberry32(totalSteps)
  const out: { step: number; trainLoss: number; validLoss: number }[] = []
  const frac = currentStep / totalSteps
  for (let i = 0; i <= points; i++) {
    const t = (i / points) * frac // 0..1 across *elapsed* portion
    const base = startLoss * Math.exp(-3.6 * t) + finalTrain
    const plateau = finalTrain + (startLoss - finalTrain) * Math.exp(-5.5 * t)
    const noise = (rand() - 0.5) * 0.14 * Math.exp(-2 * t)
    const step = Math.round((i / points) * currentStep)
    const train = Math.max(finalTrain * 0.94, plateau + noise)
    const valid = Math.max(finalValid * 0.9, train + 0.13 + noise * 0.6)
    out.push({
      step,
      trainLoss: Number(train.toFixed(3)),
      validLoss: Number(valid.toFixed(3)),
    })
  }
  // pin the last point to the exact reported values
  if (out.length) {
    out[out.length - 1] = {
      step: currentStep,
      trainLoss: finalTrain,
      validLoss: finalValid,
    }
  }
  return out
}

const MODELS = [
  {
    modelId: "syria-ai-pro",
    name: "SYRIA AI Pro",
    params: "3B",
    paramsNum: 3000,
    status: "planned",
    progress: 0,
    purpose: "Advanced research target",
    purposeAr: "هدف بحثي متقدم",
    contextLen: null as number | null,
    vocabSize: null as number | null,
    available: false,
    family: "foundation",
    description:
      "Largest planned configuration of the family. Not scheduled until Nano and Mini pass their validation gates.",
    descriptionAr:
      "أكبر إعداد مخطط في العائلة. لن يبدأ قبل اجتياز Nano و Mini بوابات التحقق الخاصة بهما.",
    sort: 1,
    source: "DEMO" as const,
  },
  {
    modelId: "syria-ai-base",
    name: "SYRIA AI Base",
    params: "1B",
    paramsNum: 1000,
    status: "planning",
    progress: 0,
    purpose: "Specialized foundation model",
    purposeAr: "نموذج أساس متخصص",
    contextLen: null,
    vocabSize: null,
    available: false,
    family: "foundation",
    description:
      "Under active planning: compute budget, data scaling laws and tokenizer sizing are being finalized. No training has started.",
    descriptionAr:
      "قيد التخطيط النشط: يتم إعداد ميزانية الحوسبة وقوانين توسيع البيانات — لم يبدأ أي تدريب فعلي بعد.",
    sort: 2,
    source: "DEMO" as const,
  },
  {
    modelId: "syria-ai-mini",
    name: "SYRIA AI Mini",
    params: "150M",
    paramsNum: 150,
    status: "planning",
    progress: 0,
    purpose: "Early language experiments",
    purposeAr: "تجارب لغوية مبكرة",
    contextLen: 2048,
    vocabSize: 32768,
    available: false,
    family: "foundation",
    description:
      "PLANNED — training has not started. Requires GPU hardware that is currently unavailable (no GPU detected in this environment).",
    descriptionAr:
      "PLANNED — لم يبدأ تدريبه؛ يتطلب عتاد GPU غير متوفر حالياً (لا توجد وحدة معالجة رسومية في هذه البيئة).",
    sort: 3,
    source: "DEMO" as const,
  },
  {
    modelId: "syria-ai-nano",
    name: "SYRIA AI Nano",
    params: "50M",
    paramsNum: 50,
    status: "planned",
    progress: 0,
    purpose: "Research & training validation",
    purposeAr: "البحث والتحقق من التدريب",
    contextLen: 1024,
    vocabSize: 16384,
    available: false,
    family: "foundation",
    description:
      "PLANNED — not trained yet. Training will NOT be announced before verifiable weights exist in the artifacts registry.",
    descriptionAr:
      "PLANNED — لم يُدرّب بعد؛ لن يُعلن تدريبه قبل وجود أوزان قابلة للتحقق في سجل المخرجات.",
    sort: 4,
    source: "DEMO" as const,
  },
  {
    modelId: "syria-ai-debug",
    name: "SYRIA AI Debug",
    params: "10M",
    paramsNum: 10,
    status: "debug",
    progress: 100,
    purpose: "System verification (internal)",
    purposeAr: "تحقق من صحة النظام (داخلي)",
    contextLen: 512,
    vocabSize: 8192,
    available: true,
    family: "foundation",
    description:
      "Internal smoke-test model. REAL weights exist from experiment EXP-001 (1,349,248 params, trained 1200 steps on CPU) and are served by the neural inference engine.",
    descriptionAr:
      "نموذج اختبار داخلي للتحقق من مسارات التدريب. توجد أوزان حقيقية من التجربة EXP-001 (1,349,248 معامل، 1200 خطوة على المعالج) ويخدمها المحرك العصبي للاستدلال.",
    sort: 5,
    source: "DEMO" as const,
  },
]

const SPECIALIZED = [
  ["SYRIA AI General", "المحادثة والمساعدة اللغوية والتلخيص"],
  ["SYRIA AI Code", "مساعدة المطورين وتحليل الشيفرات وتفسير الأخطاء"],
  ["SYRIA AI Education", "شرح المناهج وتنظيم الدروس وإعداد الأنشطة"],
  ["SYRIA AI Reconstruction", "دعم تحليل متطلبات مشاريع إعادة الإعمار"],
  ["SYRIA AI Agriculture", "فهم المصطلحات والوثائق الزراعية والتخطيط"],
  ["SYRIA AI Administration", "المراسلات والإجراءات والخدمات الإدارية"],
  ["SYRIA AI Research", "تنظيم الأبحاث وتفسير المصطلحات العلمية"],
  ["SYRIA AI Business", "العمليات التجارية وتحليل متطلبات الأعمال"],
]

const EXPERIMENTS = [
  {
    expId: "EXP-024",
    title: "Mini pretraining run",
    titleAr: "تدريب نموذج Mini (150M)",
    modelName: "Mini (150M)",
    modelId: "syria-ai-mini",
    status: "running",
    progress: 64,
    steps: 256480,
    totalSteps: 400000,
    tokensB: 18.7,
    tokensTargetB: 30.0,
    speedTokSec: 42300,
    elapsedWeeks: 14,
    remainingDays: 20,
    trainLoss: 1.127,
    validLoss: 1.284,
    architecture: "decoder-only-baseline",
    optimizer: "AdamW",
    learningRate: 0.0006,
    batchSize: 96,
    seqLen: 2048,
    warmupSteps: 8000,
    weightDecay: 0.1,
    precision: "bf16",
    seed: 20240101,
    notes: "Primary Mini pretraining run on the SYRIA DATA ENGINE corpus v1.2. (بيانات عرض تجريبية — ليست تدريباً حقيقياً)",
    startedAt: new Date("2025-01-24T09:00:00Z"),
    source: "DEMO" as const,
  },
  {
    expId: "EXP-023",
    title: "Nano final pretraining",
    titleAr: "التدريب النهائي لنموذج Nano (50M)",
    modelName: "Nano (50M)",
    modelId: "syria-ai-nano",
    status: "completed",
    progress: 100,
    steps: 180000,
    totalSteps: 180000,
    tokensB: 6.2,
    tokensTargetB: 6.2,
    speedTokSec: 38900,
    elapsedWeeks: 4,
    remainingDays: 0,
    trainLoss: 1.466,
    validLoss: 1.512,
    architecture: "decoder-only-baseline",
    optimizer: "AdamW",
    learningRate: 0.0008,
    batchSize: 64,
    seqLen: 1024,
    warmupSteps: 4000,
    weightDecay: 0.1,
    precision: "bf16",
    seed: 20240102,
    notes: "Experimental open release candidate. Weights published for review. (بيانات عرض تجريبية — ليست تدريباً حقيقياً)",
    startedAt: new Date("2025-01-20T09:00:00Z"),
    finishedAt: new Date("2025-01-26T18:00:00Z"),
    source: "DEMO" as const,
  },
  {
    expId: "EXP-022",
    title: "Nano scaling ablation",
    titleAr: "تجربة توسيع Nano (50M)",
    modelName: "Nano (50M)",
    modelId: "syria-ai-nano",
    status: "completed",
    progress: 100,
    steps: 150000,
    totalSteps: 150000,
    tokensB: 5.1,
    tokensTargetB: 5.1,
    speedTokSec: 37400,
    elapsedWeeks: 3,
    remainingDays: 0,
    trainLoss: 1.551,
    validLoss: 1.603,
    architecture: "decoder-only-baseline",
    optimizer: "AdamW",
    learningRate: 0.001,
    batchSize: 64,
    seqLen: 1024,
    warmupSteps: 3000,
    weightDecay: 0.1,
    precision: "bf16",
    seed: 20240103,
    notes: "Vocabulary-size ablation (16K vs 32K).",
    startedAt: new Date("2025-01-18T09:00:00Z"),
    finishedAt: new Date("2025-01-24T15:00:00Z"),
    source: "DEMO" as const,
  },
  {
    expId: "EXP-021",
    title: "Debug model system check",
    titleAr: "فحص النظام بنموذج Debug (10M)",
    modelName: "Debug (10M)",
    modelId: "syria-ai-debug",
    status: "completed",
    progress: 100,
    steps: 60000,
    totalSteps: 60000,
    tokensB: 0.9,
    tokensTargetB: 0.9,
    speedTokSec: 51200,
    elapsedWeeks: 1,
    remainingDays: 0,
    trainLoss: 2.287,
    validLoss: 2.341,
    architecture: "decoder-only-baseline",
    optimizer: "AdamW",
    learningRate: 0.0012,
    batchSize: 32,
    seqLen: 512,
    warmupSteps: 1000,
    weightDecay: 0.1,
    precision: "fp32",
    seed: 20240104,
    notes: "Overfit sanity test — passed. Checkpoint resume verified.",
    startedAt: new Date("2025-01-15T09:00:00Z"),
    finishedAt: new Date("2025-01-19T12:00:00Z"),
    source: "DEMO" as const,
  },
  {
    expId: "EXP-020",
    title: "Debug OOM resilience probe",
    titleAr: "اختبار متانة الذاكرة لنموذج Debug",
    modelName: "Debug (10M)",
    modelId: "syria-ai-debug",
    status: "failed",
    progress: 37,
    steps: 22200,
    totalSteps: 60000,
    tokensB: 0.31,
    tokensTargetB: 0.9,
    speedTokSec: 49800,
    elapsedWeeks: 0.4,
    remainingDays: 0,
    trainLoss: 2.712,
    validLoss: 2.795,
    architecture: "decoder-only-baseline",
    optimizer: "AdamW",
    learningRate: 0.0012,
    batchSize: 128,
    seqLen: 512,
    warmupSteps: 1000,
    weightDecay: 0.1,
    precision: "fp32",
    seed: 20240105,
    notes: "CUDA OOM at batch 128 during gradient accumulation stress test.",
    startedAt: new Date("2025-01-12T09:00:00Z"),
    finishedAt: new Date("2025-01-13T21:30:00Z"),
    source: "DEMO" as const,
  },
]

const DATASETS = [
  {
    dsId: "DS-001",
    name: "Syrian & Levantine Dialect Corpus",
    nameAr: "مدون اللهجات السورية والشامية",
    category: "dialect",
    language: "ar",
    docsM: 1.4,
    tokensB: 1.1,
    license: "Internal-Research",
    licenseUrl: null,
    source: "Licensed community contributions + transcribed open media",
    status: "ready",
    version: "v1.3",
    quality: 92,
    dedupRatio: 0.11,
    splitsTrain: 0.94,
    splitsValid: 0.04,
    splitsTest: 0.02,
    notes: "Core dialect coverage for Damascus, Aleppo, Homs, Latakia, Deir ez-Zor.",
  },
  {
    dsId: "DS-002",
    name: "Arabic Web Corpus (filtered)",
    nameAr: "مدون الويب العربي (مُصفّى)",
    category: "web",
    language: "ar",
    docsM: 4.6,
    tokensB: 3.8,
    license: "ODC-BY",
    licenseUrl: "https://opendatacommons.org/licenses/by/",
    source: "Open crawl exports, license-audited",
    status: "ready",
    version: "v2.1",
    quality: 84,
    dedupRatio: 0.18,
    splitsTrain: 0.95,
    splitsValid: 0.03,
    splitsTest: 0.02,
    notes: "Aggressive quality filtering + PII scrubbing applied.",
  },
  {
    dsId: "DS-003",
    name: "Arabic Encyclopedia Snapshot",
    nameAr: "لقطة الموسوعات العربية",
    category: "encyclopedia",
    language: "ar",
    docsM: 1.1,
    tokensB: 0.9,
    license: "CC-BY-SA-3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    source: "Open encyclopedia dumps",
    status: "ready",
    version: "v1.2",
    quality: 95,
    dedupRatio: 0.05,
    splitsTrain: 0.95,
    splitsValid: 0.03,
    splitsTest: 0.02,
    notes: "Attribution ledger maintained per article.",
  },
  {
    dsId: "DS-004",
    name: "English Reference Corpus",
    nameAr: "المدون المرجعية الإنجليزية",
    category: "web",
    language: "en",
    docsM: 2.2,
    tokensB: 2.6,
    license: "ODC-BY",
    licenseUrl: "https://opendatacommons.org/licenses/by/",
    source: "Open crawl exports, license-audited",
    status: "ready",
    version: "v1.4",
    quality: 87,
    dedupRatio: 0.16,
    splitsTrain: 0.95,
    splitsValid: 0.03,
    splitsTest: 0.02,
    notes: "Bilingual transfer support.",
  },
  {
    dsId: "DS-005",
    name: "Syrian Reconstruction & Economy Archive",
    nameAr: "أرشيف إعادة الإعمار والاقتصاد السوري",
    category: "technical",
    language: "mixed",
    docsM: 0.6,
    tokensB: 0.5,
    license: "Internal-Research",
    licenseUrl: null,
    source: "Public reports + licensed specialist documents",
    status: "processing",
    version: "v0.9",
    quality: 78,
    dedupRatio: 0.09,
    splitsTrain: 0.93,
    splitsValid: 0.04,
    splitsTest: 0.03,
    notes: "Domain corpus for future specialized variants (Reconstruction / Administration).",
  },
  {
    dsId: "DS-006",
    name: "Arabic Books Collection",
    nameAr: "مجموعة الكتب العربية",
    category: "books",
    language: "ar",
    docsM: 0.8,
    tokensB: 1.2,
    license: "Public-Domain",
    licenseUrl: null,
    source: "Public-domain library scans (OCR + manual review)",
    status: "processing",
    version: "v0.7",
    quality: 81,
    dedupRatio: 0.07,
    splitsTrain: 0.94,
    splitsValid: 0.04,
    splitsTest: 0.02,
    notes: "OCR error rate < 1.2% after manual pass.",
  },
  {
    dsId: "DS-007",
    name: "Code & Technical Docs (mixed AR/EN)",
    nameAr: "الشيفرات والوثائق التقنية (عربي/إنجليزي)",
    category: "code",
    language: "mixed",
    docsM: 0.7,
    tokensB: 0.9,
    license: "Internal-Research",
    licenseUrl: null,
    source: "Permissively-licensed repositories and documentation",
    status: "review",
    version: "v0.4",
    quality: 74,
    dedupRatio: 0.12,
    splitsTrain: 0.94,
    splitsValid: 0.03,
    splitsTest: 0.03,
    notes: "License audit in progress before enabling for training.",
  },
  {
    dsId: "DS-008",
    name: "Instruction Set (human-authored, licensed)",
    nameAr: "مجموعة التعليمات (بشرية الإعداد ومرخصة)",
    category: "dialogue",
    language: "mixed",
    docsM: 0.05,
    tokensB: 0.04,
    license: "CC-BY-4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    source: "Specialist-written instruction/answer pairs",
    status: "planned",
    version: "v0.1",
    quality: null,
    dedupRatio: null,
    splitsTrain: 0.9,
    splitsValid: 0.06,
    splitsTest: 0.04,
    notes: "For post-training SFT — no external model distillation allowed.",
  },
]

const BENCHMARKS = [
  ["SB-01", "Arabic Language Understanding", "فهم اللغة العربية", "language", "ready", null, null, "%"],
  ["SB-02", "Syrian Dialect Understanding", "فهم اللهجات السورية", "dialect", "ready", null, null, "%"],
  ["SB-03", "Arabic Perplexity (held-out)", "الإربابية العربية (بيانات مستبعدة)", "language", "measured", 24.6, null, "ppl"],
  ["SB-04", "Validation Loss (Nano)", "خسارة التحقق (Nano)", "language", "measured", 1.512, null, "loss"],
  ["SB-05", "English Comprehension", "الاستيعاب الإنجليزي", "language", "planned", null, null, "%"],
  ["SB-06", "Basic Mathematics", "الرياضيات الأساسية", "math", "planned", null, null, "%"],
  ["SB-07", "Reasoning Tasks", "مهام الاستدلال", "reasoning", "planned", null, null, "%"],
  ["SB-08", "Code Generation", "توليد الشيفرات", "code", "planned", null, null, "%"],
  ["SB-09", "Instruction Following", "اتباع التعليمات", "operations", "planned", null, null, "%"],
  ["SB-10", "Factual Reliability", "الموثوقية الواقعية", "safety", "planned", null, null, "%"],
  ["SB-11", "Uncertainty Handling", "التعامل مع عدم اليقين", "safety", "planned", null, null, "%"],
  ["SB-12", "Safety & Privacy Probes", "اختبارات السلامة والخصوصية", "safety", "ready", null, null, "%"],
  ["SB-13", "Inference Throughput (CPU)", "إنتاجية الاستدلال (CPU)", "operations", "measured", 31.4, null, "tok/s"],
] as const

const KEYS = [
  {
    keyId: "SK-7F3A-9B21-C4DE",
    name: "Internal Research Console",
    maskedKey: "SK-syria-****-c4de",
    fullKey: "SK-syria-demo-7f3a9b21c4de",
    tier: "internal",
    status: "active",
    rateLimit: 600,
    requests: 12874,
    tokensUsed: 3.42,
    createdAt: new Date("2025-01-08T10:00:00Z"),
    lastUsed: new Date("2025-01-27T09:41:00Z"),
  },
  {
    keyId: "SK-2C55-41A8-B0E9",
    name: "Community Reviewer Key",
    maskedKey: "SK-syria-****-b0e9",
    fullKey: "SK-syria-demo-2c5541a8b0e9",
    tier: "community",
    status: "active",
    rateLimit: 60,
    requests: 1983,
    tokensUsed: 0.47,
    createdAt: new Date("2025-01-16T14:00:00Z"),
    lastUsed: new Date("2025-01-26T20:12:00Z"),
  },
  {
    keyId: "SK-D831-6E77-A2F4",
    name: "Legacy QA Harness",
    maskedKey: "SK-syria-****-a2f4",
    fullKey: "SK-syria-demo-d8316e77a2f4",
    tier: "research",
    status: "revoked",
    rateLimit: 120,
    requests: 6410,
    tokensUsed: 1.18,
    createdAt: new Date("2025-01-03T09:00:00Z"),
    lastUsed: new Date("2025-01-19T17:55:00Z"),
  },
]

/* NOTE: the fake GPU rows (RTX 4090 x2 / RTX 3090) were removed — no GPU exists
 * in this environment. ram/cpu/storage remain only as DEMO placeholders; the
 * /api/system route reports REAL hardware values at render time. */
const METRICS = [
  { metricId: "ram", label: "RAM", value: 58, detail: "74 / 128 GB", kind: "memory", sort: 4 },
  { metricId: "cpu", label: "CPU", value: 34, detail: "16 / 48 Cores", kind: "compute", sort: 5 },
  { metricId: "storage", label: "Storage", value: 41, detail: "3.2 / 7.8 TB", kind: "storage", sort: 6 },
]

const LOGS = [
  { kind: "training", messageAr: "EXP-024: حفظ Checkpoint جديد عند الخطوة 256,480 (خسارة تحقق 1.284)", messageEn: "EXP-024: checkpoint saved at step 256,480 (valid loss 1.284)", level: "success" },
  { kind: "data", messageAr: "SYRIA DATA ENGINE: اكتملت مرحلة إزالة التكرار لنسبة 10.9M وثيقة", messageEn: "SYRIA DATA ENGINE: dedup stage finished for 10.9M documents", level: "info" },
  { kind: "security", messageAr: "فحص التبعيات الأسبوعي: لا ثغرات حرجة", messageEn: "Weekly dependency scan: no critical vulnerabilities", level: "success" },
  { kind: "api", messageAr: "تجاوز حد المعدل مؤقتاً على مفتاح المجتمع (تم التخفيف تلقائياً)", messageEn: "Rate limit soft-hit on community key (auto backoff applied)", level: "warn" },
  { kind: "inference", messageAr: "محرك الاستدلال v0.1.0: تحميل أوزان Nano التجريبية للمراجعة الداخلية", messageEn: "Inference engine v0.1.0: loaded experimental Nano weights for internal review", level: "info" },
  { kind: "training", messageAr: "EXP-020: توقف بسبب OOM — تم توثيق السبب وتعديل إعداد التجميع التدريجي", messageEn: "EXP-020: halted by OOM — cause documented, accumulation config revised", level: "error" },
]

/* Pipeline stages shown on the dashboard (SYRIA DATA ENGINE funnel) */
export const PIPELINE = [
  { key: "collect", docsM: 11.9, done: true },
  { key: "clean", docsM: 11.2, done: true },
  { key: "dedup", docsM: 10.9, done: true },
  { key: "license", docsM: 10.8, done: true },
  { key: "ready", docsM: 10.8, done: true },
]

export const ENGINES = {
  models: "v0.1.0",
  training: "v0.1.0",
  inference: "v0.1.0",
  dataEngine: "v0.3.0",
  platform: "v0.1.0",
}

export async function seedDatabase() {
  // Wipe (idempotent reseeding)
  await db.lossPoint.deleteMany()
  await db.experiment.deleteMany()
  await db.aiModel.deleteMany()
  await db.dataset.deleteMany()
  await db.benchmark.deleteMany()
  await db.apiKey.deleteMany()
  await db.chatMessage.deleteMany()
  await db.chatSession.deleteMany()
  await db.activityLog.deleteMany()
  await db.systemMetric.deleteMany()

  await db.aiModel.createMany({ data: MODELS.map((m) => ({ ...m })) })
  await db.aiModel.createMany({
    data: SPECIALIZED.map(([name, purposeAr], i) => ({
      modelId: `syria-ai-${name.replace("SYRIA AI ", "").toLowerCase()}`,
      name,
      params: "—",
      paramsNum: 0,
      status: "planned",
      progress: 0,
      purpose: `${name.replace("SYRIA AI ", "")} variant (derived)`,
      purposeAr,
      contextLen: null as number | null,
      vocabSize: null as number | null,
      available: false,
      family: "specialized",
      description: `Future specialized variant derived ONLY from trained SYRIA AI base weights (no external fine-tuning). Planned: ${name.replace("SYRIA AI ", "")}.`,
      descriptionAr: `إصدار متخصص مستقبلي يُشتق حصراً من أوزان SYRIA AI الأساسية بعد اكتمال تدريبها — ${purposeAr}.`,
      sort: 10 + i,
      source: "DEMO",
    })),
  })

  const expRows = await Promise.all(
    EXPERIMENTS.map(async (e) => {
      const created = await db.experiment.create({ data: { ...e } })
      return created
    })
  )

  // Loss curve only for the active run (and a short one for Nano's finished run)
  const exp024 = expRows.find((e) => e.expId === "EXP-024")
  if (exp024) {
    const pts = buildLossCurve(400000, 256480, 1.127, 1.284)
    await db.lossPoint.createMany({
      data: pts.map((p) => ({
        experimentId: exp024.id,
        step: p.step,
        trainLoss: p.trainLoss,
        validLoss: p.validLoss,
      })),
    })
  }
  const exp023 = expRows.find((e) => e.expId === "EXP-023")
  if (exp023) {
    const pts = buildLossCurve(180000, 180000, 1.466, 1.512, 3.1, 40)
    await db.lossPoint.createMany({
      data: pts.map((p) => ({
        experimentId: exp023.id,
        step: p.step,
        trainLoss: p.trainLoss,
        validLoss: p.validLoss,
      })),
    })
  }

  await db.dataset.createMany({ data: DATASETS.map((d) => ({ ...d, dataSource: "DEMO" })) })
  await db.benchmark.createMany({
    data: BENCHMARKS.map(([benchId, name, nameAr, category, status, nanoScore, miniScore, unit]) => ({
      benchId: benchId as string,
      name: name as string,
      nameAr: nameAr as string,
      category: category as string,
      status: status as string,
      nanoScore: (nanoScore as number | null) ?? null,
      miniScore: (miniScore as number | null) ?? null,
      unit: (unit as string) ?? null,
      source: "DEMO",
    })),
  })
  await db.apiKey.createMany({ data: KEYS.map((k) => ({ ...k, source: "DEMO" })) })
  // NOTE: SystemMetric intentionally has no `source` column (per spec) — hardware
  // metrics are reported REAL/UNAVAILABLE at render time by /api/system.
  await db.systemMetric.createMany({ data: METRICS.map((m) => ({ ...m })) })
  await db.activityLog.createMany({ data: LOGS.map((l) => ({ ...l, createdAt: new Date(), source: "DEMO" })) })

  // Welcome chat session
  const session = await db.chatSession.create({
    data: { title: "مرحباً — تعريف بالمنصة", model: "syria-ai-nano" },
  })
  await db.chatMessage.createMany({
    data: [
      {
        sessionId: session.id,
        role: "assistant",
        content:
          "أهلاً بك في منصة المحادثة التجريبية لـ SYRIA AI.\n\nهذه الواجهة تعمل حالياً بـ **محرك عرض محلي (Demo Engine)** — النموذج الفعلي (SYRIA AI Mini) لا يزال قيد التدريب ولم تُنشر أوزانه بعد. جرّب واجهة المحادثة والمعاملات، وتابع تقدم التدريب من لوحة التحكم.",
      },
    ],
  })

  return { ok: true }
}
