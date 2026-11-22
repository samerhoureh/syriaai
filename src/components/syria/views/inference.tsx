"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { CircleStop, Cpu, Eraser, Play, Rocket, SlidersHorizontal, Weight } from "lucide-react"
import { useI18n } from "@/components/syria/language-provider"
import { apiGet, apiPost } from "@/lib/api"
import type { Experiment, SystemInfo } from "@/lib/types"
import { ViewHeader, SectionCard, StatusBadge, DemoChip, SourceBadge } from "@/components/syria/ui-bits"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

interface InferenceResult {
  model: string
  engine: string
  engineVersion: string
  demo: boolean
  weightsLoaded: boolean
  text: string
  metrics: { latencyMs: number; tokensPerSecond: number; completionTokens: number; promptTokens: number }
}

/** typewriter reveal to emulate token streaming */
function useTypewriter(full: string, speed = 14) {
  const [shown, setShown] = React.useState("")
  React.useEffect(() => {
    if (!full) {
      setShown("")
      return
    }
    let i = 0
    const id = setInterval(() => {
      i += Math.max(1, Math.round(full.length / 160))
      setShown(full.slice(0, i))
      if (i >= full.length) clearInterval(id)
    }, speed)
    return () => clearInterval(id)
  }, [full, speed])
  return shown
}

