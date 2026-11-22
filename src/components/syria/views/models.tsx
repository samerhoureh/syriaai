"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Boxes, Cpu, Github, Info, ShieldCheck, TriangleAlert } from "lucide-react"
import { useI18n } from "@/components/syria/language-provider"
import { useNav } from "@/lib/store"
import { apiGet } from "@/lib/api"
import type { AiModel, DataSource, NeuralModelInfo } from "@/lib/types"
import { EmptyState, SourceBadge, StatusBadge, ViewHeader } from "@/components/syria/ui-bits"
import { fmtNum, fmtPct } from "@/lib/format"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const REPO_URL = "https://github.com/syria-ai"

/* Accent tone per model status (CSS vars only, no blue/indigo) */
const STATUS_TONE: Record<string, string> = {
  planned: "var(--muted-foreground)",
  planning: "var(--muted-foreground)",
  training: "var(--chart-1)",
  experimental: "var(--chart-1)",
  debug: "var(--chart-2)",
}

/* Minimal shape for specialized future models (API rows or UI fallback) */
type SpecializedCard = {
  modelId: string
  name: string
  purpose: string
  purposeAr: string
}

/* Fallback list — the API may not have seeded specialized models yet.
   Same honest statuses (future derived, planned). */
const FALLBACK_SPECIALIZED: SpecializedCard[] = [
  { modelId: "syria-ai-general", name: "SYRIA AI General", purpose: "Conversation, language assistance and summarization", purposeAr: "المحادثة والمساعدة اللغوية والتلخيص" },
  { modelId: "syria-ai-code", name: "SYRIA AI Code", purpose: "Developer assistance, code analysis and error explanation", purposeAr: "مساعدة المطورين وتحليل الشيفرات وتفسير الأخطاء" },
  { modelId: "syria-ai-education", name: "SYRIA AI Education", purpose: "Curriculum explanation, lesson organization and activities", purposeAr: "شرح المناهج وتنظيم الدروس وإعداد الأنشطة" },
  { modelId: "syria-ai-reconstruction", name: "SYRIA AI Reconstruction", purpose: "Supporting analysis of reconstruction project requirements", purposeAr: "دعم تحليل متطلبات مشاريع إعادة الإعمار" },
  { modelId: "syria-ai-agriculture", name: "SYRIA AI Agriculture", purpose: "Agricultural terminology, documents and planning", purposeAr: "فهم المصطلحات والوثائق الزراعية والتخطيط" },
  { modelId: "syria-ai-administration", name: "SYRIA AI Administration", purpose: "Correspondence, procedures and administrative services", purposeAr: "المراسلات والإجراءات والخدمات الإدارية" },
  { modelId: "syria-ai-research", name: "SYRIA AI Research", purpose: "Research organization and scientific term interpretation", purposeAr: "تنظيم الأبحاث وتفسير المصطلحات العلمية" },
  { modelId: "syria-ai-business", name: "SYRIA AI Business", purpose: "Business operations and requirements analysis", purposeAr: "العمليات التجارية وتحليل متطلبات الأعمال" },
]

/* ------------------------------ small helpers ----------------------------- */

function ProgressBar({ value, tone }: { value: number; tone: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            background: `linear-gradient(90deg, color-mix(in oklab, ${tone} 45%, transparent), ${tone})`,
            transition: "width 800ms cubic-bezier(.22,.61,.36,1)",
          }}
        />
      </div>
      <span className="w-11 text-end text-[11px] font-bold num" style={{ color: tone }}>
        {fmtPct(value)}
      </span>
    </div>
  )
}

function SpecChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel-2 px-2 py-1 text-[10.5px] font-semibold text-muted-foreground">
      {label}: <span className="num text-foreground">{value}</span>
    </span>
  )
}

function DetailRow({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", wide && "col-span-full")}>
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-end font-bold">{children}</dd>
    </div>
  )
}

/* ------------------------------ real engine card --------------------------- */

