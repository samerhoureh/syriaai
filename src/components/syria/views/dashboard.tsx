"use client"

import * as React from "react"
import Image from "next/image"
import { useQuery } from "@tanstack/react-query"
import {
  Boxes, Check, CheckCircle2, Cpu, Database, FlaskConical, KeyRound, LineChart,
  MessageSquareText, PlayCircle, RefreshCcw, Rocket, Sparkles, Table2, Zap,
} from "lucide-react"
import { useI18n } from "@/components/syria/language-provider"
import { useNav } from "@/lib/store"
import { apiGet } from "@/lib/api"
import type { AiModel, Experiment, SystemInfo, DataSource } from "@/lib/types"
import { ProgressRing, MeterBar, LossCurve } from "@/components/syria/charts"
import { SectionCard, StatusBadge, SourceBadge, SyriaFlag } from "@/components/syria/ui-bits"
import { fmtNum, fmtB, fmtPct, fmtDate, fmtWeeksAr, fmtRemainingAr, fmtWeeksEn, fmtRemainingEn } from "@/lib/format"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

const MODEL_STATUS_TONE: Record<string, { fg: string; filled?: boolean }> = {
  experimental: { fg: "var(--chart-1)", filled: true },
  training: { fg: "var(--chart-1)" },
  planning: { fg: "var(--muted-foreground)" },
  planned: { fg: "var(--muted-foreground)" },
  debug: { fg: "var(--chart-2)" },
}

