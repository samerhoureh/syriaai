"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Ban, CheckCheck, Copy, FileJson2, KeyRound, Plus, TerminalSquare } from "lucide-react"
import { useI18n } from "@/components/syria/language-provider"
import { useNav } from "@/lib/store"
import { apiGet, apiPost, apiDelete } from "@/lib/api"
import type { ApiKey } from "@/lib/types"
import { ViewHeader, SectionCard, StatusBadge } from "@/components/syria/ui-bits"
import { fmtNum, fmtNum2, fmtDate, fmtRelative } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/hooks/use-toast"

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const { t } = useI18n()
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      toast({ title: t("c.copied") })
    } catch {
      /* ignore */
    }
  }
  return (
    <div className="group relative rounded-lg border border-line bg-panel-2">
      <div className="flex items-center justify-between border-b border-line/60 px-3 py-1.5">
        <span className="text-[10px] font-bold text-muted-foreground">{label}</span>
        <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[10px]" onClick={copy}>
          <Copy className="h-3 w-3" /> {t("c.copy")}
        </Button>
      </div>
      <pre className="sy-code overflow-x-auto scrollbar-sy p-3 text-foreground/90">{code}</pre>
    </div>
  )
}

const CURL = `curl -N https://api.syriaai.org/v1/chat/completions \\
  -H "Authorization: Bearer SK-syria-****" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "syria-ai-mini",
    "stream": true,
    "messages": [{"role": "user", "content": "مرحباً"}]
  }'`

const PY = `from syria_ai import Client

client = Client(api_key="SK-syria-****")

for chunk in client.chat.stream(
    model="syria-ai-mini",
    messages=[{"role": "user", "content": "مرحباً"}],
):
    print(chunk.delta, end="", flush=True)`

const JS = `import { SyriaAI } from "@syria-ai/sdk";

const client = new SyriaAI({ apiKey: "SK-syria-****" });

const stream = await client.chat.completions.stream({
  model: "syria-ai-mini",
  messages: [{ role: "user", content: "مرحباً" }],
});

for await (const chunk of stream) {
  process.stdout.write(chunk.delta);
}`

function CreateKeyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useI18n()
  const qc = useQueryClient()
  const [name, setName] = React.useState("")
  const [tier, setTier] = React.useState("community")
  const [busy, setBusy] = React.useState(false)
  const [created, setCreated] = React.useState<ApiKey | null>(null)

  const submit = async () => {
    setBusy(true)
    try {
      const key = await apiPost<ApiKey>("/api/keys", { name, tier })
      setCreated(key)
      qc.invalidateQueries({ queryKey: ["keys"] })
    } catch (e) {
      toast({ title: t("c.error"), description: String(e instanceof Error ? e.message : e) })
    } finally {
      setBusy(false)
    }
  }

  const reset = () => {
    setCreated(null)
    setName("")
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && created) {
          setCreated(null)
          setName("")
        }
        onOpenChange(v)
      }}
    >
      <DialogContent className="border-line bg-popover sm:max-w-md">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("api.created.title")}</DialogTitle>
              <DialogDescription>{t("api.created.warn")}</DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-primary/40 bg-primary/8 px-3 py-3">
              <code className="sy-code block select-all font-bold text-primary" dir="ltr">
                {created.fullKey}
              </code>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(created.fullKey).catch(() => {})
                  toast({ title: t("c.copied") })
                }}
              >
                <Copy className="me-1.5 h-4 w-4" /> {t("c.copy")}
              </Button>
              <Button onClick={reset}>{t("c.close")}</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("api.create.title")}</DialogTitle>
              <DialogDescription>{t("api.create.desc")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3.5 py-1">
              <div className="grid gap-1.5">
                <Label htmlFor="key-name">{t("api.create.name")}</Label>
                <Input id="key-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: مفتاح الاختبار المحلي" />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("api.create.tier")}</Label>
                <Select value={tier} onValueChange={setTier}>
                  <SelectTrigger aria-label={t("api.create.tier")} className="min-h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">{t("api.tier.internal")}</SelectItem>
                    <SelectItem value="research">{t("api.tier.research")}</SelectItem>
                    <SelectItem value="community">{t("api.tier.community")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={reset}>{t("c.cancel")}</Button>
              <Button onClick={submit} disabled={busy || !name.trim()} className="min-h-9">
                {busy ? t("c.loading") : t("api.create.submit")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function ApiView() {
  const { t, lang } = useI18n()
  const { payload } = useNav()
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = React.useState(false)

  React.useEffect(() => {
    const p = payload as { openCreate?: boolean } | undefined
    if (p?.openCreate) setCreateOpen(true)
     
  }, [payload])

  const q = useQuery({ queryKey: ["keys"], queryFn: () => apiGet<ApiKey[]>("/api/keys") })
  const rows = q.data ?? []
  const active = rows.filter((k) => k.status === "active")
  const totalReq = rows.reduce((s, k) => s + k.requests, 0)
  const tokens = rows.reduce((s, k) => s + k.tokensUsed, 0)
  const avgLimit = rows.length ? Math.round(rows.reduce((s, k) => s + k.rateLimit, 0) / rows.length) : 0

  const revoke = async (key: ApiKey) => {
    try {
      await apiDelete(`/api/keys/${key.id}`)
      toast({ title: t("api.revokeDone"), description: key.name })
      qc.invalidateQueries({ queryKey: ["keys"] })
    } catch (e) {
      toast({ title: t("c.error"), description: String(e instanceof Error ? e.message : e) })
    }
  }

  const endpoints = [
    { method: "GET", path: "/v1/models", desc: t("api.ep.models"), status: "internal" },
    { method: "POST", path: "/v1/chat/completions", desc: t("api.ep.chat"), status: "prep" },
    { method: "GET", path: "/v1/health", desc: t("api.ep.health"), status: "internal" },
  ]

  return (
    <div className="space-y-4">
      <ViewHeader
        title={t("api.title")}
        subtitle={t("api.subtitle")}
        icon={<TerminalSquare className="h-5 w-5" />}
        actions={
          <Button className="min-h-9 gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> {t("api.newKey")}
          </Button>
        }
      />

      {/* stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [t("api.stat.totalReq"), fmtNum(totalReq), "var(--chart-1)"],
          [t("api.stat.active"), fmtNum(active.length), "var(--chart-3)"],
          [t("api.stat.tokens"), `${fmtNum2(tokens)}M`, "var(--chart-2)"],
          [t("api.stat.avgLimit"), `${fmtNum(avgLimit)}/m`, "var(--chart-4)"],
        ].map(([label, value, tone]) => (
          <div key={label} className="rounded-xl border border-line bg-panel px-4 py-3">
            <div className="text-[11px] font-semibold text-muted-foreground">{label}</div>
            <div className="mt-1 text-xl font-extrabold num" style={{ color: tone }} dir="ltr">{value}</div>
          </div>
        ))}
      </div>

      {/* keys */}
      <SectionCard title={t("api.keys.title")} icon={<KeyRound className="h-4 w-4" />} bodyClassName="p-0">
        {q.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-md" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-sy">
            <table className="w-full min-w-[820px] text-[12.5px]">
              <thead>
                <tr className="border-b border-line/70 text-muted-foreground">
                  <th className="px-4 py-3 text-start font-semibold">{t("api.tbl.name")}</th>
                  <th className="px-3 py-3 text-start font-semibold">{t("api.tbl.key")}</th>
                  <th className="px-3 py-3 text-start font-semibold">{t("api.tbl.tier")}</th>
                  <th className="px-3 py-3 text-start font-semibold">{t("api.tbl.status")}</th>
                  <th className="px-3 py-3 text-start font-semibold">{t("api.tbl.requests")}</th>
                  <th className="px-3 py-3 text-start font-semibold">{t("api.tbl.lastUsed")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("api.tbl.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((k) => (
                  <tr key={k.id} className="border-b border-line/50 last:border-0 hover:bg-accent/50">
                    <td className="px-4 py-2.5 font-semibold">{k.name}</td>
                    <td className="px-3 py-2.5">
                      <code className="rounded bg-panel-2 px-2 py-0.5 font-mono text-[11px] text-muted-foreground" dir="ltr">
                        {k.maskedKey}
                      </code>
                    </td>
                    <td className="px-3 py-2.5 capitalize num" dir="ltr">{k.tier}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={k.status} size="sm" dot={false} /></td>
                    <td className="px-3 py-2.5 num" dir="ltr">
                      {fmtNum(k.requests)} <span className="text-[10px] text-muted-foreground">/ {k.rateLimit}m</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{fmtRelative(k.lastUsed, lang)}</td>
                    <td className="px-4 py-2.5">
                      {k.status === "active" ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" style={{ color: "var(--chart-5)" }}>
                              <Ban className="h-3.5 w-3.5" /> {t("api.revoke")}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="border-line bg-popover">
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("api.revokeConfirm")}</AlertDialogTitle>
                              <AlertDialogDescription>{t("api.revokeDesc")}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("c.cancel")}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => revoke(k)}>{t("api.revoke")}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* endpoints */}
        <SectionCard title={t("api.endpoints.title")} icon={<FileJson2 className="h-4 w-4" />} bodyClassName="p-4 space-y-3">
          <p className="text-[11px] text-muted-foreground">{t("api.endpoints.soon")}</p>
          {endpoints.map((ep) => (
            <div key={ep.path} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel-2 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="rounded px-2 py-0.5 font-mono text-[10px] font-bold"
                  style={{
                    background: "color-mix(in oklab, var(--chart-1) 14%, transparent)",
                    color: "var(--chart-1)",
                  }}
                  dir="ltr"
                >
                  {ep.method}
                </span>
                <div className="min-w-0">
                  <code className="block truncate text-xs font-bold" dir="ltr">{ep.path}</code>
                  <p className="truncate text-[10.5px] text-muted-foreground">{ep.desc}</p>
                </div>
              </div>
              <span
                className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                style={
                  ep.status === "internal"
                    ? { color: "var(--chart-1)", borderColor: "color-mix(in oklab, var(--chart-1) 40%, transparent)" }
                    : { color: "var(--muted-foreground)", borderColor: "var(--line)" }
                }
              >
                {ep.status === "internal" ? t("api.status.internal") : t("api.status.prep")}
              </span>
            </div>
          ))}
          <p className="text-[10.5px] text-muted-foreground">{t("api.rateNote")}</p>
        </SectionCard>

        {/* snippets */}
        <SectionCard title={t("api.snippets.title")} icon={<TerminalSquare className="h-4 w-4" />} bodyClassName="p-4">
          <Tabs defaultValue="curl">
            <TabsList className="mb-3">
              <TabsTrigger value="curl">{t("api.curl")}</TabsTrigger>
              <TabsTrigger value="python">{t("api.python")}</TabsTrigger>
              <TabsTrigger value="js">{t("api.js")}</TabsTrigger>
            </TabsList>
            <TabsContent value="curl"><CodeBlock code={CURL} label={t("api.curl")} /></TabsContent>
            <TabsContent value="python"><CodeBlock code={PY} label={t("api.python")} /></TabsContent>
            <TabsContent value="js"><CodeBlock code={JS} label={t("api.js")} /></TabsContent>
          </Tabs>
        </SectionCard>
      </div>

      <CreateKeyDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