export default function InferenceView() {
  const { t, lang } = useI18n()
  const sysQ = useQuery({ queryKey: ["system"], queryFn: () => apiGet<SystemInfo>("/api/system") })
  const expQ = useQuery({ queryKey: ["experiments"], queryFn: () => apiGet<Experiment[]>("/api/experiments"), refetchInterval: 15_000 })
  const running = expQ.data?.find((e) => e.status === "running")

  /* REAL trained weights available for inference (from the Python engine registry) */
  const neuralQ = useQuery({
    queryKey: ["neural-models"],
    queryFn: () => apiGet<{ source: string; models: Array<{ model_id: string; status: string; has_checkpoint: boolean; available_for_inference: boolean; checkpoint_bytes?: number }> }>("/api/neural/models"),
  })
  const neuralModel = neuralQ.data?.models?.find((m) => m.has_checkpoint && m.available_for_inference)
  const neuralAvailable = !!neuralModel

  const [model, setModel] = React.useState("syria-ai-debug")
  const [temperature, setTemperature] = React.useState(0.8)
  const [topP, setTopP] = React.useState(0.95)
  const [topK, setTopK] = React.useState(50)
  const [maxTokens, setMaxTokens] = React.useState(256)
  const [prompt, setPrompt] = React.useState("")
  const [result, setResult] = React.useState<InferenceResult | null>(null)
  const [busy, setBusy] = React.useState(false)

  const shown = useTypewriter(result?.text ?? "")

  const run = async () => {
    if (!prompt.trim()) return
    setBusy(true)
    setResult(null)
    try {
      if (neuralAvailable && model === "syria-ai-debug") {
        // REAL neural generation from our trained weights (no rule engine)
        const res = await apiPost<InferenceResult>("/api/neural/generate", {
          prompt,
          params: { temperature, topP, topK, maxTokens },
        })
        setResult(res)
      } else {
        // clearly-labelled demo engine (rule-based, no weights)
        const res = await apiPost<InferenceResult>("/api/inference", {
          prompt,
          model,
          params: { temperature, topP, topK, maxTokens },
        })
        setResult(res)
      }
    } catch (e) {
      toast({
        title: t("inf.error"),
        description: String(e instanceof Error ? e.message : e),
      })
    } finally {
      setBusy(false)
    }
  }

  const presets = [t("inf.preset1"), t("inf.preset2"), t("inf.preset3"), t("inf.preset4")]

  return (
    <div className="space-y-4">
      <ViewHeader
        title={t("inf.title")}
        subtitle={t("inf.subtitle")}
        icon={<Rocket className="h-5 w-5" />}
        actions={<DemoChip label={t("c.demoMode")} />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        {/* controls */}
        <div className="space-y-4">
          <SectionCard title={t("inf.engine")} icon={<Cpu className="h-4 w-4" />} bodyClassName="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">{t("inf.engine.weights")}</span>
              {neuralAvailable ? (
                <SourceBadge source="REAL" />
              ) : (
                <StatusBadge status={running ? "training" : "experimental"} size="sm" dot={false} />
              )}
            </div>
            {neuralAvailable ? (
              <p className="rounded-lg bg-panel-2 px-3 py-2 text-[10.5px] leading-relaxed text-muted-foreground">
                {lang === "ar"
                  ? "أوزان syria-ai-debug المدربة فعلياً محملة في خدمة الاستدلال المستقلة (Python/PyTorch) — التوليد عصبي حقيقي، قد يكون النص غير متماسك لأن النموذج صغير جداً."
                  : "Trained syria-ai-debug weights are loaded in the independent Python inference service — generation is genuinely neural and may be incoherent by design at this scale."}
              </p>
            ) : (
              <p className="rounded-lg bg-panel-2 px-3 py-2 text-[10.5px] leading-relaxed text-muted-foreground">
                {t("inf.engine.weightsNone")}
              </p>
            )}
            {!neuralAvailable && (
              <p className="text-[10.5px] leading-relaxed" style={{ color: "var(--chart-4)" }}>
                {t("inf.engine.demoNote")}
              </p>
            )}
          </SectionCard>

          <SectionCard title={t("inf.model")} icon={<Weight className="h-4 w-4" />} bodyClassName="p-4 space-y-3">
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger aria-label={t("inf.model")} className="min-h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="syria-ai-debug">
                  {lang === "ar" ? "SYRIA AI Debug — أوزان مدربة فعلياً" : "SYRIA AI Debug — real trained weights"}
                </SelectItem>
                <SelectItem value="syria-ai-nano">{t("inf.model.nano")}</SelectItem>
                <SelectItem value="syria-ai-mini" disabled>{t("inf.model.locked")}</SelectItem>
                <SelectItem value="syria-ai-base" disabled>{t("inf.model.locked")}</SelectItem>
                <SelectItem value="syria-ai-pro" disabled>{t("inf.model.locked")}</SelectItem>
              </SelectContent>
            </Select>
            {model === "syria-ai-debug" && neuralAvailable && (
              <p className="text-[10px] num text-muted-foreground" dir="ltr">
                checkpoint: {neuralModel.checkpoint_bytes ? Math.round(neuralModel.checkpoint_bytes / 1_048_576) : "—"} MB · REAL
              </p>
            )}
          </SectionCard>

          <SectionCard title={t("inf.params")} icon={<SlidersHorizontal className="h-4 w-4" />} bodyClassName="p-4 space-y-4">
            {[
              { label: t("inf.params.temp"), value: temperature, set: setTemperature, min: 0.1, max: 1.5, step: 0.05 },
              { label: t("inf.params.topP"), value: topP, set: setTopP, min: 0.1, max: 1, step: 0.05 },
              { label: t("inf.params.topK"), value: topK, set: setTopK, min: 1, max: 100, step: 1 },
              { label: t("inf.params.maxTokens"), value: maxTokens, set: setMaxTokens, min: 32, max: 1024, step: 32 },
            ].map((p) => (
              <div key={p.label} className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{p.label}</span>
                  <span className="font-bold num" dir="ltr">{p.value}</span>
                </div>
                <Slider
                  value={[p.value]}
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  onValueChange={(v) => p.set(v[0])}
                  aria-label={p.label}
                />
              </div>
            ))}
          </SectionCard>
        </div>

        {/* prompt + output */}
        <div className="space-y-4">
          <SectionCard title={t("inf.prompt")} icon={<Play className="h-4 w-4" />} bodyClassName="p-4 space-y-3">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t("inf.promptPlaceholder")}
              className="min-h-28 resize-y border-line bg-panel-2"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) run()
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={run} disabled={busy || !prompt.trim()} className="min-h-9 gap-2">
                {busy ? <CircleStop className="h-4 w-4 animate-pulse" /> : <Play className="h-4 w-4" />}
                {busy ? "..." : t("inf.run")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-9"
                onClick={() => {
                  setPrompt("")
                  setResult(null)
                }}
              >
                <Eraser className="me-1.5 h-3.5 w-3.5" /> {t("inf.clear")}
              </Button>
              <span className="ms-auto text-[10px] text-muted-foreground">Ctrl + Enter</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] text-muted-foreground self-center">{t("inf.presets")}:</span>
              {presets.map((p) => (
                <button
                  key={p}
                  onClick={() => setPrompt(p)}
                  className="rounded-full border border-line bg-panel-2 px-2.5 py-1 text-[10.5px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                >
                  {p}
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title={t("inf.output")}
            icon={<Rocket className="h-4 w-4" />}
            action={
              result ? (
                <span className="flex items-center gap-3 text-[11px] num" dir="ltr">
                  {result.demo ? <DemoChip label={t("c.demoMode")} /> : <SourceBadge source="REAL" />}
                  <span className="text-muted-foreground">{t("inf.metrics.latency")} <b className="text-foreground">{result.metrics.latencyMs}ms</b></span>
                  <span className="text-muted-foreground">{t("inf.metrics.tps")} <b style={{ color: "var(--chart-1)" }}>{result.metrics.tokensPerSecond}</b></span>
                </span>
              ) : undefined
            }
            bodyClassName="p-4"
          >
            {busy ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : result ? (
              <div className="space-y-3">
                <p className={cn("whitespace-pre-wrap text-[13.5px] leading-7")} dir={lang === "ar" ? "rtl" : "ltr"}>
                  {shown}
                  {shown.length < result.text.length && <span className="ms-0.5 inline-block h-4 w-2 animate-pulse bg-primary align-middle" aria-hidden />}
                </p>
                <div className="grid grid-cols-2 gap-2 border-t border-line pt-3 sm:grid-cols-4">
                  {[
                    [t("inf.metrics.prompt"), result.metrics.promptTokens],
                    [t("inf.metrics.completion"), result.metrics.completionTokens],
                    [t("inf.metrics.latency"), `${result.metrics.latencyMs}ms`],
                    [t("inf.metrics.tps"), result.metrics.tokensPerSecond],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="rounded-lg border border-line bg-panel-2 px-3 py-2 text-center">
                      <div className="text-[10px] text-muted-foreground">{k}</div>
                      <div className="mt-0.5 text-sm font-bold num" dir="ltr">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-line px-4 py-12 text-center text-xs text-muted-foreground">
                {t("inf.outputEmpty")}
              </p>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