function RealModelCard({ model }: { model: NeuralModelInfo }) {
  const { t } = useI18n()
  const statusLabel = model.status ? t(`models.real.status.${model.status}`) : model.status
  return (
    <article
      className="flex flex-col gap-3 rounded-xl border bg-panel p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_28px_-10px_var(--glow)]"
      style={{ borderColor: "color-mix(in oklab, var(--chart-1) 45%, transparent)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border"
            style={{
              borderColor: "color-mix(in oklab, var(--chart-1) 45%, transparent)",
              background: "color-mix(in oklab, var(--chart-1) 10%, transparent)",
              color: "var(--chart-1)",
            }}
          >
            <Cpu className="h-5 w-5" />
          </span>
          <div className="min-w-0 leading-tight">
            <h3 className="truncate text-[15px] font-extrabold tracking-tight">{model.name ?? model.model_id}</h3>
            <span className="mt-0.5 inline-block text-[10px] font-semibold text-muted-foreground num" dir="ltr">
              {model.model_id}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <SourceBadge source="REAL" />
          {statusLabel ? <StatusBadge status="completed" size="sm" dot={false} /> : null}
        </div>
      </div>

      <p className="text-xs font-semibold text-foreground/80">{statusLabel}</p>

      <div className="flex flex-wrap gap-1.5">
        {model.params ? <SpecChip label={t("c.parameters")} value={fmtNum(model.params)} /> : null}
        {model.vocab_size ? <SpecChip label={t("models.vocab")} value={fmtNum(model.vocab_size)} /> : null}
        {model.block_size ? <SpecChip label={t("models.ctx")} value={fmtNum(model.block_size)} /> : null}
        {model.checkpoint_bytes ? (
          <SpecChip label={t("models.real.checkpoint")} value={`${(model.checkpoint_bytes / 1e6).toFixed(1)} MB`} />
        ) : null}
      </div>

      {model.message ? (
        <p className="line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground" dir="ltr">
          {String(model.message)}
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line/70 pt-3">
        {model.available_for_inference ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-bold"
            style={{
              color: "var(--chart-1)",
              borderColor: "color-mix(in oklab, var(--chart-1) 40%, transparent)",
              background: "color-mix(in oklab, var(--chart-1) 10%, transparent)",
            }}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {t("models.real.badge")}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-md border border-line bg-muted px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground">
            {t("models.notAvailable")}
          </span>
        )}
        <span className="num text-[10px] text-muted-foreground/70">{model.checkpoint_path ?? ""}</span>
      </div>
    </article>
  )
}

/* ------------------------------ foundation card --------------------------- */

function FoundationCard({
  model,
  highlighted,
  onOpen,
}: {
  model: AiModel
  highlighted: boolean
  onOpen: () => void
}) {
  const { t, isAr } = useI18n()
  const tone = STATUS_TONE[model.status] ?? "var(--muted-foreground)"

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-panel p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_28px_-10px_var(--glow)]",
        highlighted
          ? "border-primary/60 shadow-[0_0_28px_-8px_var(--glow)] ring-1 ring-primary/45"
          : "border-line hover:border-primary/40"
      )}
    >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border"
              style={{
                borderColor: `color-mix(in oklab, ${tone} 45%, transparent)`,
                background: `color-mix(in oklab, ${tone} 10%, transparent)`,
                color: tone,
              }}
            >
              <Boxes className="h-5 w-5" />
            </span>
            <div className="min-w-0 leading-tight">
              <h3 className="truncate text-[15px] font-extrabold tracking-tight">{model.name}</h3>
              <span className="mt-1 inline-flex items-center gap-1 rounded-md border border-line bg-panel-2 px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                <span className="num" style={{ color: tone }}>
                  {model.params}
                </span>
                <span>{t("models.params")}</span>
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <SourceBadge source={model.source ?? "DEMO"} />
            <StatusBadge status={model.status} size="sm" dot={false} />
          </div>
        </div>

      <p className="text-xs font-semibold text-foreground/80">{isAr ? model.purposeAr : model.purpose}</p>

      <ProgressBar value={model.progress} tone={tone} />

      {(model.contextLen !== null || model.vocabSize !== null) && (
        <div className="flex flex-wrap gap-1.5">
          {model.contextLen !== null && <SpecChip label={t("models.ctx")} value={fmtNum(model.contextLen)} />}
          {model.vocabSize !== null && <SpecChip label={t("models.vocab")} value={fmtNum(model.vocabSize)} />}
        </div>
      )}

      <p className="line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground">
        {isAr ? model.descriptionAr : model.description}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line/70 pt-3">
        {model.available ? (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-10 min-h-10 flex-1 px-3 text-xs sm:flex-none"
              onClick={onOpen}
            >
              {t("models.cardBtn")}
            </Button>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none">
              <Button size="sm" variant="ghost" className="h-10 min-h-10 w-full px-3 text-xs text-primary">
                <Github className="h-3.5 w-3.5" />
                {t("models.repoBtn")}
              </Button>
            </a>
          </>
        ) : (
          <>
            <span className="inline-flex items-center rounded-md border border-line bg-muted px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground">
              {t("models.notAvailable")}
            </span>
            <span className="inline-flex items-center rounded-md border border-dashed border-line px-2.5 py-1.5 text-[11px] text-muted-foreground/80">
              {t("models.inPrep")}
            </span>
          </>
        )}
      </div>
    </article>
  )
}

