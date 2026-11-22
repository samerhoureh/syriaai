"use client"

import * as React from "react"
import { useI18n } from "@/components/syria/language-provider"

/* -------------------------------------------------------------------------
 * SYRIA AI — lightweight dependency-free SVG chart primitives
 * ------------------------------------------------------------------------- */

export function useMeasure<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null)
  const [width, setWidth] = React.useState(0)
  React.useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width)
    })
    ro.observe(el)
    setWidth(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])
  return { ref, width }
}

/* ------------------------------ ProgressRing ----------------------------- */

export function ProgressRing({
  value,
  size = 150,
  stroke = 12,
  label,
  sublabel,
}: {
  value: number
  size?: number
  stroke?: number
  label?: string
  sublabel?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  const id = React.useId()
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" />
            <stop offset="100%" stopColor="var(--chart-3)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.22,.61,.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-primary glow-text num">{Math.round(pct)}%</span>
        {label ? <span className="mt-0.5 text-xs text-muted-foreground">{label}</span> : null}
        {sublabel ? <span className="text-[10px] text-muted-foreground/70">{sublabel}</span> : null}
      </div>
    </div>
  )
}

/* -------------------------------- MeterBar ------------------------------- */

export function MeterBar({
  label,
  value,
  detail,
  tone = "green",
  compact = false,
}: {
  label: string
  value: number
  detail?: string
  tone?: "green" | "blue" | "purple" | "amber" | "red"
  compact?: boolean
}) {
  const pct = Math.max(0, Math.min(100, value))
  const toneVar =
    tone === "green"
      ? "var(--chart-1)"
      : tone === "blue"
        ? "var(--chart-3)"
        : tone === "purple"
          ? "var(--chart-2)"
          : tone === "amber"
            ? "var(--chart-4)"
            : "var(--chart-5)"
  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-xs font-medium text-foreground/85">{label}</span>
        <span className="shrink-0 text-[11px] text-muted-foreground num">
          {Math.round(pct)}%{detail ? <span className="mx-1.5 opacity-60">|</span> : null}
          {detail}
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, color-mix(in oklab, ${toneVar} 55%, transparent), ${toneVar})`,
            transition: "width 800ms cubic-bezier(.22,.61,.36,1)",
          }}
        />
      </div>
    </div>
  )
}

/* -------------------------------- Sparkline ------------------------------ */

export function Sparkline({
  points,
  width = 120,
  height = 34,
  tone = "var(--chart-1)",
}: {
  points: number[]
  width?: number
  height?: number
  tone?: string
}) {
  if (!points.length) return null
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const step = width / Math.max(1, points.length - 1)
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(height - 3 - ((p - min) / span) * (height - 6)).toFixed(1)}`)
    .join(" ")
  return (
    <svg width={width} height={height} aria-hidden className="overflow-visible">
      <path d={d} fill="none" stroke={tone} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ------------------------------- LossCurve ------------------------------- */

export interface CurvePoint {
  step: number
  trainLoss: number
  validLoss?: number | null
}

export function LossCurve({
  points,
  maxStep,
  height = 260,
  trainLabel,
  validLabel,
}: {
  points: CurvePoint[]
  maxStep: number
  height?: number
  trainLabel: string
  validLabel: string
}) {
  const { t } = useI18n()
  const { ref, width } = useMeasure<HTMLDivElement>()
  const [hover, setHover] = React.useState<number | null>(null)

  const w = Math.max(width, 320)
  const padL = 38
  const padR = 14
  const padT = 14
  const padB = 34
  const innerW = w - padL - padR
  const innerH = height - padT - padB

  const valids = points.map((p) => p.validLoss).filter((v): v is number => v !== null && v !== undefined)
  const allVals = [...points.map((p) => p.trainLoss), ...valids]
  const yMin = Math.max(0, Math.floor(Math.min(...allVals, 0.4) * 2) / 2)
  const yMax = Math.ceil(Math.max(...allVals, 3) * 2) / 2
  const last = points[points.length - 1]

  const x = (step: number) => padL + (step / maxStep) * innerW
  const y = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin)) * innerH

  const linePath = (key: "trainLoss" | "validLoss") => {
    const segs: string[] = []
    let penDown = false
    for (const p of points) {
      const v = p[key]
      if (v === null || v === undefined) {
        penDown = false
        continue
      }
      segs.push(`${penDown ? "L" : "M"}${x(p.step).toFixed(1)},${y(v).toFixed(1)}`)
      penDown = true
    }
    return segs.join(" ")
  }

  const areaPath = () => {
    if (!points.length) return ""
    const top = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.step).toFixed(1)},${y(p.trainLoss).toFixed(1)}`).join(" ")
    return `${top} L${x(points[points.length - 1].step).toFixed(1)},${padT + innerH} L${padL},${padT + innerH} Z`
  }

  const yTicks = 6
  const gridY = Array.from({ length: yTicks + 1 }, (_, i) => yMin + ((yMax - yMin) / yTicks) * i)
  const xTickCount = 8
  const gridX = Array.from({ length: xTickCount + 1 }, (_, i) => (i / xTickCount) * maxStep)

  const onMove = (e: React.MouseEvent<SVGElement>) => {
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect()
    const px = e.clientX - rect.left
    const step = ((px - padL) / innerW) * maxStep
    // nearest point
    let best = 0
    let bestD = Infinity
    points.forEach((p, i) => {
      const d = Math.abs(x(p.step) - px)
      if (d < bestD) {
        bestD = d
        best = i
      }
    })
    if (step >= 0 && step <= maxStep && bestD < 60) setHover(best)
    else setHover(null)
  }

  const fmtK = (n: number) => `${Math.round(n / 1000)}K`
  const hp = hover !== null ? points[hover] : null

  return (
    <div ref={ref} className="w-full select-none" dir="ltr">
      {width > 0 && (
        <svg
          width={w}
          height={height}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          role="img"
          aria-label={t("dash.loss.title")}
        >
          <defs>
            <linearGradient id="lossArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* grid */}
          {gridY.map((v, i) => (
            <g key={`gy${i}`}>
              <line x1={padL} x2={w - padR} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeOpacity={0.55} strokeDasharray="3 5" />
              <text x={padL - 7} y={y(v) + 3.5} textAnchor="end" fontSize={10} fill="var(--muted-foreground)" className="num">
                {v.toFixed(1)}
              </text>
            </g>
          ))}
          {gridX.map((s, i) => (
            <g key={`gx${i}`}>
              <line x1={x(s)} x2={x(s)} y1={padT} y2={padT + innerH} stroke="var(--line)" strokeOpacity={0.28} strokeDasharray="3 5" />
              <text x={x(s)} y={height - padB + 16} textAnchor="middle" fontSize={10} fill="var(--muted-foreground)" className="num">
                {fmtK(s)}
              </text>
            </g>
          ))}

          {/* axis labels */}
          <text x={padL + innerW / 2} y={height - 4} textAnchor="middle" fontSize={10.5} fill="var(--muted-foreground)">
            {t("dash.loss.xAxis")}
          </text>

          {/* area + lines */}
          <path d={areaPath()} fill="url(#lossArea)" />
          <path d={linePath("trainLoss")} fill="none" stroke="var(--chart-1)" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
          <path d={linePath("validLoss")} fill="none" stroke="var(--chart-2)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray="1 0" opacity={0.92} />

          {/* end marker */}
          {last && (
            <g>
              <circle cx={x(last.step)} cy={y(last.trainLoss)} r={4} fill="var(--chart-1)" stroke="var(--card)" strokeWidth={1.6} />
              {last.validLoss != null && (
                <circle cx={x(last.step)} cy={y(last.validLoss)} r={4} fill="var(--chart-2)" stroke="var(--card)" strokeWidth={1.6} />
              )}
            </g>
          )}

          {/* hover crosshair */}
          {hp && (
            <g>
              <line x1={x(hp.step)} x2={x(hp.step)} y1={padT} y2={padT + innerH} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
              <circle cx={x(hp.step)} cy={y(hp.trainLoss)} r={3.6} fill="var(--chart-1)" />
              {hp.validLoss != null && <circle cx={x(hp.step)} cy={y(hp.validLoss)} r={3.6} fill="var(--chart-2)" />}
            </g>
          )}
        </svg>
      )}

      {/* legend + values */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--chart-1)" }} />
            {trainLabel}
          </span>
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--chart-2)" }} />
            {validLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-line bg-panel-2 px-2.5 py-1 text-[11px] font-semibold num" style={{ color: "var(--chart-1)" }}>
            {t("dash.loss.trainChip")}: {last ? last.trainLoss.toFixed(3) : "—"}
          </span>
          <span className="rounded-md border border-line bg-panel-2 px-2.5 py-1 text-[11px] font-semibold num" style={{ color: "var(--chart-2)" }}>
            {t("dash.loss.validChip")}: {last && last.validLoss != null ? last.validLoss.toFixed(3) : "—"}
          </span>
        </div>
      </div>

      {/* tooltip */}
      {hp && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-line bg-panel-2 px-3 py-1.5 text-[11px] num">
          <span className="text-muted-foreground">step {hp.step.toLocaleString("en-US")}</span>
          <span style={{ color: "var(--chart-1)" }}>train {hp.trainLoss.toFixed(3)}</span>
          {hp.validLoss != null && <span style={{ color: "var(--chart-2)" }}>valid {hp.validLoss.toFixed(3)}</span>}
        </div>
      )}
    </div>
  )
}
