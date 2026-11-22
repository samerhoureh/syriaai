"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  CheckCircle2,
  Database,
  ExternalLink,
  FileStack,
  LoaderCircle,
  Plus,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react"
import { useI18n } from "@/components/syria/language-provider"
import { useNav } from "@/lib/store"
import { apiGet, apiPost } from "@/lib/api"
import type { Dataset } from "@/lib/types"
import { EmptyState, SectionCard, StatusBadge, ViewHeader } from "@/components/syria/ui-bits"
import { MeterBar } from "@/components/syria/charts"
import { fmtB, fmtNum, fmtNum1 } from "@/lib/format"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const CATEGORIES = ["web", "encyclopedia", "books", "dialect", "code", "news", "technical", "dialogue"] as const
const LANGUAGES = ["ar", "en", "mixed"] as const
const LICENSES = ["Internal-Research", "CC-BY-4.0", "CC-BY-SA-3.0", "ODC-BY", "Public-Domain"] as const

type FormState = {
  nameAr: string
  name: string
  category: string
  language: string
  license: string
  source: string
  docsM: string
  tokensB: string
  notes: string
}

const EMPTY_FORM: FormState = {
  nameAr: "",
  name: "",
  category: "web",
  language: "ar",
  license: "Internal-Research",
  source: "",
  docsM: "",
  tokensB: "",
  notes: "",
}

/* category/language labels with graceful fallback to the raw value */
function dictLabel(t: (k: string) => string, prefix: string, value: string, fallbackKey?: string): string {
  const key = `${prefix}.${value}`
  const out = t(key)
  if (out !== key) return out
  return fallbackKey ? t(fallbackKey) : value
}

/* ------------------------------- stat tiles ------------------------------- */

