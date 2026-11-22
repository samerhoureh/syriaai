"use client"

import * as React from "react"
import {
  BookOpen,
  Boxes,
  Bug,
  Check,
  Code,
  Copy,
  Database,
  ExternalLink,
  FileText,
  GraduationCap,
  GitBranch,
  HeartHandshake,
  Languages,
  Library,
  ListChecks,
  ShieldCheck,
  Terminal,
  UsersRound,
} from "lucide-react"
import { useI18n } from "@/components/syria/language-provider"
import { useNav, type ViewId } from "@/lib/store"
import { toast } from "@/hooks/use-toast"
import { SectionCard, ViewHeader, DemoChip } from "@/components/syria/ui-bits"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

/* --------------------------- quickstart commands -------------------------- */

const CMD_CLONE = "git clone https://github.com/samerhoureh/syriaai.git"
const CMD_SETUP = "bun install && bun run db:push && bun prisma/seed.ts"
const CMD_RUN = "bun run dev"

/* ------------------------------- SDK samples ------------------------------ */

const SDK_PY = `import requests, json

BASE_URL = "https://api.syria-ai.org/v1"
API_KEY = "sy-your-api-key"

payload = {
    "model": "syria-nano",
    "messages": [
        {"role": "user", "content": "مرحباً، عرّف بنفسك بإيجاز"}
    ],
    "stream": True,
    "temperature": 0.7,
    "max_tokens": 512,
}

with requests.post(
    f"{BASE_URL}/chat/completions",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json=payload,
    stream=True,
    timeout=60,
) as resp:
    resp.raise_for_status()
    for line in resp.iter_lines():
        if not line or not line.startswith(b"data: "):
            continue
        chunk = line[6:].decode("utf-8")
        if chunk == "[DONE]":
            break
        delta = json.loads(chunk)["choices"][0]["delta"]
        print(delta.get("content", ""), end="", flush=True)`

const SDK_JS = `const BASE_URL = "https://api.syria-ai.org/v1";
const API_KEY = process.env.SYRIA_AI_API_KEY;

async function streamChat() {
  const res = await fetch(\`\${BASE_URL}/chat/completions\`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: \`Bearer \${API_KEY}\`,
    },
    body: JSON.stringify({
      model: "syria-nano",
      stream: true,
      messages: [{ role: "user", content: "مرحباً، عرّف بنفسك بإيجاز" }],
    }),
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") return;
      const { choices } = JSON.parse(data);
      process.stdout.write(choices[0]?.delta?.content ?? "");
    }
  }
}

streamChat();`

const SDK_CURL = `curl -N https://api.syria-ai.org/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sy-your-api-key" \\
  -d '{
    "model": "syria-nano",
    "stream": true,
    "messages": [
      { "role": "user", "content": "مرحباً، عرّف بنفسك بإيجاز" }
    ]
  }'`

const GITHUB_URL = "https://github.com/syria-ai"
const CONDUCT_URL = "https://github.com/syria-ai/.github/blob/main/CODE_OF_CONDUCT.md"

/* ------------------------------- code block ------------------------------- */

function CodeBlock({
  code,
  label,
  ariaLabel,
}: {
  code: string
  label: string
  ariaLabel: string
}) {
  const { t } = useI18n()
  const [copied, setCopied] = React.useState(false)
  const timer = React.useRef<number | null>(null)

  React.useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast({ title: t("c.copied") })
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1800)
    } catch {
      toast({ title: t("c.error"), variant: "destructive" })
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-panel-2">
      <div className="flex items-center justify-between gap-2 border-b border-line/70 bg-panel px-3 py-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground num" dir="ltr">
          {label}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCopy}
          aria-label={ariaLabel}
          className="h-6.5 gap-1.5 px-2 text-[10.5px] text-muted-foreground hover:text-primary"
        >
          {copied ? <Check className="h-3 w-3 text-primary" strokeWidth={3} /> : <Copy className="h-3 w-3" />}
          {copied ? t("c.copied") : t("c.copy")}
        </Button>
      </div>
      <pre className="sy-code overflow-x-auto scrollbar-sy px-4 py-3 text-foreground/85" aria-label={ariaLabel}>
        <code>{code}</code>
      </pre>
    </div>
  )
}

/* ------------------------------ quickstart -------------------------------- */

function QuickstartCard() {
  const { t } = useI18n()
  const steps = [
    { cmd: CMD_CLONE, label: "bash", title: t("dev.quick.step1"), desc: t("dev.quick.step1desc") },
    { cmd: CMD_SETUP, label: "bash", title: t("dev.quick.step2"), desc: t("dev.quick.step2desc") },
    { cmd: CMD_RUN, label: "bash", title: t("dev.quick.step3"), desc: t("dev.quick.step3desc") },
  ]

  return (
    <SectionCard
      title={t("dev.quick.title")}
      subtitle={t("dev.quick.subtitle")}
      icon={<ListChecks className="h-4 w-4" />}
    >
      <ol className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="flex flex-col gap-3 rounded-xl border border-line bg-panel-2 p-4 transition-colors hover:border-primary/35">
            <div className="flex items-center gap-2.5">
              <span
                className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground shadow-[0_0_14px_-4px_var(--glow)]"
                dir="ltr"
                aria-hidden
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold leading-tight">{s.title}</h3>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            </div>
            <CodeBlock code={s.cmd} label={s.label} ariaLabel={`${s.title} — ${t("dev.sdk.copyAria")}`} />
          </li>
        ))}
      </ol>
    </SectionCard>
  )
}

/* --------------------------------- SDK tabs -------------------------------- */

