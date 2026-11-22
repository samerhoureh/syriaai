"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Activity,
  Boxes,
  Check,
  Database,
  FlaskConical,
  Globe,
  Info,
  RefreshCcw,
  Rocket,
  ServerCog,
  ShieldAlert,
  X,
} from "lucide-react"
import { useI18n } from "@/components/syria/language-provider"
import { apiGet, apiPost } from "@/lib/api"
import type { ActivityLog, SystemInfo, SystemMetric } from "@/lib/types"
import { MeterBar } from "@/components/syria/charts"
import { EmptyState, SectionCard, ViewHeader } from "@/components/syria/ui-bits"
import { fmtDateTime, fmtRelative } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

/* --------------------------------- tones ---------------------------------- */

const LEVEL_COLOR: Record<ActivityLog["level"], string> = {
  success: "var(--chart-1)",
  warn: "var(--chart-4)",
  error: "var(--chart-5)",
  info: "var(--chart-3)",
}

const KIND_COLOR: Record<ActivityLog["kind"], string> = {
  training: "var(--chart-1)",
  data: "var(--chart-2)",
  api: "var(--chart-3)",
  system: "var(--muted-foreground)",
  security: "var(--chart-5)",
  inference: "var(--chart-4)",
}

const METRIC_ORDER = ["gpu0", "gpu1", "gpu2", "ram", "cpu", "storage"]

function metricTone(kind: SystemMetric["kind"]): "green" | "blue" | "purple" {
  if (kind === "gpu") return "green"
  if (kind === "storage") return "purple"
  return "blue" // memory | compute
}

/* --------------------------------- errors --------------------------------- */

function ErrorRetry({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line px-6 py-10 text-center">
      <ShieldAlert className="h-6 w-6 text-muted-foreground/70" aria-hidden />
      <p className="text-sm font-semibold text-muted-foreground">{t("c.errorLoad")}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        {t("c.retry")}
      </Button>
    </div>
  )
}

/* -------------------------------- engines --------------------------------- */

const ENGINES = [
  { key: "models" as const, icon: Boxes, nameKey: "adm.engine.models", descKey: "adm.engine.models.desc" },
  { key: "training" as const, icon: FlaskConical, nameKey: "adm.engine.training", descKey: "adm.engine.training.desc" },
  { key: "inference" as const, icon: Rocket, nameKey: "adm.engine.inference", descKey: "adm.engine.inference.desc" },
  { key: "dataEngine" as const, icon: Database, nameKey: "adm.engine.dataEngine", descKey: "adm.engine.dataEngine.desc" },
  { key: "platform" as const, icon: Globe, nameKey: "adm.engine.platform", descKey: "adm.engine.platform.desc" },
]

