/* SYRIA AI — shared API entity types (JSON shapes returned by /api routes) */

/* Data classification: REAL (from the trained neural engine) | DEMO (synthetic
 * showcase data) | UNAVAILABLE (honestly not available right now) */
export type DataSource = "REAL" | "DEMO" | "UNAVAILABLE"

export interface AiModel {
  id: string
  modelId: string
  name: string
  params: string
  paramsNum: number
  status: string
  progress: number
  purpose: string
  purposeAr: string
  contextLen: number | null
  vocabSize: number | null
  available: boolean
  family: "foundation" | "specialized"
  description: string
  descriptionAr: string
  sort: number
  source?: DataSource
}

export interface LossPoint {
  step: number
  trainLoss: number
  validLoss: number | null
}

export interface Experiment {
  id: string
  expId: string
  title: string
  titleAr: string
  modelName: string
  modelId: string
  status: "running" | "paused" | "completed" | "failed" | "queued" | "stopped"
  progress: number
  steps: number
  totalSteps: number
  tokensB: number
  tokensTargetB: number
  speedTokSec: number
  elapsedWeeks: number
  remainingDays: number
  trainLoss: number | null
  validLoss: number | null
  architecture: string
  optimizer: string
  learningRate: number
  batchSize: number
  seqLen: number
  warmupSteps: number
  weightDecay: number
  precision: string
  seed: number
  notes: string | null
  startedAt: string
  finishedAt: string | null
  updatedAt: string
  lossPoints?: LossPoint[]
  source?: DataSource
}

export interface Dataset {
  id: string
  dsId: string
  name: string
  nameAr: string
  category: string
  language: "ar" | "en" | "mixed"
  docsM: number
  tokensB: number
  license: string
  licenseUrl: string | null
  source: string
  status: "ready" | "processing" | "planned" | "review"
  version: string
  quality: number | null
  dedupRatio: number | null
  splitsTrain: number | null
  splitsValid: number | null
  splitsTest: number | null
  notes: string | null
  dataSource?: DataSource
}

export interface Benchmark {
  id: string
  benchId: string
  name: string
  nameAr: string
  category: string
  status: "planned" | "ready" | "measured"
  nanoScore: number | null
  miniScore: number | null
  unit: string | null
  notes: string | null
}

export interface ApiKey {
  id: string
  keyId: string
  name: string
  maskedKey: string
  fullKey: string
  tier: "internal" | "research" | "community"
  status: "active" | "revoked"
  rateLimit: number
  requests: number
  tokensUsed: number
  createdAt: string
  lastUsed: string | null
  source?: DataSource
}

export interface ActivityLog {
  id: string
  kind: "training" | "data" | "api" | "system" | "security" | "inference"
  messageAr: string
  messageEn: string
  level: "info" | "success" | "warn" | "error"
  createdAt: string
  source?: DataSource
}

export interface SystemMetric {
  id: string
  metricId: string
  label: string
  value: number
  detail: string
  kind: "gpu" | "memory" | "compute" | "storage"
  sort: number
  source?: DataSource
}

export interface SystemInfo {
  engines: {
    models: string
    training: string
    inference: string
    dataEngine: string
    platform: string
  }
  metrics: SystemMetric[]
  pipeline: { key: string; docsM: number; done: boolean }[]
  status: "operating" | "degraded"
  serverTime: string
  pipelineSource?: DataSource
}

export interface ChatSessionInfo {
  id: string
  title: string
  model: string
  createdAt: string
  updatedAt: string
}

export interface ChatMessageInfo {
  id: string
  sessionId: string
  role: "user" | "assistant"
  content: string
  createdAt: string
}

export interface InferenceParams {
  temperature: number
  topP: number
  topK: number
  maxTokens: number
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string }

/* --------------------------------------------------------------------------
 * Neural engine (real PyTorch service on port 3010) — loose types
 * ----------------------------------------------------------------------- */

export interface NeuralSystemData {
  source: DataSource
  gpu?: { available: boolean; message?: string; devices?: unknown[]; backend?: string; [key: string]: unknown }
  cpu?: { physical_cores?: number; logical_cores?: number; percent?: number; freq_mhz?: number; load_avg_1m?: number; arch?: string; [key: string]: unknown }
  memory?: { total_gb?: number; available_gb?: number; used_gb?: number; percent?: number; process_rss_mb?: number; [key: string]: unknown }
  disk?: { total_gb?: number; free_gb?: number; percent?: number; [key: string]: unknown }
  device_for_training?: string
  summary?: string | null
  [key: string]: unknown
}

export interface NeuralModelInfo {
  model_id: string
  name?: string
  status?: "TRAINED" | "TRAINED_UNEVALUATED" | "IMPLEMENTED" | "PLANNED" | string
  has_checkpoint?: boolean
  checkpoint_path?: string | null
  checkpoint_bytes?: number
  available_for_inference?: boolean
  vocab_size?: number | null
  block_size?: number | null
  params?: number | null
  target_params?: string
  message?: string | null
  family?: "foundation" | "specialized" | string
  [key: string]: unknown
}

export interface NeuralLossPoint {
  step: number
  train_loss?: number | null
  valid_loss?: number | null
}

export interface NeuralExperiment {
  exp_id: string
  data_class?: "REAL" | string
  status?: string
  model_id?: string
  params?: number
  steps_completed?: number
  max_steps?: number
  tokens_processed?: number
  first_train_loss?: number
  final_train_loss?: number
  valid_loss?: number
  best_valid_loss?: number
  duration_sec?: number
  avg_tokens_per_sec?: number
  hardware?: { device?: string; message?: string; threads?: number; [key: string]: unknown }
  checkpoint?: { path?: string; bytes?: number; [key: string]: unknown }
  config?: Record<string, unknown>
  loss_history?: NeuralLossPoint[]
  logs_preview?: string[]
  [key: string]: unknown
}

export interface NeuralTestReport {
  suite?: string
  ran_at?: string
  passed?: number
  failed?: number
  errors?: number
  all_passed?: boolean
  duration_sec?: number
  checks?: { name: string; pass: boolean; [key: string]: unknown }[]
  [key: string]: unknown
}

export interface NeuralTrainingStatus {
  running?: boolean
  pid?: number | null
  started_at?: number | null
  latest_experiment?: NeuralExperiment | null
  [key: string]: unknown
}
