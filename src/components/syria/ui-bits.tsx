"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { useI18n } from "@/components/syria/language-provider"
import type { DataSource } from "@/lib/types"
import { cn } from "@/lib/utils"

/* ------------------------------ Syria flag -------------------------------- */

const STAR_PATH =
  "M0,-8 L2.35,-2.47 L8,-2.47 L3.81,1.24 L4.95,6.47 L0,3.6 L-4.95,6.47 L-3.81,1.24 L-8,-2.47 L-2.35,-2.47 Z"

export function SyriaFlag({ className, waving = false }: { className?: string; waving?: boolean }) {
  return (
    <svg
      viewBox="0 0 300 200"
      className={cn("rounded-[4px] shadow-md", className)}
      aria-label="Syria flag"
      role="img"
      style={waving ? { transform: "perspective(300px) rotateY(-12deg)" } : undefined}
    >
      <rect width="300" height="66.7" y="0" fill="#0E9F52" />
      <rect width="300" height="66.6" y="66.7" fill="#F7F7F7" />
      <rect width="300" height="66.7" y="133.3" fill="#141414" />
      {[75, 150, 225].map((cx) => (
        <path key={cx} d={STAR_PATH} transform={`translate(${cx}, 100)`} fill="#CE1126" />
      ))}
    </svg>
  )
}

/* --------------------------------- logo ----------------------------------- */

export function LogoMark({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <img src="/syria-logo.svg" alt="SYRIA AI" width={size} height={size} className={className} />
  )
}

/* ------------------------------ status badge ------------------------------ */

const STATUS_TONE: Record<string, { fg: string; filled?: boolean; check?: boolean }> = {
  running: { fg: "var(--chart-1)", filled: true },
  training: { fg: "var(--chart-1)", filled: true },
  experimental: { fg: "var(--chart-1)", filled: true, check: true },
  completed: { fg: "var(--chart-3)", filled: true },
  ready: { fg: "var(--chart-3)" },
  measured: { fg: "var(--chart-3)" },
  planning: { fg: "var(--muted-foreground)" },
  processing: { fg: "var(--chart-4)" },
  review: { fg: "var(--chart-4)" },
  queued: { fg: "var(--chart-4)" },
  paused: { fg: "var(--chart-4)" },
  planned: { fg: "var(--muted-foreground)" },
  stopped: { fg: "var(--muted-foreground)" },
  debug: { fg: "var(--chart-2)" },
  derived: { fg: "var(--muted-foreground)" },
  failed: { fg: "var(--chart-5)", filled: true },
  revoked: { fg: "var(--chart-5)" },
  active: { fg: "var(--chart-1)" },
}

export function StatusBadge({
  status,
  size = "md",
  dot = true,
}: {
  status: string
  size?: "sm" | "md"
  dot?: boolean
}) {
  const { t } = useI18n()
  const tone = STATUS_TONE[status] ?? { fg: "var(--muted-foreground)" }
  const { fg, filled, check } = tone
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold",
        size === "sm" ? "px-2.5 py-0.5 text-[10px]" : "px-3 py-1 text-[11px]"
      )}
      style={
        filled
          ? { color: "var(--primary-foreground)", background: fg, borderColor: fg }
          : { color: fg, borderColor: `color-mix(in oklab, ${fg} 40%, transparent)`, background: `color-mix(in oklab, ${fg} 12%, transparent)` }
      }
    >
      {check ? (
        <Check className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} strokeWidth={3} />
      ) : dot ? (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", (status === "running" || status === "training") && "pulse-dot")}
          style={{ background: filled ? "currentColor" : fg }}
        />
      ) : null}
      {t(`status.${status}`)}
    </span>
  )
}

/* ------------------------------ section card ------------------------------ */

export function SectionCard({
  title,
  icon,
  action,
  children,
  className,
  bodyClassName,
  subtitle,
}: {
  title: React.ReactNode
  icon?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  subtitle?: React.ReactNode
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-line bg-panel panel-glow overflow-hidden",
        className
      )}
      aria-label={typeof title === "string" ? title : undefined}
    >
      <header className="flex items-center justify-between gap-3 border-b border-line/70 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon ? (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/12 text-primary">
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold tracking-tight">{title}</h2>
            {subtitle ? <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  )
}

/* ------------------------------- view header ------------------------------ */

export function ViewHeader({
  title,
  subtitle,
  actions,
  icon,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div className="fade-up flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-center gap-3">
        {icon ? (
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-panel text-primary panel-glow">
            {icon}
          </span>
        ) : null}
        <div>
          <h1 className="text-xl font-extrabold tracking-tight md:text-2xl">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

/* ------------------------------- empty state ------------------------------ */

export function EmptyState({ icon, title, hint }: { icon?: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line px-6 py-10 text-center">
      {icon ? <span className="text-muted-foreground/70">{icon}</span> : null}
      <p className="text-sm font-semibold text-muted-foreground">{title}</p>
      {hint ? <p className="max-w-sm text-xs text-muted-foreground/70">{hint}</p> : null}
    </div>
  )
}

/* ------------------------------ source badge ------------------------------- */

const SOURCE_TONE: Record<string, { fg: string }> = {
  REAL: { fg: "var(--chart-1)" }, // emerald/green
  DEMO: { fg: "var(--chart-4)" }, // amber
  UNAVAILABLE: { fg: "var(--muted-foreground)" }, // zinc/gray
}

export function SourceBadge({ source, size = "sm" }: { source: DataSource; size?: "sm" | "md" }) {
  const { t } = useI18n()
  const tone = SOURCE_TONE[source] ?? SOURCE_TONE.UNAVAILABLE
  const fg = tone.fg
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      )}
      style={{
        color: fg,
        borderColor: `color-mix(in oklab, ${fg} 40%, transparent)`,
        background: `color-mix(in oklab, ${fg} 10%, transparent)`,
      }}
      title={t(`src.${source}`)}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: fg }} />
      {t(`src.${source}`)}
    </span>
  )
}

/* ------------------------------ demo chip --------------------------------- */

export function DemoChip({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold"
      style={{
        color: "var(--chart-4)",
        borderColor: "color-mix(in oklab, var(--chart-4) 40%, transparent)",
        background: "color-mix(in oklab, var(--chart-4) 10%, transparent)",
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--chart-4)" }} />
      {label}
    </span>
  )
}