function StatTile({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: string
  label: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-panel p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
        {icon}
      </span>
      <div className="min-w-0 leading-tight">
        <div className="text-xl font-extrabold num" dir="ltr">
          {value}
        </div>
        <div className="truncate text-[11px] text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}

/* ------------------------------- detail dialog ---------------------------- */

function DatasetDetailDialog({ dataset, onClose }: { dataset: Dataset | null; onClose: () => void }) {
  const { t, isAr } = useI18n()
  const d = dataset
  const hasSplits =
    d !== null && (d.splitsTrain !== null || d.splitsValid !== null || d.splitsTest !== null)

  return (
    <Dialog open={d !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto scrollbar-sy border-line bg-background sm:max-w-xl sm:rounded-xl">
        {d ? (
          <>
            <DialogHeader className="text-start">
              <DialogTitle className="flex flex-wrap items-center gap-2 text-base font-extrabold">
                <span className="num rounded-md bg-primary/12 px-2 py-1 text-[13px] text-primary" dir="ltr">
                  {d.dsId}
                </span>
                <span className="min-w-0">{isAr ? d.nameAr : d.name}</span>
                <StatusBadge status={d.status} size="sm" />
              </DialogTitle>
              <DialogDescription>{t("datasets.detail.title")}</DialogDescription>
            </DialogHeader>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-line bg-panel-2 p-4 text-[12px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t("datasets.col.docs")}</dt>
                <dd className="font-bold num" dir="ltr">
                  {fmtNum1(d.docsM)}M
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t("datasets.col.tokens")}</dt>
                <dd className="font-bold num" dir="ltr">
                  {fmtB(d.tokensB)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t("c.category")}</dt>
                <dd className="font-bold">{dictLabel(t, "datasets.cat", d.category, "datasets.cat.other")}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t("c.language")}</dt>
                <dd className="font-bold">{dictLabel(t, "datasets.lang", d.language)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t("c.license")}</dt>
                <dd className="font-mono text-[11px] font-bold">{d.license}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t("c.version")}</dt>
                <dd className="font-bold num" dir="ltr">
                  {d.version}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t("datasets.detail.dedup")}</dt>
                <dd className="font-bold num" dir="ltr">
                  {d.dedupRatio !== null ? `${fmtNum1(d.dedupRatio * 100)}%` : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t("c.quality")}</dt>
                <dd className="w-24 font-bold">
                  {d.quality !== null ? (
                    <MeterBar label="" value={d.quality} compact tone="green" />
                  ) : (
                    <span className="num">—</span>
                  )}
                </dd>
              </div>
              <div className="col-span-full flex items-start justify-between gap-3 border-t border-line/70 pt-3">
                <dt className="shrink-0 text-muted-foreground">{t("c.source")}</dt>
                <dd className="min-w-0 text-end font-semibold text-foreground/85">{d.source}</dd>
              </div>
            </dl>

            <div className="space-y-2.5">
              <h4 className="flex items-center gap-1.5 text-xs font-bold">
                <FileStack className="h-3.5 w-3.5 text-primary" />
                {t("datasets.detail.splits")}
              </h4>
              {hasSplits ? (
                <div className="space-y-2.5 rounded-xl border border-line bg-panel-2 p-4">
                  <MeterBar label={t("datasets.split.train")} value={(d.splitsTrain ?? 0) * 100} tone="green" />
                  <MeterBar label={t("datasets.split.valid")} value={(d.splitsValid ?? 0) * 100} tone="blue" />
                  <MeterBar label={t("datasets.split.test")} value={(d.splitsTest ?? 0) * 100} tone="purple" />
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-line px-3 py-3 text-[11.5px] text-muted-foreground">
                  {t("datasets.split.none")}
                </p>
              )}
            </div>

            {d.notes ? (
              <p className="rounded-xl border border-line bg-panel-2 px-3.5 py-3 text-[11.5px] leading-relaxed text-muted-foreground">
                {d.notes}
              </p>
            ) : null}

            {d.licenseUrl ? (
              <a
                href={d.licenseUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t("datasets.detail.licenseUrl")}
              </a>
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

/* -------------------------------- import dialog --------------------------- */

function ImportDatasetDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { t } = useI18n()
  const qc = useQueryClient()
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)

  const set = (k: keyof FormState) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  const mut = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPost<Dataset>("/api/datasets", body),
    onSuccess: () => {
      toast({ title: t("datasets.toast.success"), description: t("datasets.toast.successDesc") })
      qc.invalidateQueries({ queryKey: ["datasets"] })
      setForm(EMPTY_FORM)
      onOpenChange(false)
    },
    onError: () => {
      toast({
        title: t("datasets.toast.error"),
        description: t("datasets.toast.errorDesc"),
        variant: "destructive",
      })
    },
  })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nameAr.trim() || !form.name.trim()) {
      toast({
        title: t("datasets.toast.error"),
        description: t("datasets.toast.errorDesc"),
        variant: "destructive",
      })
      return
    }
    mut.mutate({
      nameAr: form.nameAr.trim(),
      name: form.name.trim(),
      category: form.category,
      language: form.language,
      license: form.license,
      source: form.source.trim(),
      docsM: Number(form.docsM) || 0,
      tokensB: Number(form.tokensB) || 0,
      notes: form.notes.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto scrollbar-sy border-line bg-background sm:max-w-xl sm:rounded-xl">
        <DialogHeader className="text-start">
          <DialogTitle className="flex items-center gap-2 text-base font-extrabold">
            <Database className="h-5 w-5 shrink-0 text-primary" />
            {t("datasets.import.title")}
          </DialogTitle>
          <DialogDescription>{t("datasets.import.desc")}</DialogDescription>
        </DialogHeader>

        <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="ds-name-ar">{t("datasets.import.nameAr")} *</Label>
            <Input
              id="ds-name-ar"
              className="h-10"
              value={form.nameAr}
              onChange={(e) => set("nameAr")(e.target.value)}
              placeholder={t("datasets.import.nameArPh")}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ds-name-en" dir="ltr">
              {t("datasets.import.nameEn")} *
            </Label>
            <Input
              id="ds-name-en"
              className="h-10"
              dir="ltr"
              value={form.name}
              onChange={(e) => set("name")(e.target.value)}
              placeholder={t("datasets.import.nameEnPh")}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("c.category")}</Label>
            <Select value={form.category} onValueChange={set("category")}>
              <SelectTrigger className="h-10 w-full" aria-label={t("datasets.import.selectCat")}>
                <SelectValue placeholder={t("datasets.import.selectCat")} />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {dictLabel(t, "datasets.cat", c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t("c.language")}</Label>
            <Select value={form.language} onValueChange={set("language")}>
              <SelectTrigger className="h-10 w-full" aria-label={t("datasets.import.selectLang")}>
                <SelectValue placeholder={t("datasets.import.selectLang")} />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l} value={l}>
                    {dictLabel(t, "datasets.lang", l)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-full">
            <Label>{t("c.license")}</Label>
            <Select value={form.license} onValueChange={set("license")}>
              <SelectTrigger className="h-10 w-full" aria-label={t("datasets.import.selectLicense")}>
                <SelectValue placeholder={t("datasets.import.selectLicense")} />
              </SelectTrigger>
              <SelectContent>
                {LICENSES.map((l) => (
                  <SelectItem key={l} value={l} className="font-mono text-xs">
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-full">
            <Label htmlFor="ds-source">{t("c.source")}</Label>
            <Input
              id="ds-source"
              className="h-10"
              value={form.source}
              onChange={(e) => set("source")(e.target.value)}
              placeholder={t("datasets.import.sourcePh")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ds-docs" dir="ltr">
              {t("datasets.import.docsM")}
            </Label>
            <Input
              id="ds-docs"
              className="h-10 num"
              dir="ltr"
              type="number"
              min={0}
              step="0.1"
              value={form.docsM}
              onChange={(e) => set("docsM")(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ds-tokens" dir="ltr">
              {t("datasets.import.tokensB")}
            </Label>
            <Input
              id="ds-tokens"
              className="h-10 num"
              dir="ltr"
              type="number"
              min={0}
              step="0.1"
              value={form.tokensB}
              onChange={(e) => set("tokensB")(e.target.value)}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-full">
            <Label htmlFor="ds-notes">{t("c.notes")}</Label>
            <Textarea
              id="ds-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes")(e.target.value)}
            />
          </div>

          <DialogFooter className="col-span-full flex-row justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              className="min-h-10 px-4 text-xs"
              onClick={() => onOpenChange(false)}
            >
              {t("c.cancel")}
            </Button>
            <Button type="submit" className="min-h-10 gap-2 px-4 text-xs" disabled={mut.isPending}>
              {mut.isPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {mut.isPending ? t("datasets.import.submitting") : t("datasets.import.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* --------------------------------- the view ------------------------------- */

export default function DatasetsView() {
  const { t, isAr } = useI18n()
  const { payload } = useNav()
  const payloadDsId = typeof payload?.dsId === "string" ? payload.dsId : null

  const q = useQuery({
    queryKey: ["datasets"],
    queryFn: () => apiGet<Dataset[]>("/api/datasets"),
    refetchInterval: 30_000,
  })

  /* payload.openImport === true opens the import dialog on mount (once) */
  const [importOpen, setImportOpen] = React.useState<boolean>(payload?.openImport === true)
  const [detail, setDetail] = React.useState<Dataset | null>(null)
  const bootstrapped = React.useRef(false)

  /* payload.dsId opens the matching detail dialog once data arrives */
  React.useEffect(() => {
    if (bootstrapped.current || !q.data) return
    bootstrapped.current = true
    if (!payloadDsId) return
    const found = q.data.find((d) => d.dsId === payloadDsId)
    if (found) setDetail(found)
  }, [q.data, payloadDsId])

  const rows = q.data ?? []
  const total = rows.length
  const readyCount = rows.filter((d) => d.status === "ready").length
  const reviewCount = rows.filter((d) => d.status === "processing" || d.status === "review").length
  const docsTotal = rows.reduce((acc, d) => acc + (d.docsM || 0), 0)

  return (
    <div className="space-y-4 md:space-y-5">
      <ViewHeader
        title={t("datasets.title")}
        subtitle={t("datasets.subtitle")}
        icon={<Database className="h-5 w-5" />}
        actions={
          <Button className="min-h-10 gap-2 px-4 text-xs" onClick={() => setImportOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("datasets.addBtn")}
          </Button>
        }
      />

      {/* summary strip */}
      {q.isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[74px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            icon={<Database className="h-5 w-5" />}
            value={fmtNum(total)}
            label={t("datasets.stat.registered")}
          />
          <StatTile
            icon={<CheckCircle2 className="h-5 w-5" />}
            value={fmtNum(readyCount)}
            label={t("datasets.stat.ready")}
          />
          <StatTile
            icon={<LoaderCircle className="h-5 w-5" />}
            value={fmtNum(reviewCount)}
            label={t("datasets.stat.inReview")}
          />
          <StatTile
            icon={<FileStack className="h-5 w-5" />}
            value={`${fmtNum1(docsTotal)}M`}
            label={t("datasets.stat.docs")}
          />
        </div>
      )}

      {/* registry table */}
      <SectionCard
        title={t("datasets.table.title")}
        subtitle={t("datasets.table.subtitle")}
        icon={<FileStack className="h-4 w-4" />}
        bodyClassName="p-0"
      >
        {q.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-11 rounded-md" />
            ))}
          </div>
        ) : q.isError ? (
          <div className="flex flex-col items-center gap-3 p-6">
            <EmptyState
              icon={<TriangleAlert className="h-8 w-8" />}
              title={t("c.errorLoad")}
              hint={t("c.error")}
            />
            <Button variant="outline" className="min-h-10 px-5 text-xs" onClick={() => q.refetch()}>
              {t("c.retry")}
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={<Database className="h-8 w-8" />} title={t("datasets.empty")} />
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-sy">
            <Table className="min-w-[880px] text-[12.5px]">
              <TableHeader>
                <TableRow className="border-line/70 hover:bg-transparent">
                  <TableHead className="h-10 px-4 py-2.5 text-start font-semibold text-muted-foreground">
                    {t("datasets.col.dsId")}
                  </TableHead>
                  <TableHead className="h-10 px-3 py-2.5 text-start font-semibold text-muted-foreground">
                    {t("c.name")}
                  </TableHead>
                  <TableHead className="h-10 px-3 py-2.5 text-start font-semibold text-muted-foreground">
                    {t("c.category")}
                  </TableHead>
                  <TableHead className="h-10 px-3 py-2.5 text-start font-semibold text-muted-foreground">
                    {t("c.language")}
                  </TableHead>
                  <TableHead className="h-10 px-3 py-2.5 text-start font-semibold text-muted-foreground">
                    {t("datasets.col.docs")}
                  </TableHead>
                  <TableHead className="h-10 px-3 py-2.5 text-start font-semibold text-muted-foreground">
                    {t("datasets.col.tokens")}
                  </TableHead>
                  <TableHead className="h-10 px-3 py-2.5 text-start font-semibold text-muted-foreground">
                    {t("c.license")}
                  </TableHead>
                  <TableHead className="h-10 px-3 py-2.5 text-start font-semibold text-muted-foreground">
                    {t("c.quality")}
                  </TableHead>
                  <TableHead className="h-10 px-3 py-2.5 text-start font-semibold text-muted-foreground">
                    {t("c.status")}
                  </TableHead>
                  <TableHead className="h-10 px-4 py-2.5 text-start font-semibold text-muted-foreground">
                    {t("c.version")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((d) => (
                  <TableRow
                    key={d.id}
                    tabIndex={0}
                    aria-label={`${d.dsId} — ${isAr ? d.nameAr : d.name}`}
                    className={cn(
                      "cursor-pointer border-line/50 transition-colors hover:bg-accent/60",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
                    )}
                    onClick={() => setDetail(d)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        setDetail(d)
                      }
                    }}
                  >
                    <TableCell className="px-4 py-2.5 font-extrabold text-primary">
                      <span className="num" dir="ltr">
                        {d.dsId}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate px-3 py-2.5 font-semibold">
                      {isAr ? d.nameAr : d.name}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-muted-foreground">
                      {dictLabel(t, "datasets.cat", d.category, "datasets.cat.other")}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-muted-foreground">
                      {dictLabel(t, "datasets.lang", d.language)}
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      <span className="num" dir="ltr">
                        {fmtNum1(d.docsM)}M
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      <span className="num" dir="ltr">
                        {fmtB(d.tokensB)}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10.5px] font-semibold">
                        {d.license}
                      </span>
                    </TableCell>
                    <TableCell className="min-w-[110px] px-3 py-2.5">
                      {d.quality !== null ? (
                        <MeterBar label="" value={d.quality} compact tone="green" />
                      ) : (
                        <span className="num text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      <StatusBadge status={d.status} size="sm" />
                    </TableCell>
                    <TableCell className="px-4 py-2.5 text-muted-foreground">
                      <span className="num" dir="ltr">
                        {d.version}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {/* honesty note */}
      <p className="flex items-start gap-2 px-1 text-[11px] leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-valid" />
        {t("datasets.honestNote")}
      </p>

      <DatasetDetailDialog dataset={detail} onClose={() => setDetail(null)} />
      <ImportDatasetDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}