function HeroBanner() {
  const { t } = useI18n()
  const chips = ["research", "train", "eval", "release", "open"] as const
  return (
    <section className="fade-up relative overflow-hidden rounded-xl border border-line panel-glow">
      <div className="absolute inset-0 bg-gradient-to-l from-[#052e18] via-[#04140b] to-[#030b06]" aria-hidden />
      <Image
        src="/images/hero-syria.png"
        alt=""
        fill
        priority
        sizes="(max-width: 1024px) 100vw, 1200px"
        className="object-cover object-center opacity-80 dark:opacity-70"
      />
      <div className="absolute inset-0" style={{ background: "var(--hero-overlay)" }} aria-hidden />
      <div className="grid-bg absolute inset-0" aria-hidden />
      <div className="relative flex min-h-[150px] flex-col justify-center gap-2 px-5 py-6 md:min-h-[172px] md:px-8">
        {/* waving flag mark (start side) */}
        <div className="pointer-events-none absolute inset-y-0 start-4 hidden w-44 items-center opacity-95 md:flex" aria-hidden>
          <SyriaFlag className="w-40 drop-shadow-[0_6px_20px_rgba(0,0,0,0.55)]" waving />
        </div>
        <div className="md:ms-56">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary backdrop-blur">
            <Sparkles className="h-3 w-3" />
            {t("dash.hero.badge")}
          </span>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white drop-shadow md:text-[34px] md:leading-tight">
            {t("dash.hero.title")}
          </h1>
          <p className="max-w-2xl text-xs font-medium text-white/80 md:text-sm">{t("dash.hero.subtitle")}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {chips.map((c) => (
              <span
                key={c}
                className="rounded-md border border-white/20 bg-white/10 px-2.5 py-1 text-[10.5px] font-bold text-white/90 backdrop-blur-sm"
              >
                {t(`dash.hero.chip.${c}`)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function ModelCards() {
  const { t, lang } = useI18n()
  const { navigate } = useNav()
  const [selected, setSelected] = React.useState<string | null>(null)
  const q = useQuery({
    queryKey: ["models"],
    queryFn: () => apiGet<{ foundation: AiModel[]; specialized: AiModel[] }>("/api/models"),
    refetchInterval: 20_000,
  })

  const models = (q.data?.foundation ?? []).slice(0, 4)

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={t("dash.models.title")}>
      {q.isLoading
        ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)
        : models.map((m) => {
            const tone = MODEL_STATUS_TONE[m.status] ?? { fg: "var(--muted-foreground)" }
            const isSelected = selected === m.modelId
            const isStar = m.status === "experimental"
            return (
              <button
                key={m.id}
                onClick={() => {
                  setSelected(m.modelId)
                  navigate("models", { modelId: m.modelId })
                }}
                className={cn(
                  "group relative flex flex-col gap-2.5 rounded-xl border bg-panel p-4 text-start transition-all duration-200 hover:-translate-y-0.5",
                  isStar || isSelected
                    ? "border-primary/60 shadow-[0_0_28px_-8px_var(--glow)]"
                    : "border-line hover:border-primary/35"
                )}
                aria-label={`${m.name} — ${t(`status.${m.status}`)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-lg border"
                      style={{
                        borderColor: `color-mix(in oklab, ${tone.fg} 45%, transparent)`,
                        background: `color-mix(in oklab, ${tone.fg} 10%, transparent)`,
                        color: tone.fg,
                      }}
                    >
                      <Boxes className="h-5 w-5" />
                    </span>
                    <div className="leading-tight">
                      <div className="text-[15px] font-extrabold tracking-tight">{m.name}</div>
                      <div className="text-[11px] text-muted-foreground num">
                        {m.params} {t("dash.models.params")}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={m.status} size="sm" dot={false} />
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${m.progress}%`,
                        background: `linear-gradient(90deg, color-mix(in oklab, ${tone.fg} 45%, transparent), ${tone.fg})`,
                      }}
                    />
                  </div>
                  <span className="w-10 text-end text-[11px] font-bold num" style={{ color: tone.fg }}>
                    {fmtPct(m.progress)}
                  </span>
                </div>
              </button>
            )
          })}
    </div>
  )
}

function TrainingProgressCard() {
  const { t, lang } = useI18n()
  const { navigate } = useNav()
  const q = useQuery({
    queryKey: ["experiments"],
    queryFn: () => apiGet<Experiment[]>("/api/experiments"),
    refetchInterval: 10_000,
  })
  const running = q.data?.find((e) => e.status === "running")

  return (
    <SectionCard
      title={running ? t("dash.train.demoTitle") : t("dash.train.title")}
      icon={<RefreshCcw className="h-4 w-4" />}
      action={
        <div className="flex items-center gap-2">
          {running ? <SourceBadge source="DEMO" /> : null}
          <Button variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground" onClick={() => navigate("experiments")}>
            {t("dash.train.goExperiments")}
          </Button>
        </div>
      }
      bodyClassName="p-4"
    >
      {q.isLoading ? (
        <Skeleton className="h-44 rounded-lg" />
      ) : !running ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("dash.train.noActive")}</p>
      ) : (
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
          <div className="relative shrink-0">
            <ProgressRing value={running.progress} size={148} stroke={11} label={t("dash.train.progress")} />
            <span className="absolute inset-x-0 -bottom-1 text-center text-[10px] font-bold text-primary num" dir="ltr">
              {running.expId}
            </span>
          </div>
          <dl className="min-w-0 flex-1 space-y-2.5 text-[12px]">
            <div className="flex items-center justify-between gap-3 border-b border-line/70 pb-2">
              <dt className="text-muted-foreground">{t("dash.train.currentStep")}</dt>
              <dd className="font-bold num" dir="ltr">
                {fmtNum(running.steps)} <span className="text-muted-foreground">/ {fmtNum(running.totalSteps)}</span>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-line/70 pb-2">
              <dt className="text-muted-foreground">{t("dash.train.tokensProcessed")}</dt>
              <dd className="font-bold num" dir="ltr">
                {fmtB(running.tokensB)} <span className="text-muted-foreground">/ {fmtB(running.tokensTargetB)}</span>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-line/70 pb-2">
              <dt className="text-muted-foreground">{t("dash.train.speed")}</dt>
              <dd className="font-bold num" dir="ltr">
                {fmtNum(running.speedTokSec)} {t("dash.train.tokSec")}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-line/70 pb-2">
              <dt className="text-muted-foreground">{t("dash.train.elapsed")}</dt>
              <dd className="font-bold">
                {lang === "ar" ? fmtWeeksAr(running.elapsedWeeks) : fmtWeeksEn(running.elapsedWeeks)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">{t("dash.train.remaining")}</dt>
              <dd className="font-bold text-primary">
                {lang === "ar" ? fmtRemainingAr(running.remainingDays) : fmtRemainingEn(running.remainingDays)}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </SectionCard>
  )
}

function LossCard() {
  const { t } = useI18n()
  const q = useQuery({
    queryKey: ["experiments"],
    queryFn: () => apiGet<Experiment[]>("/api/experiments"),
    refetchInterval: 10_000,
    select: (rows) => rows.find((e) => e.status === "running"),
  })

  const pointsQuery = useQuery({
    queryKey: ["lossPoints", q.data?.id],
    enabled: !!q.data,
    queryFn: () => apiGet<{ lossPoints: { step: number; trainLoss: number; validLoss: number | null }[] }>(`/api/experiments/${q.data!.id}`),
    refetchInterval: 30_000,
  })

  const exp = q.data
  const pts = pointsQuery.data?.lossPoints ?? []

  return (
    <SectionCard
      title={t("dash.loss.title")}
      icon={<LineChart className="h-4 w-4" />}
      action={<SourceBadge source="DEMO" />}
      bodyClassName="p-4 pt-2"
    >
      {q.isLoading || pointsQuery.isLoading ? (
        <Skeleton className="h-64 rounded-lg" />
      ) : !exp || pts.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">{t("dash.train.noActive")}</p>
      ) : (
        <LossCurve
          points={pts}
          maxStep={exp.totalSteps}
          height={252}
          trainLabel={t("dash.loss.train")}
          validLabel={t("dash.loss.valid")}
        />
      )}
    </SectionCard>
  )
}

function HardwareCard() {
  const { t } = useI18n()
  const q = useQuery({
    queryKey: ["system"],
    queryFn: () => apiGet<SystemInfo>("/api/system"),
    refetchInterval: 10_000,
  })
  const metrics = q.data?.metrics ?? []
  const order = ["gpu", "ram", "cpu", "storage"]
  const sorted = [...metrics].sort((a, b) => order.indexOf(a.metricId) - order.indexOf(b.metricId))
  const headerSource: DataSource = metrics.length > 0 && metrics.some((m) => m.source === "UNAVAILABLE") ? "UNAVAILABLE" : "REAL"

  return (
    <SectionCard
      title={t("dash.hw.title")}
      icon={<Cpu className="h-4 w-4" />}
      action={<SourceBadge source={headerSource} />}
      bodyClassName="p-4"
    >
      {q.isLoading ? (
        <div className="space-y-3.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 rounded-md" />
          ))}
        </div>
      ) : (
        <div className="space-y-3.5">
          {sorted.map((m) =>
            m.kind === "gpu" && m.detail?.includes("No GPU detected") ? (
              /* honest zinc card — no GPU exists, no progress animation */
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-muted/50 px-3 py-2.5"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="text-xs font-semibold text-muted-foreground" dir="ltr">
                    No GPU detected
                  </span>
                  <span className="mt-0.5 text-[10px] text-muted-foreground/70">{t("dash.hw.noGpu")}</span>
                </div>
                <SourceBadge source={m.source ?? "UNAVAILABLE"} />
              </div>
            ) : (
              <MeterBar
                key={m.id}
                label={m.label}
                value={m.value}
                detail={m.detail}
                tone={m.kind === "gpu" ? "green" : m.kind === "storage" ? "purple" : "blue"}
              />
            )
          )}
        </div>
      )}
    </SectionCard>
  )
}