function SdkCard() {
  const { t } = useI18n()
  const tabs = [
    { id: "python", label: t("dev.sdk.tabPython"), code: SDK_PY },
    { id: "js", label: t("dev.sdk.tabJs"), code: SDK_JS },
    { id: "curl", label: t("dev.sdk.tabCurl"), code: SDK_CURL },
  ]

  return (
    <SectionCard title={t("dev.sdk.title")} subtitle={t("dev.sdk.subtitle")} icon={<Terminal className="h-4 w-4" />}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <DemoChip label={t("dev.sdk.note")} />
      </div>
      <Tabs defaultValue="python" dir="ltr">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="num text-[11.5px]">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-3">
            <CodeBlock code={tab.code} label={tab.label} ariaLabel={`${tab.label} — ${t("dev.sdk.copyAria")}`} />
          </TabsContent>
        ))}
      </Tabs>
    </SectionCard>
  )
}

/* ------------------------------ resources grid ----------------------------- */

type ResourceTile = {
  id: string
  icon: React.ComponentType<{ className?: string }>
  titleKey: string
  descKey: string
  action:
    | { kind: "href" }
    | { kind: "nav"; view: ViewId }
    | { kind: "toast" }
}

const RESOURCES: ResourceTile[] = [
  { id: "docs", icon: BookOpen, titleKey: "dev.res.docs", descKey: "dev.res.docs.desc", action: { kind: "toast" } },
  { id: "cards", icon: Boxes, titleKey: "dev.res.cards", descKey: "dev.res.cards.desc", action: { kind: "nav", view: "models" } },
  { id: "datasets", icon: Database, titleKey: "dev.res.datasets", descKey: "dev.res.datasets.desc", action: { kind: "nav", view: "datasets" } },
  { id: "contrib", icon: GitBranch, titleKey: "dev.res.contrib", descKey: "dev.res.contrib.desc", action: { kind: "href" } },
  { id: "security", icon: ShieldCheck, titleKey: "dev.res.security", descKey: "dev.res.security.desc", action: { kind: "href" } },
  { id: "community", icon: GraduationCap, titleKey: "dev.res.community", descKey: "dev.res.community.desc", action: { kind: "nav", view: "research" } },
]

function ResourcesGrid() {
  const { t } = useI18n()
  const { navigate } = useNav()
  const pendingToast = () =>
    toast({ title: t("dev.res.pending"), description: t("dev.res.pendingHint") })

  const tileClasses = cn(
    "group relative flex flex-col gap-2.5 rounded-xl border border-line bg-panel-2 p-4 text-start",
    "transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_0_24px_-10px_var(--glow)]"
  )

  return (
    <SectionCard title={t("dev.res.title")} subtitle={t("dev.res.subtitle")} icon={<Library className="h-4 w-4" />}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {RESOURCES.map((res) => {
          const Icon = res.icon
          const action = res.action
          const inner = (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/12 text-primary transition-transform duration-200 group-hover:scale-110">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                {action.kind === "href" ? (
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/60 transition-colors group-hover:text-primary" aria-hidden />
                ) : null}
              </div>
              <div className="min-w-0">
                <h3 className="text-[13px] font-bold leading-tight">{t(res.titleKey)}</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{t(res.descKey)}</p>
              </div>
            </>
          )

          if (res.action.kind === "href") {
            return (
              <a
                key={res.id}
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={tileClasses}
                aria-label={`${t(res.titleKey)} — ${t("dev.community.githubAria")}`}
              >
                {inner}
              </a>
            )
          }

          return (
            <button
              key={res.id}
              type="button"
              onClick={action.kind === "nav" ? () => navigate(action.view) : pendingToast}
              className={tileClasses}
              aria-label={t(res.titleKey)}
            >
              {inner}
            </button>
          )
        })}
      </div>
    </SectionCard>
  )
}

/* -------------------------------- community -------------------------------- */

const WAYS = [
  { id: "code", icon: Code, titleKey: "dev.community.code", descKey: "dev.community.code.desc" },
  { id: "dataDocs", icon: FileText, titleKey: "dev.community.dataDocs", descKey: "dev.community.dataDocs.desc" },
  { id: "dialects", icon: Languages, titleKey: "dev.community.dialects", descKey: "dev.community.dialects.desc" },
  { id: "bugs", icon: Bug, titleKey: "dev.community.bugs", descKey: "dev.community.bugs.desc" },
]

function CommunityCard() {
  const { t } = useI18n()
  return (
    <SectionCard
      title={t("dev.community.title")}
      subtitle={t("dev.community.subtitle")}
      icon={<HeartHandshake className="h-4 w-4" />}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {WAYS.map((w) => {
          const Icon = w.icon
          return (
            <div key={w.id} className="flex items-start gap-3 rounded-lg border border-line bg-panel-2 p-3.5 transition-colors hover:border-primary/30">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/12 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h3 className="text-[12.5px] font-bold leading-tight">{t(w.titleKey)}</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{t(w.descKey)}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-panel-2 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[12px] font-bold">{t("dev.community.conduct")}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{t("dev.community.conductHint")}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={CONDUCT_URL} target="_blank" rel="noopener noreferrer" className="gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" />
            {t("dev.community.openConduct")}
          </a>
        </Button>
      </div>
    </SectionCard>
  )
}

/* --------------------------------- the view -------------------------------- */

export default function DevelopersView() {
  const { t } = useI18n()
  return (
    <div className="space-y-4 md:space-y-5">
      <ViewHeader
        title={t("dev.title")}
        subtitle={t("dev.subtitle")}
        icon={<UsersRound className="h-5 w-5" />}
      />
      <QuickstartCard />
      <SdkCard />
      <ResourcesGrid />
      <CommunityCard />
    </div>
  )
}