function EnginesCard() {
  const { t } = useI18n()
  const q = useQuery({
    queryKey: ["system"],
    queryFn: () => apiGet<SystemInfo>("/api/system"),
    refetchInterval: 15_000,
  })
  const engines = q.data?.engines

  return (
    <SectionCard
      title={t("adm.engines.title")}
      subtitle={t("adm.engines.subtitle")}
      icon={<Boxes className="h-4 w-4" />}
      action={
        q.data ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel-2 px-2.5 py-1 text-[10px] font-bold text-valid">
            <span className="h-1.5 w-1.5 rounded-full bg-valid pulse-dot" aria-hidden />
            {t("adm.engines.running")}
          </span>
        ) : null
      }
    >
      {q.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[128px] rounded-xl" />
          ))}
        </div>
      ) : q.isError ? (
        <ErrorRetry onRetry={() => q.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ENGINES.map((eng, i) => {
            const Icon = eng.icon
            const version = engines?.[eng.key] ?? "—"
            const isLast = i === ENGINES.length - 1
            return (
              <div
                key={eng.key}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border border-line bg-panel-2 p-4 transition-colors hover:border-primary/35",
                  isLast && "sm:col-span-2 lg:col-span-1"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                    <Icon className="h-4.5 w-4.5" aria-hidden />
                  </span>
                  <h3 className="min-w-0 truncate text-[13px] font-bold leading-tight">{t(eng.nameKey)}</h3>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="font-mono text-[11px] font-semibold text-muted-foreground num"
                    dir="ltr"
                    aria-label={`${t("adm.engine.version")} ${version}`}
                  >
                    {version}
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold text-valid"
                    aria-label={t("adm.engines.runningAria")}
                  >
                    <span className="h-1.5 w-1.5 rounded-full pulse-dot" style={{ background: "var(--chart-1)" }} aria-hidden />
                    {t("adm.engines.running")}
                  </span>
                </div>
                <p className="text-[10.5px] leading-relaxed text-muted-foreground">{t(eng.descKey)}</p>
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}

/* ------------------------------ infrastructure ---------------------------- */

function InfraCard() {
  const { t, lang } = useI18n()
  const q = useQuery({
    queryKey: ["system"],
    queryFn: () => apiGet<SystemInfo>("/api/system"),
    refetchInterval: 15_000,
  })
  const sorted = React.useMemo(() => {
    const metrics = q.data?.metrics ?? []
    return [...metrics].sort((a, b) => METRIC_ORDER.indexOf(a.metricId) - METRIC_ORDER.indexOf(b.metricId))
  }, [q.data])

  return (
    <SectionCard title={t("adm.infra.title")} subtitle={t("adm.infra.subtitle")} icon={<RefreshCcw className="h-4 w-4" />}>
      {q.isLoading ? (
        <div className="space-y-3.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 rounded-md" />
          ))}
        </div>
      ) : q.isError ? (
        <ErrorRetry onRetry={() => q.refetch()} />
      ) : (
        <>
          <div className="space-y-3.5">
            {sorted.map((m) => (
              <MeterBar key={m.id} label={m.label} value={m.value} detail={m.detail} tone={metricTone(m.kind)} />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-3">
            <span className="inline-flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
              <RefreshCcw className="h-3 w-3" aria-hidden />
              {t("adm.infra.autoRefresh")}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
              {t("adm.infra.lastSync")}:
              <span className="font-semibold text-foreground/85">{fmtDateTime(q.data?.serverTime, lang)}</span>
            </span>
          </div>
        </>
      )}
    </SectionCard>
  )
}

/* --------------------------------- roles ---------------------------------- */

type RoleRow = { key: string; perms: [boolean, boolean, boolean, boolean, boolean] }

const ROLE_MATRIX: RoleRow[] = [
  { key: "superAdmin", perms: [true, true, true, true, true] },
  { key: "researchAdmin", perms: [true, true, true, true, false] },
  { key: "trainingOp", perms: [true, true, false, false, false] },
  { key: "dataReviewer", perms: [false, true, false, false, false] },
  { key: "developer", perms: [false, false, true, true, false] },
  { key: "publicUser", perms: [false, false, true, false, false] },
]

const PERM_COLUMNS = ["training", "data", "inference", "keys", "settings"] as const

function RolesCard() {
  const { t } = useI18n()
  return (
    <SectionCard title={t("adm.roles.title")} subtitle={t("adm.roles.subtitle")} icon={<ShieldAlert className="h-4 w-4" />}>
      <div className="overflow-x-auto scrollbar-sy">
        <Table className="min-w-[560px] text-[12px]">
          <TableHeader>
            <TableRow className="border-line/70 hover:bg-transparent">
              <TableHead className="text-start font-semibold">{t("adm.roles.col.role")}</TableHead>
              {PERM_COLUMNS.map((col) => (
                <TableHead key={col} className="text-center font-semibold">
                  {t(`adm.roles.col.${col}`)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROLE_MATRIX.map((role) => (
              <TableRow key={role.key} className="border-line/60">
                <TableCell className="font-bold">{t(`adm.roles.${role.key}`)}</TableCell>
                {role.perms.map((granted, i) => (
                  <TableCell key={`${role.key}-${i}`} className="text-center">
                    <span
                      role="img"
                      aria-label={granted ? t("adm.roles.granted") : t("adm.roles.denied")}
                      className="inline-flex"
                    >
                      {granted ? (
                        <Check className="h-4 w-4 text-valid" strokeWidth={2.5} aria-hidden />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/50" strokeWidth={2.5} aria-hidden />
                      )}
                    </span>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-[10.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-valid" strokeWidth={2.5} aria-hidden />
          {t("adm.roles.granted")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <X className="h-3.5 w-3.5 text-muted-foreground/50" strokeWidth={2.5} aria-hidden />
          {t("adm.roles.denied")}
        </span>
      </div>
    </SectionCard>
  )
}

/* ------------------------------- activity log ------------------------------ */

function ActivityCard() {
  const { t, isAr } = useI18n()
  const q = useQuery({
    queryKey: ["activity"],
    queryFn: () => apiGet<ActivityLog[]>("/api/activity"),
    refetchInterval: 15_000,
  })
  const rows = q.data ?? []

  return (
    <SectionCard title={t("adm.activity.title")} subtitle={t("adm.activity.subtitle")} icon={<Activity className="h-4 w-4" />}>
      {q.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[58px] rounded-lg" />
          ))}
        </div>
      ) : q.isError ? (
        <ErrorRetry onRetry={() => q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Activity className="h-6 w-6" />} title={t("adm.activity.empty")} />
      ) : (
        <div className="max-h-80 space-y-1.5 overflow-y-auto scrollbar-sy" aria-label={t("adm.activity.title")} role="log">
          {rows.map((row) => {
            const kindColor = KIND_COLOR[row.kind] ?? "var(--muted-foreground)"
            return (
              <div
                key={row.id}
                className="flex items-start gap-3 rounded-lg border border-line/70 bg-panel-2 px-3 py-2.5 transition-colors hover:border-primary/30"
              >
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: LEVEL_COLOR[row.level] }}
                  role="img"
                  aria-label={t(`adm.level.${row.level}`)}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] leading-relaxed">{isAr ? row.messageAr : row.messageEn}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full border px-2 py-0.5 text-[10px] font-bold"
                      style={{
                        color: kindColor,
                        borderColor: `color-mix(in oklab, ${kindColor} 40%, transparent)`,
                        background: `color-mix(in oklab, ${kindColor} 10%, transparent)`,
                      }}
                    >
                      {t(`adm.kind.${row.kind}`)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{fmtRelative(row.createdAt, isAr ? "ar" : "en")}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}

/* ------------------------------- transparency ------------------------------ */

function TransparencyAlert() {
  const { t } = useI18n()
  return (
    <Alert className="border-info/30 bg-info/5">
      <Info className="h-4 w-4 text-info" aria-hidden />
      <AlertTitle className="text-xs font-bold text-info">{t("adm.transparency.title")}</AlertTitle>
      <AlertDescription className="text-[11.5px] leading-relaxed text-muted-foreground">
        {t("adm.transparency.text")}
      </AlertDescription>
    </Alert>
  )
}

/* ------------------------------- danger zone ------------------------------- */

function DangerZoneCard() {
  const { t } = useI18n()
  const qc = useQueryClient()
  const reset = useMutation({
    mutationFn: () => apiPost<unknown>("/api/system/reset"),
    onSuccess: () => {
      toast({ title: t("adm.danger.success") })
      qc.invalidateQueries()
    },
    onError: () => {
      toast({ title: t("adm.danger.failure"), variant: "destructive" })
    },
  })

  return (
    <SectionCard
      title={t("adm.danger.title")}
      icon={<ShieldAlert className="h-4 w-4" />}
      className="border-destructive/40"
      bodyClassName="p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/35 bg-destructive/5 p-4">
        <div className="min-w-0 max-w-xl">
          <h3 className="text-[13px] font-bold">{t("adm.danger.cardTitle")}</h3>
          <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">{t("adm.danger.desc")}</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={reset.isPending} aria-label={t("adm.danger.reset")}>
              <RefreshCcw className="h-3.5 w-3.5" aria-hidden />
              {reset.isPending ? t("adm.danger.busy") : t("adm.danger.reset")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("adm.danger.dialogTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("adm.danger.dialogDesc")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("c.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={() => reset.mutate()}
              >
                {t("adm.danger.confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SectionCard>
  )
}

/* --------------------------------- the view -------------------------------- */

export default function AdminView() {
  const { t } = useI18n()
  return (
    <div className="space-y-4 md:space-y-5">
      <ViewHeader
        title={t("adm.title")}
        subtitle={t("adm.subtitle")}
        icon={<ServerCog className="h-5 w-5" />}
      />
      <EnginesCard />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_1fr]">
        <InfraCard />
        <RolesCard />
      </div>
      <ActivityCard />
      <TransparencyAlert />
      <DangerZoneCard />
    </div>
  )
}