function PipelineCard() {
  const { t } = useI18n()
  const q = useQuery({
    queryKey: ["system"],
    queryFn: () => apiGet<SystemInfo>("/api/system"),
    refetchInterval: 15_000,
  })
  const stages = q.data?.pipeline ?? []
  const labelKey: Record<string, string> = {
    collect: "dash.pipe.collect",
    clean: "dash.pipe.clean",
    dedup: "dash.pipe.dedup",
    license: "dash.pipe.license",
    ready: "dash.pipe.ready",
  }

  return (
    <SectionCard
      title={t("dash.pipe.title")}
      icon={<Database className="h-4 w-4" />}
      bodyClassName="p-5"
      subtitle={t("dash.pipe.subtitle")}
      action={<SourceBadge source="DEMO" />}
    >
      {q.isLoading ? (
        <Skeleton className="h-28 rounded-lg" />
      ) : (
        <ol className="relative flex items-start justify-between gap-1" aria-label={t("dash.pipe.title")}>
          {/* connector */}
          <span className="absolute inset-x-6 top-[13px] h-0.5 -translate-y-0 bg-primary/35" aria-hidden />
          {stages.map((s, i) => (
            <li key={s.key} className="relative z-10 flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border-2",
                  s.done
                    ? "border-primary bg-primary text-primary-foreground shadow-[0_0_14px_-2px_var(--glow)]"
                    : "border-line bg-panel text-muted-foreground"
                )}
              >
                {s.done ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
              </span>
              <span className="text-[11px] font-bold leading-tight">{t(labelKey[s.key] ?? s.key)}</span>
              <span className="text-[10px] text-muted-foreground num" dir="ltr">
                {s.docsM}M {t("dash.pipe.docsUnit")}
              </span>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  )
}

function RecentExperiments() {
  const { t, lang } = useI18n()
  const { navigate } = useNav()
  const q = useQuery({
    queryKey: ["experiments"],
    queryFn: () => apiGet<Experiment[]>("/api/experiments"),
    refetchInterval: 10_000,
  })
  const rows = (q.data ?? []).slice(0, 5)

  return (
    <SectionCard
      title={t("dash.exp.title")}
      icon={<Table2 className="h-4 w-4" />}
      action={
        <div className="flex items-center gap-2">
          <SourceBadge source="DEMO" />
          <Button variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground" onClick={() => navigate("experiments")}>
            {t("dash.exp.goAll")}
          </Button>
        </div>
      }
      bodyClassName="p-0"
    >
      {q.isLoading ? (
        <div className="p-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 rounded-md" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-sy">
          <table className="w-full min-w-[520px] text-[12px]">
            <thead>
              <tr className="border-b border-line/70 text-muted-foreground">
                <th className="px-4 py-2.5 text-start font-semibold">{t("dash.exp.expId")}</th>
                <th className="px-3 py-2.5 text-start font-semibold">{t("dash.exp.model")}</th>
                <th className="px-3 py-2.5 text-start font-semibold">{t("dash.exp.status")}</th>
                <th className="px-3 py-2.5 text-start font-semibold w-32">{t("dash.exp.progress")}</th>
                <th className="px-3 py-2.5 text-start font-semibold">{t("dash.exp.validLoss")}</th>
                <th className="px-4 py-2.5 text-start font-semibold">{t("dash.exp.started")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr
                  key={e.id}
                  className="cursor-pointer border-b border-line/50 transition-colors last:border-0 hover:bg-accent/60"
                  onClick={() => navigate("experiments", { expId: e.expId })}
                >
                  <td className="px-4 py-2.5 font-bold text-primary num" dir="ltr">
                    {e.expId}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{lang === "ar" ? e.titleAr.split(" ").slice(-2).join(" ") : e.modelName}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={e.status} size="sm" />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${e.progress}%`,
                            background: e.status === "failed" ? "var(--chart-5)" : e.status === "running" ? "var(--chart-4)" : "var(--chart-1)",
                          }}
                        />
                      </div>
                      <span className="text-[11px] font-semibold num">{fmtPct(e.progress)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 num" dir="ltr">
                    {e.validLoss !== null ? e.validLoss.toFixed(3) : "—"}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground num" dir="ltr">
                    {fmtDate(e.startedAt, "en")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}

function QuickActions() {
  const { t } = useI18n()
  const { navigate } = useNav()
  const actions = [
    {
      key: "addDataset",
      icon: Database,
      onClick: () => navigate("datasets", { openImport: true }),
      toastMsg: t("dash.qa.addDataset"),
    },
    {
      key: "newExperiment",
      icon: FlaskConical,
      onClick: () => navigate("experiments", { openNew: true }),
      toastMsg: t("dash.qa.newExperiment"),
    },
    {
      key: "runInference",
      icon: Rocket,
      onClick: () => navigate("inference"),
      toastMsg: t("dash.qa.runInference"),
    },
    {
      key: "createKey",
      icon: KeyRound,
      onClick: () => navigate("api", { openCreate: true }),
      toastMsg: t("dash.qa.createKey"),
    },
    {
      key: "openChat",
      icon: MessageSquareText,
      onClick: () => navigate("chat"),
      toastMsg: t("dash.qa.openChat"),
    },
    {
      key: "benchmarks",
      icon: CheckCircle2,
      onClick: () => navigate("benchmarks"),
      toastMsg: t("nav.benchmarks"),
    },
  ]

  return (
    <SectionCard title={t("dash.qa.title")} icon={<Zap className="h-4 w-4" />} bodyClassName="p-4">
      <div className="grid grid-cols-2 gap-3">
        {actions.map((a) => {
          const Icon = a.icon
          return (
            <button
              key={a.key}
              onClick={a.onClick}
              className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-line bg-panel-2 px-3 py-5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_0_24px_-10px_var(--glow)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/12 text-primary transition-transform group-hover:scale-110">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-[11.5px] font-bold leading-tight">{t(`dash.qa.${a.key}`)}</span>
            </button>
          )
        })}
      </div>
    </SectionCard>
  )
}

export default function DashboardView() {
  const { t } = useI18n()
  return (
    <div className="space-y-4 md:space-y-5">
      <HeroBanner />
      <ModelCards />

      {/* training / loss / hardware */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.45fr_0.95fr]">
        <TrainingProgressCard />
        <LossCard />
        <HardwareCard />
      </div>

      {/* pipeline / experiments / quick actions */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <PipelineCard />
        <RecentExperiments />
        <QuickActions />
      </div>
    </div>
  )
}
