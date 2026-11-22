"use client"

import * as React from "react"
import {
  CheckCircle2,
  FileBarChart2,
  FileText,
  FolderOpen,
  Github,
  Globe,
  Milestone,
  RefreshCcw,
  ScrollText,
  ShieldCheck,
} from "lucide-react"
import { useI18n } from "@/components/syria/language-provider"
import { SectionCard, StatusBadge, ViewHeader } from "@/components/syria/ui-bits"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const GITHUB_URL = "https://github.com/syria-ai"
const SITE_URL = "https://www.syriaai.org"

/* PHASE 0..12 — honest statuses: 0-4 completed, 5 processing, 6 running, 7-12 planned */
const PHASES: { n: number; status: string }[] = [
  { n: 0, status: "completed" },
  { n: 1, status: "completed" },
  { n: 2, status: "completed" },
  { n: 3, status: "completed" },
  { n: 4, status: "completed" },
  { n: 5, status: "processing" },
  { n: 6, status: "running" },
  { n: 7, status: "planned" },
  { n: 8, status: "planned" },
  { n: 9, status: "planned" },
  { n: 10, status: "planned" },
  { n: 11, status: "planned" },
  { n: 12, status: "planned" },
]

const ADRS: { id: string; key: string; status: string }[] = [
  { id: "ADR-001", key: "001", status: "completed" },
  { id: "ADR-002", key: "002", status: "completed" },
  { id: "ADR-003", key: "003", status: "running" },
  { id: "ADR-004", key: "004", status: "completed" },
  { id: "ADR-005", key: "005", status: "planned" },
]

const REPORTS = ["exp024", "exp023", "sdsa", "nanocard", "dscards"] as const

/* number chip tone per phase status */
function phaseChipClass(status: string): string {
  if (status === "completed")
    return "border-primary bg-primary text-primary-foreground shadow-[0_0_14px_-4px_var(--glow)]"
  if (status === "running") return "border-primary/60 bg-primary/12 text-primary"
  if (status === "processing") return "border-line bg-panel-2 text-warn"
  return "border-line bg-panel-2 text-muted-foreground"
}

/* --------------------------------- roadmap -------------------------------- */

function RoadmapCard() {
  const { t } = useI18n()
  return (
    <SectionCard
      title={t("research.sec.roadmap")}
      subtitle={t("research.roadmap.subtitle")}
      icon={<Milestone className="h-4 w-4" />}
    >
      <ol className="relative max-h-96 overflow-y-auto scrollbar-sy pe-1" aria-label={t("research.sec.roadmap")}>
        {PHASES.map((p, i) => (
          <li key={p.n} className="relative flex gap-3 pb-4 last:pb-1">
            {i < PHASES.length - 1 && (
              <span className="absolute bottom-0 start-[15px] top-10 w-px bg-line" aria-hidden />
            )}
            <span
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-extrabold num",
                phaseChipClass(p.status)
              )}
              aria-label={`${t("research.sec.roadmap")} ${p.n}`}
            >
              {p.n}
            </span>
            <div className="min-w-0 flex-1 rounded-xl border border-line bg-panel-2 px-3.5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[13px] font-extrabold tracking-tight">
                  {t(`research.phase.${p.n}.t`)}
                </h3>
                <StatusBadge status={p.status} size="sm" />
              </div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                {t(`research.phase.${p.n}.d`)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </SectionCard>
  )
}

/* ----------------------------------- ADRs --------------------------------- */

function AdrCard() {
  const { t } = useI18n()
  return (
    <SectionCard title={t("research.sec.adr")} subtitle={t("research.adr.subtitle")} icon={<ScrollText className="h-4 w-4" />}>
      <ul className="space-y-3">
        {ADRS.map((a) => (
          <li key={a.id} className="flex gap-3 rounded-xl border border-line bg-panel-2 p-3.5">
            <span className="h-fit shrink-0 rounded-md border border-line bg-muted px-2 py-1 font-mono text-[10.5px] font-bold text-primary">
              {a.id}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[12.5px] font-extrabold leading-tight">
                  {t(`research.adr.${a.key}.t`)}
                </h3>
                <StatusBadge status={a.status} size="sm" dot={false} />
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {t(`research.adr.${a.key}.d`)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}

/* ---------------------------------- reports ------------------------------- */

function ReportsCard() {
  const { t } = useI18n()
  return (
    <SectionCard
      title={t("research.sec.reports")}
      subtitle={t("research.reports.subtitle")}
      icon={<FolderOpen className="h-4 w-4" />}
    >
      <ul className="divide-y divide-line/60">
        {REPORTS.map((key) => (
          <li key={key} className="flex items-center justify-between gap-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <FileText className="h-4 w-4" />
              </span>
              <span className="truncate text-[12.5px] font-semibold">{t(`research.rep.${key}`)}</span>
            </div>
            <span className="inline-flex shrink-0 items-center rounded-full border border-dashed border-line px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
              {t("research.rep.inPrep")}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex flex-wrap gap-2 border-t border-line pt-3.5">
        <a href={GITHUB_URL} target="_blank" rel="noreferrer">
          <Button variant="outline" className="min-h-10 gap-2 px-4 text-xs">
            <Github className="h-4 w-4" />
            {t("research.link.github")}
          </Button>
        </a>
        <a href={SITE_URL} target="_blank" rel="noreferrer">
          <Button variant="outline" className="min-h-10 gap-2 px-4 text-xs">
            <Globe className="h-4 w-4" />
            {t("research.link.site")}
          </Button>
        </a>
      </div>
    </SectionCard>
  )
}

/* ------------------------------- reproducibility --------------------------- */

function ReproCard() {
  const { t } = useI18n()
  return (
    <SectionCard title={t("research.sec.repro")} icon={<RefreshCcw className="h-4 w-4" />}>
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <li
            key={i}
            className="flex items-start gap-2 rounded-lg border border-line bg-panel-2 px-3 py-2.5 text-[12px] leading-relaxed"
          >
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-valid" />
            <span>{t(`research.repro.${i}`)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-start gap-2 border-t border-line pt-3 text-[11px] leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        {t("research.repro.note")}
      </p>
    </SectionCard>
  )
}

/* --------------------------------- the view ------------------------------- */

export default function ResearchView() {
  const { t } = useI18n()
  return (
    <div className="space-y-4 md:space-y-5">
      <ViewHeader
        title={t("research.title")}
        subtitle={t("research.subtitle")}
        icon={<FileBarChart2 className="h-5 w-5" />}
      />

      <RoadmapCard />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AdrCard />
        <ReportsCard />
      </div>

      <ReproCard />
    </div>
  )
}
