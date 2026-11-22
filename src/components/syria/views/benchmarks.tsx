"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Activity, CheckCircle2, FlaskConical, Gauge, ShieldCheck, TriangleAlert } from "lucide-react"
import { useI18n } from "@/components/syria/language-provider"
import { apiGet } from "@/lib/api"
import type { Benchmark } from "@/lib/types"
import { EmptyState, SectionCard, StatusBadge, ViewHeader } from "@/components/syria/ui-bits"
import { ProgressRing } from "@/components/syria/charts"
import { fmtNum } from "@/lib/format"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

/* metrics where a smaller value is better (ppl / loss) */
const LOWER_BETTER = new Set(["ppl", "loss"])

/* category label with graceful fallback to the raw value */
function catLabel(t: (k: string) => string, category: string): string {
  const key = `benchmarks.cat.${category}`
  const out = t(key)
  return out !== key ? out : category
}

/* ------------------------------ filter chips ------------------------------ */

function CategoryChips({
  categories,
  selected,
  onSelect,
  counts,
}: {
  categories: string[]
  selected: string
  onSelect: (c: string) => void
  counts: Record<string, number>
}) {
  const { t } = useI18n()
  const chips = [{ key: "all", label: t("c.all") }, ...categories.map((c) => ({ key: c, label: catLabel(t, c) }))]
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("benchmarks.filterLabel")}>
      {chips.map((chip) => {
        const active = selected === chip.key
        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => onSelect(chip.key)}
            aria-pressed={active}
            className={cn(
              "inline-flex min-h-[40px] items-center rounded-full border px-3.5 py-2 text-[12px] font-bold transition-all duration-200",
              active
                ? "border-primary bg-primary text-primary-foreground shadow-[0_0_16px_-6px_var(--glow)]"
                : "border-line bg-panel text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            {chip.label}
            <span className="ms-1.5 rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] font-extrabold num dark:bg-white/10">
              {counts[chip.key] ?? 0}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* --------------------------------- the view ------------------------------- */

export default function BenchmarksView() {
  const { t, isAr } = useI18n()
  const q = useQuery({
    queryKey: ["benchmarks"],
    queryFn: () => apiGet<Benchmark[]>("/api/benchmarks"),
    refetchInterval: 60_000,
  })
  const [cat, setCat] = React.useState<string>("all")

  const rows = React.useMemo(() => q.data ?? [], [q.data])

  const categories = React.useMemo(() => {
    const seen: string[] = []
    for (const b of rows) if (!seen.includes(b.category)) seen.push(b.category)
    return seen
  }, [rows])

  const counts = React.useMemo(() => {
    const out: Record<string, number> = { all: rows.length }
    for (const b of rows) out[b.category] = (out[b.category] ?? 0) + 1
    return out
  }, [rows])

  const filtered = cat === "all" ? rows : rows.filter((b) => b.category === cat)

  const measured = rows.filter((b) => b.status === "measured").length
  const ready = rows.filter((b) => b.status === "ready").length
  const planned = rows.filter((b) => b.status === "planned").length
  const total = rows.length
  const ringValue = total > 0 ? (measured / total) * 100 : 0

  return (
    <div className="space-y-4 md:space-y-5">
      <ViewHeader
        title={t("benchmarks.title")}
        subtitle={t("benchmarks.subtitle")}
        icon={<Gauge className="h-5 w-5" />}
      />

      {/* honesty alert */}
      <Alert className="border-line bg-panel-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <AlertTitle className="font-bold">{t("benchmarks.alert.title")}</AlertTitle>
        <AlertDescription className="text-[12px] leading-relaxed">
          {t("benchmarks.alert.body")}
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        {/* suite table */}
        <SectionCard
          title={t("benchmarks.table.title")}
          subtitle={t("benchmarks.table.subtitle")}
          icon={<FlaskConical className="h-4 w-4" />}
          bodyClassName="p-4 space-y-4"
        >
          <CategoryChips categories={categories} selected={cat} onSelect={setCat} counts={counts} />

          {q.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-11 rounded-md" />
              ))}
            </div>
          ) : q.isError ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <EmptyState
                icon={<TriangleAlert className="h-8 w-8" />}
                title={t("c.errorLoad")}
                hint={t("c.error")}
              />
              <Button variant="outline" className="min-h-10 px-5 text-xs" onClick={() => q.refetch()}>
                {t("c.retry")}
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<Gauge className="h-8 w-8" />} title={t("benchmarks.empty")} />
          ) : (
            <div className="overflow-x-auto scrollbar-sy">
              <Table className="min-w-[680px] text-[12.5px]">
                <TableHeader>
                  <TableRow className="border-line/70 hover:bg-transparent">
                    <TableHead className="h-10 px-3 py-2.5 text-start font-semibold text-muted-foreground">
                      {t("benchmarks.col.benchId")}
                    </TableHead>
                    <TableHead className="h-10 px-3 py-2.5 text-start font-semibold text-muted-foreground">
                      {t("benchmarks.col.test")}
                    </TableHead>
                    <TableHead className="h-10 px-3 py-2.5 text-start font-semibold text-muted-foreground">
                      {t("benchmarks.col.category")}
                    </TableHead>
                    <TableHead className="h-10 px-3 py-2.5 text-start font-semibold text-muted-foreground">
                      {t("benchmarks.col.unit")}
                    </TableHead>
                    <TableHead className="h-10 px-3 py-2.5 text-start font-semibold text-muted-foreground">
                      {t("benchmarks.col.nano")}
                    </TableHead>
                    <TableHead className="h-10 px-3 py-2.5 text-start font-semibold text-muted-foreground">
                      {t("benchmarks.col.mini")}
                    </TableHead>
                    <TableHead className="h-10 px-3 py-2.5 text-start font-semibold text-muted-foreground">
                      {t("c.status")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((b) => (
                    <TableRow key={b.id} className="border-line/50 transition-colors hover:bg-accent/40">
                      <TableCell className="px-3 py-2.5 font-extrabold text-primary">
                        <span className="num" dir="ltr">
                          {b.benchId}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate px-3 py-2.5 font-semibold">
                        {isAr ? b.nameAr : b.name}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-muted-foreground">
                        {catLabel(t, b.category)}
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-muted-foreground">
                          {b.unit ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        {b.nanoScore !== null ? (
                          <div className="flex flex-col leading-tight">
                            <span className="font-extrabold text-primary num" dir="ltr">
                              {b.nanoScore}
                            </span>
                            {LOWER_BETTER.has(b.unit ?? "") && (
                              <span className="mt-0.5 text-[9.5px] text-muted-foreground">
                                {t("benchmarks.lowerBetter")}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="num text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        {b.miniScore !== null ? (
                          <span className="font-extrabold text-primary num" dir="ltr">
                            {b.miniScore}
                          </span>
                        ) : (
                          <span className="num text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <StatusBadge status={b.status} size="sm" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>

        {/* side column */}
        <div className="space-y-4">
          <SectionCard title={t("benchmarks.sec.methodology")} icon={<CheckCircle2 className="h-4 w-4" />}>
            <ul className="space-y-2.5">
              {[1, 2, 3, 4].map((i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[12px] leading-relaxed text-muted-foreground"
                >
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-valid" />
                  <span>{t(`benchmarks.meth.${i}`)}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title={t("benchmarks.sec.status")} icon={<Activity className="h-4 w-4" />}>
            {q.isLoading ? (
              <div className="flex justify-center py-2">
                <Skeleton className="h-[150px] w-[150px] rounded-full" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-1">
                <ProgressRing
                  value={ringValue}
                  size={144}
                  stroke={12}
                  label={t("benchmarks.ring.label")}
                  sublabel={t("benchmarks.ring.count", { a: measured, b: total })}
                />
                <div className="grid w-full grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border border-line bg-panel-2 px-2 py-2">
                    <div className="text-base font-extrabold num" dir="ltr">
                      {fmtNum(measured)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{t("status.measured")}</div>
                  </div>
                  <div className="rounded-lg border border-line bg-panel-2 px-2 py-2">
                    <div className="text-base font-extrabold num" dir="ltr">
                      {fmtNum(ready)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{t("status.ready")}</div>
                  </div>
                  <div className="rounded-lg border border-line bg-panel-2 px-2 py-2">
                    <div className="text-base font-extrabold num" dir="ltr">
                      {fmtNum(planned)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{t("status.planned")}</div>
                  </div>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
