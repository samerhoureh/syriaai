"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  BrainCircuit, Cpu, FlaskConical, Gauge, Pause, Play, Plus, RotateCcw, ScrollText, Square, SquarePen, TriangleAlert, X,
} from "lucide-react"
import { useI18n } from "@/components/syria/language-provider"
import { useNav } from "@/lib/store"
import { apiGet, apiPatch, apiPost } from "@/lib/api"
import type { AiModel, DataSource, Experiment, NeuralExperiment, NeuralTestReport } from "@/lib/types"
import { ViewHeader, SectionCard, StatusBadge, SourceBadge, EmptyState } from "@/components/syria/ui-bits"
import { LossCurve } from "@/components/syria/charts"
import { fmtNum, fmtB, fmtPct, fmtDate, fmtWeeksAr, fmtWeeksEn, fmtRemainingAr, fmtRemainingEn } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

function StatTile({ label, value, tone }: { label: string; value: React.ReactNode; tone: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-line bg-panel px-4 py-3">
      <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
      <span className="text-xl font-extrabold num" style={{ color: tone }}>
        {value}
      </span>
    </div>
  )
}

function CreateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useI18n()
  const qc = useQueryClient()
  const modelsQ = useQuery({
    queryKey: ["models"],
    queryFn: () => apiGet<{ foundation: AiModel[] }>("/api/models"),
  })
  const [titleAr, setTitleAr] = React.useState("")
  const [modelId, setModelId] = React.useState("syria-ai-nano")
  const [totalSteps, setTotalSteps] = React.useState("100000")
  const [lr, setLr] = React.useState("0.0006")
  const [batch, setBatch] = React.useState("64")
  const [seqLen, setSeqLen] = React.useState("2048")
  const [busy, setBusy] = React.useState(false)

  const submit = async () => {
    setBusy(true)
    try {
      await apiPost("/api/experiments", {
        titleAr,
        modelId,
        totalSteps: Number(totalSteps),
        learningRate: Number(lr),
        batchSize: Number(batch),
        seqLen: Number(seqLen),
      })
      toast({ title: t("exp.newDialog.success"), description: modelId })
      qc.invalidateQueries({ queryKey: ["experiments"] })
      onOpenChange(false)
      setTitleAr("")
    } catch (e) {
      toast({ title: t("c.error"), description: String(e instanceof Error ? e.message : e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-line bg-popover sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("exp.newDialog.title")}</DialogTitle>
          <DialogDescription>{t("exp.newDialog.desc")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3.5 py-1">
          <div className="grid gap-1.5">
            <Label htmlFor="exp-title">{t("exp.newDialog.titleAr")}</Label>
            <Input id="exp-title" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} placeholder="تجربة تدريب تجريبية" />
          </div>
          <div className="grid gap-1.5">
            <Label>{t("exp.newDialog.model")}</Label>
            <Select value={modelId} onValueChange={setModelId}>
              <SelectTrigger aria-label={t("exp.newDialog.model")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(modelsQ.data?.foundation ?? [])
                  .filter((m) => ["syria-ai-nano", "syria-ai-debug", "syria-ai-mini"].includes(m.modelId))
                  .map((m) => (
                    <SelectItem key={m.modelId} value={m.modelId}>
                      {m.name} <span className="num text-muted-foreground">({m.params})</span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="exp-steps" className="num">{t("exp.newDialog.steps")}</Label>
              <Input id="exp-steps" dir="ltr" value={totalSteps} onChange={(e) => setTotalSteps(e.target.value)} inputMode="numeric" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="exp-lr" className="num">{t("exp.newDialog.lr")}</Label>
              <Input id="exp-lr" dir="ltr" value={lr} onChange={(e) => setLr(e.target.value)} inputMode="decimal" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="exp-batch" className="num">{t("exp.newDialog.batch")}</Label>
              <Input id="exp-batch" dir="ltr" value={batch} onChange={(e) => setBatch(e.target.value)} inputMode="numeric" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="exp-seq" className="num">{t("exp.newDialog.seq")}</Label>
              <Input id="exp-seq" dir="ltr" value={seqLen} onChange={(e) => setSeqLen(e.target.value)} inputMode="numeric" />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("c.cancel")}</Button>
          <Button onClick={submit} disabled={busy || !titleAr.trim()} className="min-h-9">
            {busy ? t("c.loading") : t("exp.newDialog.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DetailPanel({ exp, onClose }: { exp: Experiment; onClose: () => void }) {
  const { t, lang } = useI18n()
  const qc = useQueryClient()
  const detailQ = useQuery({
    queryKey: ["experiment", exp.id],
    queryFn: () => apiGet<Experiment & { lossPoints: { step: number; trainLoss: number; validLoss: number | null }[] }>(`/api/experiments/${exp.id}`),
  })
  const [busy, setBusy] = React.useState<string | null>(null)

  const act = async (action: string, msg: string) => {
    setBusy(action)
    try {
      await apiPatch(`/api/experiments/${exp.id}`, { action })
      toast({ title: msg, description: exp.expId })
      qc.invalidateQueries({ queryKey: ["experiments"] })
      qc.invalidateQueries({ queryKey: ["experiment", exp.id] })
    } catch (e) {
      toast({ title: t("c.error"), description: String(e instanceof Error ? e.message : e) })
    } finally {
      setBusy(null)
    }
  }

  const cfgRows: [string, React.ReactNode][] = [
    [t("c.architecture"), <span key="a" className="font-mono text-xs" dir="ltr">{exp.architecture}</span>],
    [t("c.optimizer"), <span key="o" className="num" dir="ltr">{exp.optimizer}</span>],
    [t("c.learningRate"), <span key="lr" className="num" dir="ltr">{exp.learningRate}</span>],
    [t("c.batchSize"), <span key="b" className="num" dir="ltr">{exp.batchSize}</span>],
    [t("c.seqLen"), <span key="s" className="num" dir="ltr">{exp.seqLen}</span>],
    [t("c.warmup"), <span key="w" className="num" dir="ltr">{fmtNum(exp.warmupSteps)}</span>],
    [t("c.weightDecay"), <span key="wd" className="num" dir="ltr">{exp.weightDecay}</span>],
    [t("c.precision"), <span key="p" className="font-mono text-xs" dir="ltr">{exp.precision}</span>],
    [t("c.seed"), <span key="sd" className="num" dir="ltr">{exp.seed}</span>],
  ]

  return (
    <div className="fade-up grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
      <SectionCard
        title={`${exp.expId} — ${lang === "ar" ? exp.titleAr : exp.title}`}
        subtitle={t("exp.details.subtitle")}
        icon={<FlaskConical className="h-4 w-4" />}
        action={
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label={t("c.close")}>
            <X className="h-4 w-4" />
          </Button>
        }
        bodyClassName="p-4 space-y-4"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [t("exp.metrics.tokens"), `${fmtB(exp.tokensB)} / ${fmtB(exp.tokensTargetB)}`],
            [t("exp.metrics.elapsed"), lang === "ar" ? fmtWeeksAr(exp.elapsedWeeks) : fmtWeeksEn(exp.elapsedWeeks)],
            [t("exp.metrics.trainLoss"), exp.trainLoss?.toFixed(3) ?? "—"],
            [t("exp.metrics.validLoss"), exp.validLoss?.toFixed(3) ?? "—"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-line bg-panel-2 px-3 py-2.5">
              <div className="text-[10.5px] text-muted-foreground">{label}</div>
              <div className="mt-0.5 text-sm font-bold num" dir="ltr">{value}</div>
            </div>
          ))}
        </div>

        <div>
          <h3 className="mb-2 text-xs font-bold text-muted-foreground">{t("exp.curve")}</h3>
          {detailQ.data?.lossPoints?.length ? (
            <LossCurve
              points={detailQ.data.lossPoints}
              maxStep={exp.totalSteps}
              height={220}
              trainLabel={t("dash.loss.train")}
              validLabel={t("dash.loss.valid")}
            />
          ) : (
            <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-xs text-muted-foreground">
              {t("exp.curve.none")}
            </p>
          )}
        </div>

        <p className="rounded-lg bg-panel-2 px-3 py-2 text-[11.5px] leading-relaxed text-muted-foreground">
          <span className="font-bold text-foreground/80">{t("exp.notes")}: </span>
          {exp.notes ?? "—"}
        </p>
      </SectionCard>

      <div className="space-y-4">
        <SectionCard title={t("exp.config")} icon={<Gauge className="h-4 w-4" />} bodyClassName="p-4">
          <dl className="space-y-2 text-xs">
            {cfgRows.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3 border-b border-line/60 pb-2 last:border-0 last:pb-0">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>

        <SectionCard title={t("exp.controls")} icon={<SquarePen className="h-4 w-4" />} bodyClassName="p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(exp.status === "queued" || exp.status === "paused") && (
              <Button size="sm" className="min-h-9 gap-1.5" onClick={() => act(exp.status === "queued" ? "start" : "resume", exp.status === "queued" ? t("exp.action.started") : t("exp.action.resumed"))} disabled={busy !== null}>
                <Play className="h-3.5 w-3.5" /> {t("c.start")}
              </Button>
            )}
            {exp.status === "running" && (
              <Button size="sm" variant="secondary" className="min-h-9 gap-1.5" onClick={() => act("pause", t("exp.action.paused"))} disabled={busy !== null}>
                <Pause className="h-3.5 w-3.5" /> {t("c.pause")}
              </Button>
            )}
            {["running", "paused", "queued"].includes(exp.status) && (
              <Button size="sm" variant="destructive" className="min-h-9 gap-1.5" onClick={() => act("stop", t("exp.action.stopped"))} disabled={busy !== null}>
                <Square className="h-3.5 w-3.5" /> {t("c.stop")}
              </Button>
            )}
            {["completed", "failed", "stopped"].includes(exp.status) && (
              <Button size="sm" variant="secondary" className="min-h-9 gap-1.5" onClick={() => act("resume", t("exp.action.resumed"))} disabled={busy !== null}>
                <RotateCcw className="h-3.5 w-3.5" /> {t("c.resume")}
              </Button>
            )}
          </div>
          <p className="text-[10.5px] leading-relaxed text-muted-foreground">{t("exp.controls.hint")}</p>
        </SectionCard>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * REAL ENGINE SECTION — live data from the Python/PyTorch neural service.
 * Everything here is REAL (metrics.json / checkpoint / pytest artifacts).
 * ------------------------------------------------------------------------ */

function fmtDurationSec(sec: number | null | undefined): string {
  if (sec === null || sec === undefined || Number.isNaN(sec)) return "—"
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}m ${s}s`
}

function RealTile({ label, value, mono = true }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-panel-2 px-3 py-2.5">
      <div className="text-[10.5px] text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-sm font-bold text-foreground", mono && "num")} dir="ltr">
        {value}
      </div>
    </div>
  )
}

function RealEngineSection() {
  const { t } = useI18n()
  const qc = useQueryClient()

  const expQ = useQuery({
    queryKey: ["neural-experiments"],
    queryFn: () => apiGet<{ source: DataSource; experiments: NeuralExperiment[] }>("/api/neural/experiments"),
  })
  const sysQ = useQuery({
    queryKey: ["neural-system"],
    queryFn: () => apiGet<{ source: DataSource; gpu?: { available?: boolean; message?: string } }>("/api/neural/system"),
    staleTime: 10_000,
  })
  const trainQ = useQuery({
    queryKey: ["neural-training"],
    queryFn: () => apiGet<{ source: DataSource; running?: boolean; pid?: number | null }>("/api/neural/training"),
    refetchInterval: (query) => (query.state.data?.running ? 5000 : 15000),
  })
  const testsQ = useQuery({
    queryKey: ["neural-tests"],
    queryFn: () => apiGet<{ source: DataSource; results: NeuralTestReport[] }>("/api/neural/tests"),
  })

  const [busy, setBusy] = React.useState<"start" | "stop" | null>(null)

  const refreshAll = React.useCallback(() => {
    for (const k of ["neural-experiments", "neural-system", "neural-training", "neural-tests"]) {
      qc.invalidateQueries({ queryKey: [k] })
    }
  }, [qc])

  const startTraining = async () => {
    setBusy("start")
    try {
      const res = await apiPost<{ source: DataSource; ok?: boolean; error?: string; pid?: number; exp_id?: string }>(
        "/api/neural/training",
        { action: "start", steps: 1200 }
      )
      if (res.error === "TRAINING_ALREADY_RUNNING") {
        toast({ title: t("exp.real.alreadyRunning") })
      } else if (res.ok) {
        toast({ title: t("exp.real.started"), description: res.exp_id ?? "EXP-001" })
      } else {
        toast({ title: t("c.error"), description: res.error ?? t("exp.real.unavailable") })
      }
    } catch (e) {
      toast({ title: t("c.error"), description: String(e instanceof Error ? e.message : e) })
    } finally {
      setBusy(null)
      qc.invalidateQueries({ queryKey: ["neural-training"] })
      qc.invalidateQueries({ queryKey: ["neural-experiments"] })
    }
  }

  const stopTraining = async () => {
    setBusy("stop")
    try {
      const res = await apiPost<{ source: DataSource; ok?: boolean; status?: string }>("/api/neural/training", { action: "stop" })
      if (res.ok) toast({ title: t("exp.real.stopped") })
      else toast({ title: t("c.error"), description: res.status ?? t("exp.real.unavailable") })
    } catch (e) {
      toast({ title: t("c.error"), description: String(e instanceof Error ? e.message : e) })
    } finally {
      setBusy(null)
      qc.invalidateQueries({ queryKey: ["neural-training"] })
    }
  }

  /* derived */
  const unavailable = expQ.isError || expQ.data?.source === "UNAVAILABLE"
  const exp = expQ.data?.experiments?.[0] ?? null
  const running = !!trainQ.data?.running
  const pid = trainQ.data?.pid ?? null

  const lossPoints = React.useMemo(() => {
    const hist = exp?.loss_history ?? []
    const merged = new Map<number, { step: number; trainLoss: number | null; validLoss: number | null }>()
    for (const p of hist) {
      const step = Number(p.step)
      if (!Number.isFinite(step)) continue
      const cur = merged.get(step) ?? { step, trainLoss: null, validLoss: null }
      if (typeof p.train_loss === "number") cur.trainLoss = p.train_loss
      if (typeof p.valid_loss === "number") cur.validLoss = p.valid_loss
      merged.set(step, cur)
    }
    const out = [...merged.values()].sort((a, b) => a.step - b.step)
    let lastTrain: number | null = null
    for (const p of out) {
      if (p.trainLoss === null && lastTrain !== null) p.trainLoss = lastTrain
      else if (p.trainLoss !== null) lastTrain = p.trainLoss
    }
    return out.filter((p): p is { step: number; trainLoss: number; validLoss: number | null } => p.trainLoss !== null)
  }, [exp])

  const pytest = (testsQ.data?.results ?? []).find((r) => !Array.isArray(r.checks)) ?? null
  const selftest = (testsQ.data?.results ?? []).find((r) => Array.isArray(r.checks)) ?? null
  const selfChecks = ((selftest?.checks ?? []) as { name: string; pass: boolean }[]) ?? []
  const selfPassed = selfChecks.filter((c) => c.pass).length

  /* ------------------------------ unavailable ----------------------------- */
  if (unavailable) {
    return (
      <SectionCard
        title={t("exp.real.title")}
        subtitle={t("exp.real.subtitle")}
        icon={<Cpu className="h-4 w-4" />}
        action={<SourceBadge source="UNAVAILABLE" />}
        bodyClassName="p-4"
      >
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line px-6 py-10 text-center">
          <TriangleAlert className="h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm font-bold text-muted-foreground">{t("exp.real.unavailable")}</p>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground/70">{t("exp.real.unavailableHint")}</p>
          <Button variant="outline" size="sm" className="min-h-9 gap-1.5" onClick={refreshAll}>
            <RotateCcw className="h-3.5 w-3.5" /> {t("c.retry")}
          </Button>
        </div>
      </SectionCard>
    )
  }

  /* ------------------------------- loading -------------------------------- */
  if (expQ.isLoading || (!exp && expQ.isLoading)) {
    return (
      <SectionCard title={t("exp.real.title")} subtitle={t("exp.real.subtitle")} icon={<Cpu className="h-4 w-4" />} bodyClassName="p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      </SectionCard>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_1fr]">
        {/* main REAL experiment card */}
        <div className="space-y-4">
          <SectionCard
            title={exp ? `${exp.exp_id} — ${exp.model_id ?? ""}` : t("exp.real.title")}
            subtitle={t("exp.real.subtitle")}
            icon={<Cpu className="h-4 w-4" />}
            action={
              <div className="flex items-center gap-2">
                {exp ? <StatusBadge status={exp.status ?? "completed"} size="sm" /> : null}
                <SourceBadge source="REAL" />
              </div>
            }
            bodyClassName="p-4 space-y-4"
          >
            {exp ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <RealTile label={t("exp.newDialog.model")} value={exp.model_id ?? "—"} />
                  <RealTile label={t("c.parameters")} value={fmtNum(exp.params ?? 0)} />
                  <RealTile
                    label={t("c.steps")}
                    value={`${fmtNum(exp.steps_completed ?? 0)} / ${fmtNum(exp.max_steps ?? 0)}`}
                  />
                  <RealTile label={t("exp.metrics.tokens")} value={fmtNum(exp.tokens_processed ?? 0)} />
                  <RealTile label={t("exp.metrics.trainLoss")} value={`${exp.first_train_loss?.toFixed(3) ?? "—"} → ${exp.final_train_loss?.toFixed(3) ?? "—"}`} />
                  <RealTile label={t("exp.metrics.validLoss")} value={exp.valid_loss?.toFixed(3) ?? "—"} />
                  <RealTile label={t("exp.real.duration")} value={fmtDurationSec(exp.duration_sec)} />
                  <RealTile label={t("exp.real.avgSpeed")} value={`${fmtNum(exp.avg_tokens_per_sec ?? 0)} tok/s`} />
                </div>

                {/* static progress (completed run — no animation) */}
                <div className="flex items-center gap-2.5">
                  <div
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={100}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, ((exp.steps_completed ?? 0) / Math.max(1, exp.max_steps ?? 1)) * 100)}%`,
                        background: "var(--chart-1)",
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-bold num text-muted-foreground">
                    {fmtPct(Math.min(100, ((exp.steps_completed ?? 0) / Math.max(1, exp.max_steps ?? 1)) * 100))}
                  </span>
                </div>

                {/* REAL loss curve */}
                <div>
                  <h3 className="mb-2 text-xs font-bold text-muted-foreground">{t("exp.real.lossChart")}</h3>
                  {lossPoints.length > 0 ? (
                    <LossCurve
                      points={lossPoints}
                      maxStep={exp.max_steps ?? 1200}
                      height={210}
                      trainLabel={t("dash.loss.train")}
                      validLabel={t("dash.loss.valid")}
                    />
                  ) : (
                    <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-xs text-muted-foreground">
                      {t("exp.curve.none")}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <EmptyState icon={<Cpu className="h-8 w-8" />} title={t("exp.real.noExperiments")} />
            )}
          </SectionCard>

          {/* hardware + checkpoint */}
          {exp && (
            <SectionCard title={t("exp.real.hardware")} icon={<Gauge className="h-4 w-4" />} bodyClassName="p-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <RealTile label={t("exp.real.hardware")} value={exp.hardware?.device ?? "cpu"} />
                <RealTile
                  label="GPU"
                  value={<span className="text-xs font-semibold text-muted-foreground">{exp.hardware?.message ?? "No GPU detected"}</span>}
                  mono={false}
                />
                <RealTile label={t("exp.real.checkpointSize")} value={`${((exp.checkpoint?.bytes ?? 0) / 1e6).toFixed(1)} MB`} />
                <RealTile
                  label={t("exp.real.checkpoint")}
                  value={<span className="font-mono text-[10.5px] text-muted-foreground">{exp.checkpoint?.path ?? "—"}</span>}
                  mono={false}
                />
              </div>
              {sysQ.data?.gpu?.message && !exp.hardware?.message ? (
                <p className="mt-3 text-[11px] text-muted-foreground" dir="ltr">{sysQ.data.gpu.message}</p>
              ) : null}
            </SectionCard>
          )}

          {/* error/training log viewer */}
          {exp?.logs_preview?.length ? (
            <SectionCard title={t("exp.real.logs")} icon={<ScrollText className="h-4 w-4" />} action={<SourceBadge source="REAL" />} bodyClassName="p-4">
              <pre
                className="max-h-40 overflow-y-auto scrollbar-sy rounded-lg border border-line bg-panel-2 px-3 py-2.5 font-mono text-[10.5px] leading-relaxed text-muted-foreground"
                dir="ltr"
              >
                {exp.logs_preview.slice(-15).join("\n")}
              </pre>
            </SectionCard>
          ) : null}
        </div>

        {/* controls + tests column */}
        <div className="space-y-4">
          <SectionCard title={t("exp.real.controls")} icon={<SquarePen className="h-4 w-4" />} action={<SourceBadge source="REAL" />} bodyClassName="p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" className="min-h-9 gap-1.5" disabled={busy !== null || running}>
                    <Play className="h-3.5 w-3.5" /> {t("exp.real.start")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="border-line bg-popover">
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("exp.real.startConfirmTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("exp.real.startConfirmDesc")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("c.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={startTraining}>{t("c.confirm")}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                size="sm"
                variant="secondary"
                className="min-h-9 gap-1.5"
                onClick={stopTraining}
                disabled={busy !== null || !running}
              >
                <Square className="h-3.5 w-3.5" /> {t("exp.real.stop")}
              </Button>
              <Button size="sm" variant="ghost" className="min-h-9 gap-1.5" onClick={refreshAll} disabled={busy !== null}>
                <RotateCcw className="h-3.5 w-3.5" /> {t("exp.real.refresh")}
              </Button>
            </div>
            <p className="rounded-lg bg-panel-2 px-3 py-2 text-[11.5px] font-semibold">
              {running ? (
                <span className="inline-flex items-center gap-2 text-primary">
                  <span className="h-2 w-2 rounded-full bg-primary pulse-dot" />
                  {t("exp.real.running", { pid: pid ?? "—" })}
                </span>
              ) : (
                <span className="text-muted-foreground">{t("exp.real.idle")}</span>
              )}
            </p>
          </SectionCard>

          <SectionCard title={t("exp.real.tests")} icon={<BrainCircuit className="h-4 w-4" />} action={<SourceBadge source={testsQ.data?.source ?? "REAL"} />} bodyClassName="p-4 space-y-3">
            {testsQ.isLoading ? (
              <Skeleton className="h-16 rounded-lg" />
            ) : pytest || selftest ? (
              <>
                {pytest && (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel-2 px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold" dir="ltr">{pytest.suite ?? "pytest"}</div>
                      <div className="mt-0.5 text-[10.5px] text-muted-foreground num" dir="ltr">
                        {fmtNum(pytest.passed ?? 0)} passed / {fmtNum(pytest.failed ?? 0)} failed · {pytest.duration_sec ?? "—"}s
                      </div>
                    </div>
                    <span
                      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold"
                      style={{
                        color: pytest.all_passed ? "var(--chart-1)" : "var(--chart-5)",
                        borderColor: `color-mix(in oklab, ${pytest.all_passed ? "var(--chart-1)" : "var(--chart-5)"} 40%, transparent)`,
                        background: `color-mix(in oklab, ${pytest.all_passed ? "var(--chart-1)" : "var(--chart-5)"} 10%, transparent)`,
                      }}
                    >
                      {pytest.all_passed ? "ALL PASSED" : "FAILURES"}
                    </span>
                  </div>
                )}
                {selftest && (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel-2 px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold">{t("exp.real.selftest")}</div>
                      <div className="mt-0.5 text-[10.5px] text-muted-foreground num" dir="ltr">
                        {fmtNum(selfPassed)} / {fmtNum(selfChecks.length)} checks
                      </div>
                    </div>
                    <span
                      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold"
                      style={{
                        color: selfPassed === selfChecks.length && selfChecks.length > 0 ? "var(--chart-1)" : "var(--chart-5)",
                        borderColor: `color-mix(in oklab, ${selfPassed === selfChecks.length ? "var(--chart-1)" : "var(--chart-5)"} 40%, transparent)`,
                        background: `color-mix(in oklab, ${selfPassed === selfChecks.length ? "var(--chart-1)" : "var(--chart-5)"} 10%, transparent)`,
                      }}
                    >
                      {selfPassed === selfChecks.length && selfChecks.length > 0 ? "ALL PASSED" : "FAILURES"}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">{t("c.soon")}</p>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

export default function ExperimentsView() {
  const { t, lang } = useI18n()
  const { payload, navigate } = useNav()
  const [selected, setSelected] = React.useState<string | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)

  const q = useQuery({
    queryKey: ["experiments"],
    queryFn: () => apiGet<Experiment[]>("/api/experiments"),
    refetchInterval: 10_000,
  })
  const rows = q.data ?? []

  // payload-driven open actions (from dashboard quick actions / tables)
  React.useEffect(() => {
    const p = payload as { openNew?: boolean; expId?: string } | undefined
    if (!p) return
    if (p.openNew) setCreateOpen(true)
    if (p.expId) setSelected(p.expId)
     
  }, [payload])

  const selectedExp = rows.find((e) => e.expId === selected) ?? null
  const stats = {
    active: rows.filter((e) => e.status === "running").length,
    completed: rows.filter((e) => e.status === "completed").length,
    failed: rows.filter((e) => e.status === "failed").length,
    total: rows.length,
  }

  return (
    <div className="space-y-4">
      <ViewHeader
        title={t("exp.title")}
        subtitle={t("exp.subtitle")}
        icon={<FlaskConical className="h-5 w-5" />}
        actions={
          <Button className="min-h-9 gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> {t("exp.new")}
          </Button>
        }
      />

      {/* REAL neural engine section (Python/PyTorch service) */}
      <RealEngineSection />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={t("exp.stat.active")} value={stats.active} tone="var(--chart-1)" />
        <StatTile label={t("exp.stat.completed")} value={stats.completed} tone="var(--chart-3)" />
        <StatTile label={t("exp.stat.failed")} value={stats.failed} tone="var(--chart-5)" />
        <StatTile label={t("exp.stat.total")} value={stats.total} tone="var(--foreground)" />
      </div>

      <SectionCard
        title={t("exp.demo.title")}
        subtitle={t("exp.demo.subtitle")}
        icon={<FlaskConical className="h-4 w-4" />}
        action={<SourceBadge source="DEMO" />}
        bodyClassName="p-0"
      >
        {q.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-md" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={<FlaskConical className="h-8 w-8" />} title={t("exp.noRuns")} />
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-sy">
            <table className="w-full min-w-[760px] text-[12.5px]">
              <thead>
                <tr className="border-b border-line/70 text-muted-foreground">
                  <th className="px-4 py-3 text-start font-semibold">{t("exp.tbl.id")}</th>
                  <th className="px-3 py-3 text-start font-semibold">{t("exp.tbl.title")}</th>
                  <th className="px-3 py-3 text-start font-semibold">{t("exp.tbl.model")}</th>
                  <th className="px-3 py-3 text-start font-semibold">{t("exp.tbl.status")}</th>
                  <th className="w-40 px-3 py-3 text-start font-semibold">{t("exp.tbl.progress")}</th>
                  <th className="px-3 py-3 text-start font-semibold">{t("exp.tbl.validLoss")}</th>
                  <th className="px-3 py-3 text-start font-semibold">{t("exp.tbl.speed")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("exp.tbl.started")}</th>
                  <th className="px-3 py-3 text-start font-semibold">{t("exp.tbl.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr
                    key={e.id}
                    className={cn(
                      "border-b border-line/50 transition-colors last:border-0 hover:bg-accent/60",
                      selected === e.expId && "bg-primary/6"
                    )}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary num" dir="ltr">{e.expId}</span>
                        <SourceBadge source="DEMO" />
                      </div>
                    </td>
                    <td className="max-w-52 truncate px-3 py-2.5">{lang === "ar" ? e.titleAr : e.title}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 num" dir="ltr">{e.modelName}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={e.status} size="sm" /></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
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
                    <td className="px-3 py-2.5 num" dir="ltr">{e.validLoss?.toFixed(3) ?? "—"}</td>
                    <td className="px-3 py-2.5 num" dir="ltr">{fmtNum(e.speedTokSec)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground num" dir="ltr">{fmtDate(e.startedAt, "en")}</td>
                    <td className="px-3 py-2.5">
                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSelected(e.expId)}>
                        {t("c.details")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {selectedExp && <DetailPanel exp={selectedExp} onClose={() => setSelected(null)} />}

      <CreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