/* -------------------------------- specialized ----------------------------- */

function SpecializedModelCard({ model, highlighted }: { model: SpecializedCard; highlighted: boolean }) {
  const { t, isAr } = useI18n()
  return (
    <article
      className={cn(
        "flex flex-col gap-2 rounded-xl border bg-panel p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40",
        highlighted ? "border-primary/60 ring-1 ring-primary/45" : "border-line"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[13.5px] font-extrabold leading-tight tracking-tight">{model.name}</h3>
        <StatusBadge status="derived" size="sm" dot={false} />
      </div>
      <p className="text-[11.5px] leading-relaxed text-muted-foreground">{isAr ? model.purposeAr : model.purpose}</p>
      <span className="num mt-auto text-[10px] text-muted-foreground/70">{model.modelId}</span>
    </article>
  )
}

/* -------------------------------- model dialog ---------------------------- */

function ModelCardDialog({
  modelId,
  model,
  onClose,
}: {
  modelId: string | null
  model: AiModel | null
  onClose: () => void
}) {
  const { t, isAr } = useI18n()
  const open = modelId !== null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto scrollbar-sy border-line bg-background sm:max-w-lg sm:rounded-xl">
        {model ? (
          <>
            <DialogHeader className="text-start">
              <DialogTitle className="flex items-center gap-2 text-lg font-extrabold">
                <Boxes className="h-5 w-5 shrink-0 text-primary" />
                {model.name}
              </DialogTitle>
              <DialogDescription>{isAr ? model.purposeAr : model.purpose}</DialogDescription>
            </DialogHeader>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-xl border border-line bg-panel-2 p-4 text-[12px]">
              <DetailRow label={t("models.dialog.id")}>
                <span className="num text-[11px] text-muted-foreground">{model.modelId}</span>
              </DetailRow>
              <DetailRow label={t("c.status")}>
                <StatusBadge status={model.status} size="sm" dot={false} />
              </DetailRow>
              <DetailRow label={t("models.params")}>
                <span className="num" dir="ltr">
                  {model.params}
                </span>
              </DetailRow>
              <DetailRow label={t("c.progress")}>
                <span className="num" dir="ltr">
                  {fmtPct(model.progress)}
                </span>
              </DetailRow>
              <DetailRow label={t("models.ctx")}>
                <span className="num" dir="ltr">
                  {model.contextLen !== null ? fmtNum(model.contextLen) : "—"}
                </span>
              </DetailRow>
              <DetailRow label={t("models.vocab")}>
                <span className="num" dir="ltr">
                  {model.vocabSize !== null ? fmtNum(model.vocabSize) : "—"}
                </span>
              </DetailRow>
            </dl>

            <div className="space-y-2.5 text-[12.5px] leading-relaxed">
              <div>
                <span className="font-bold">{t("models.dialog.desc")}:</span>
                <p className="mt-1 text-muted-foreground">{isAr ? model.descriptionAr : model.description}</p>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-line bg-panel-2 px-3 py-2.5 text-[11.5px]">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-valid" />
                <span>
                  <span className="font-bold">{t("models.dialog.license")}:</span> {t("models.dialog.licenseNote")}
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <a href={REPO_URL} target="_blank" rel="noreferrer">
                <Button variant="outline" className="min-h-10 gap-2 px-4 text-xs">
                  <Github className="h-4 w-4" />
                  {t("models.repoBtn")}
                </Button>
              </a>
              <Button variant="ghost" className="min-h-10 px-4 text-xs" onClick={onClose}>
                {t("c.close")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader className="text-start">
              <DialogTitle className="sr-only">{t("models.dialog.title")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Skeleton className="h-7 w-44" />
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/* --------------------------------- the view ------------------------------- */

export default function ModelsView() {
  const { t, isAr } = useI18n()
  const { payload } = useNav()
  const payloadModelId = typeof payload?.modelId === "string" ? payload.modelId : null

  const q = useQuery({
    queryKey: ["models"],
    queryFn: () => apiGet<{ foundation: AiModel[]; specialized: AiModel[] }>("/api/models"),
    refetchInterval: 30_000,
  })

  /* REAL engine registry (syria-ai-core artifacts) — merged above the seed list */
  const neuralQ = useQuery({
    queryKey: ["neural-models"],
    queryFn: () => apiGet<{ source: DataSource; models: NeuralModelInfo[] }>("/api/neural/models"),
    refetchInterval: 60_000,
  })
  const realModels = (neuralQ.data?.models ?? []).filter((m) => m.has_checkpoint)

  const [tab, setTab] = React.useState("foundation")
  const [dialogModelId, setDialogModelId] = React.useState<string | null>(payloadModelId)
  const bootstrapped = React.useRef(false)

  /* payload support: highlight + auto-open the model card dialog once data arrives */
  React.useEffect(() => {
    if (bootstrapped.current || !q.data) return
    bootstrapped.current = true
    if (!payloadModelId) return
    const inFoundation = q.data.foundation.some((m) => m.modelId === payloadModelId)
    const inSpecialized = q.data.specialized.some((m) => m.modelId === payloadModelId)
    if (inSpecialized && !inFoundation) {
      setTab("specialized")
      setDialogModelId(null)
    } else if (!inFoundation && !inSpecialized) {
      setDialogModelId(null)
    }
  }, [q.data, payloadModelId])

  const foundation = q.data?.foundation ?? []
  const specialized: SpecializedCard[] = q.data
    ? q.data.specialized.length > 0
      ? q.data.specialized.map((m) => ({
          modelId: m.modelId,
          name: m.name,
          purpose: m.purpose,
          purposeAr: m.purposeAr,
        }))
      : FALLBACK_SPECIALIZED
    : []

  const dialogModel = foundation.find((m) => m.modelId === dialogModelId) ?? null

  return (
    <div className="space-y-4 md:space-y-5">
      <ViewHeader
        title={t("models.title")}
        subtitle={t("models.subtitle")}
        icon={<Boxes className="h-5 w-5" />}
      />

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList className="h-auto w-full flex-wrap sm:w-fit">
          <TabsTrigger value="foundation" className="min-h-[44px] px-4 text-[12.5px] sm:text-sm">
            {t("models.tab.foundation")}
          </TabsTrigger>
          <TabsTrigger value="specialized" className="min-h-[44px] px-4 text-[12.5px] sm:text-sm">
            {t("models.tab.specialized")}
          </TabsTrigger>
        </TabsList>

        {/* foundation */}
        <TabsContent value="foundation" className="mt-0 space-y-4">
          {/* REAL trained-weights cards (from the neural engine artifacts) */}
          {realModels.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <Cpu className="h-3.5 w-3.5 text-primary" />
                <span>{t("models.real.section")}</span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {realModels.map((m) => (
                  <RealModelCard key={m.model_id} model={m} />
                ))}
              </div>
            </div>
          )}

          {q.isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-52 rounded-xl" />
              ))}
            </div>
          ) : q.isError ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <EmptyState
                icon={<TriangleAlert className="h-8 w-8" />}
                title={t("c.errorLoad")}
                hint={t("c.error")}
              />
              <Button variant="outline" className="min-h-10 px-5 text-xs" onClick={() => q.refetch()}>
                {t("c.retry")}
              </Button>
            </div>
          ) : foundation.length === 0 ? (
            <EmptyState icon={<Boxes className="h-8 w-8" />} title={t("models.empty")} />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {foundation.map((m) => (
                <FoundationCard
                  key={m.id}
                  model={m}
                  highlighted={payloadModelId === m.modelId}
                  onOpen={() => setDialogModelId(m.modelId)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* specialized */}
        <TabsContent value="specialized" className="mt-0 space-y-4">
          <div className="flex items-start gap-2.5 rounded-xl border border-line bg-panel-2 px-4 py-3 text-[12px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>{t("models.specializedNote")}</p>
          </div>

          {q.isLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {specialized.map((m) => (
                <SpecializedModelCard key={m.modelId} model={m} highlighted={payloadModelId === m.modelId} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ModelCardDialog
        modelId={dialogModelId}
        model={dialogModel}
        onClose={() => setDialogModelId(null)}
      />
    </div>
  )
}
