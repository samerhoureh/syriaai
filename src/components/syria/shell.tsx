"use client"

import * as React from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import {
  Activity, Bell, Boxes, BrainCircuit, ChevronLeft, ChevronRight, CircleGauge, Command,
  Database, ExternalLink, FileCode2, FlaskConical, Gauge, Github, Globe, LayoutDashboard,
  Menu as MenuIcon, MessageSquareText, Moon, PlayCircle, RefreshCw, Search, ServerCog,
  ShieldCheck, Sun, TerminalSquare, TriangleAlert, UsersRound, X, BookOpen, FileBarChart2, Rocket,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useI18n } from "@/components/syria/language-provider"
import { LogoMark, SyriaFlag } from "@/components/syria/ui-bits"
import { useNav, useDemoMode, type ViewId } from "@/lib/store"
import { apiGet } from "@/lib/api"
import type { ActivityLog, AiModel, Dataset } from "@/lib/types"
import { fmtDateTime, fmtRelative } from "@/lib/format"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

/* ------------------------------ navigation model -------------------------- */

type NavItem = {
  id: ViewId
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
}

const NAV_MAIN: NavItem[] = [
  { id: "dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { id: "models", labelKey: "nav.models", icon: Boxes },
  { id: "experiments", labelKey: "nav.experiments", icon: FlaskConical },
  { id: "datasets", labelKey: "nav.datasets", icon: Database },
  { id: "benchmarks", labelKey: "nav.benchmarks", icon: Gauge },
  { id: "inference", labelKey: "nav.inference", icon: PlayCircle },
]

const NAV_PLATFORM: NavItem[] = [
  { id: "api", labelKey: "nav.api", icon: TerminalSquare },
  { id: "developers", labelKey: "nav.developers", icon: UsersRound },
  { id: "admin", labelKey: "nav.admin", icon: ServerCog },
  { id: "chat", labelKey: "nav.chat", icon: MessageSquareText },
  { id: "research", labelKey: "nav.research", icon: FileBarChart2 },
]

/* --------------------------------- sidebar -------------------------------- */

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n()
  const { view, navigate } = useNav()
  const { demoMode, setDemoMode } = useDemoMode()
  const isRtl = t("c.of") === "من"

  const go = (id: ViewId) => {
    navigate(id)
    onNavigate?.()
  }

  const renderItems = (items: NavItem[]) =>
    items.map((item) => {
      const active = view === item.id
      const Icon = item.icon
      return (
        <button
          key={item.id}
          onClick={() => go(item.id)}
          aria-current={active ? "page" : undefined}
          className={cn(
            "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-all duration-200",
            active
              ? "border border-primary/40 bg-primary/12 text-primary shadow-[0_0_20px_-6px_var(--glow)]"
              : "border border-transparent text-sidebar-foreground/75 hover:border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}
        >
          <Icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-110", active && "text-primary")} />
          <span className="flex-1 text-start leading-tight">{t(item.labelKey)}</span>
          {active ? (
            <span className="text-primary">{isRtl ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</span>
          ) : null}
        </button>
      )
    })

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* brand */}
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
        <LogoMark size={42} />
        <div className="leading-tight">
          <div className="text-lg font-black tracking-wide text-primary glow-text">SYRIA AI</div>
          <div className="text-[11px] font-semibold">{t("brand.org")}</div>
          <div className="text-[9.5px] text-sidebar-foreground/55">{t("brand.orgEn")}</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-sy px-3 py-4" aria-label={t("nav.menu")}>
        {renderItems(NAV_MAIN)}
        <div className="px-3 pb-1.5 pt-5 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/45">
          {t("nav.sectionPlatform")}
        </div>
        {renderItems(NAV_PLATFORM)}

        <div className="px-3 pb-1.5 pt-5 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/45">
          {t("nav.quicklinks")}
        </div>
        <div className="space-y-1">
          <button
            onClick={() => go("chat")}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[12.5px] text-sidebar-foreground/70 transition hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <MessageSquareText className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-start">{t("nav.chat")}</span>
          </button>
          <a
            href="https://www.syriaai.org"
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[12.5px] text-sidebar-foreground/70 transition hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <Globe className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-start">{t("nav.official")}</span>
            <ExternalLink className="h-3 w-3 opacity-50" />
          </a>
          <a
            href="https://github.com/syria-ai"
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[12.5px] text-sidebar-foreground/70 transition hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <Github className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-start">{t("nav.github")}</span>
            <ExternalLink className="h-3 w-3 opacity-50" />
          </a>
          <button
            onClick={() => go("research")}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[12.5px] text-sidebar-foreground/70 transition hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-start">{t("nav.docs")}</span>
          </button>
          <button
            onClick={() => go("research")}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[12.5px] text-sidebar-foreground/70 transition hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <FileBarChart2 className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-start">{t("nav.reports")}</span>
          </button>
        </div>
      </nav>

      {/* demo mode toggle (footer area) */}
      <div className="border-t border-sidebar-border px-4 py-3">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-sidebar-border bg-panel px-3 py-2.5">
          <div className="min-w-0 leading-tight">
            <div className="text-[11.5px] font-bold">{t("demo.mode")}</div>
            <div className="mt-0.5 text-[9.5px] text-sidebar-foreground/60">{t("demo.mode.hint")}</div>
          </div>
          <Switch checked={demoMode} onCheckedChange={setDemoMode} aria-label={t("demo.mode")} />
        </div>
      </div>

      {/* footer brand */}
      <div className="border-t border-sidebar-border px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="leading-tight">
            <div className="text-base font-black text-primary">SYRIA AI</div>
            <div className="text-[10px] text-sidebar-foreground/60">{t("brand.tagline")}</div>
          </div>
          <SyriaFlag className="h-9 w-14" waving />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------ command palette --------------------------- */

function SearchPalette({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const { t, lang } = useI18n()
  const { navigate } = useNav()
  const [models, setModels] = React.useState<AiModel[]>([])
  const [datasets, setDatasets] = React.useState<Dataset[]>([])

  React.useEffect(() => {
    if (!open) return
    apiGet<AiModel[]>("/api/models")
      .then(setModels)
      .catch(() => {})
    apiGet<Dataset[]>("/api/datasets")
      .then(setDatasets)
      .catch(() => {})
  }, [open])

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(!open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, setOpen])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t("top.search")} />
      <CommandList>
        <CommandEmpty>{t("top.noNotifications")}</CommandEmpty>
        <CommandGroup heading={t("nav.menu")}>
          {[...NAV_MAIN, ...NAV_PLATFORM].map((item) => (
            <CommandItem
              key={item.id}
              onSelect={() => {
                navigate(item.id)
                setOpen(false)
              }}
            >
              <item.icon className="me-2 h-4 w-4 text-primary" />
              {t(item.labelKey)}
            </CommandItem>
          ))}
        </CommandGroup>
        {models.length > 0 && (
          <CommandGroup heading={t("c.model")}>
            {models.map((m) => (
              <CommandItem
                key={m.id}
                value={`${m.name} ${m.modelId} ${m.params}`}
                onSelect={() => {
                  navigate("models", { modelId: m.modelId })
                  setOpen(false)
                }}
              >
                <BrainCircuit className="me-2 h-4 w-4 text-primary" />
                <span>{m.name}</span>
                <span className="ms-1 text-xs text-muted-foreground num">{m.params}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {datasets.length > 0 && (
          <CommandGroup heading={t("c.dataset")}>
            {datasets.slice(0, 8).map((d) => (
              <CommandItem
                key={d.id}
                value={`${d.name} ${d.nameAr} ${d.dsId}`}
                onSelect={() => {
                  navigate("datasets", { dsId: d.dsId })
                  setOpen(false)
                }}
              >
                <Database className="me-2 h-4 w-4 text-info" />
                <span>{lang === "ar" ? d.nameAr : d.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}

/* ------------------------------ notifications ------------------------------ */

function NotificationsBell() {
  const { t, lang } = useI18n()
  const [open, setOpen] = React.useState(false)
  const [logs, setLogs] = React.useState<ActivityLog[]>([])
  const [seen, setSeen] = React.useState(0)

  const load = React.useCallback(() => {
    apiGet<ActivityLog[]>("/api/activity")
      .then((d) => setLogs(d.slice(0, 8)))
      .catch(() => {})
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  const unread = Math.max(0, logs.length - seen)

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) load(); else setSeen(logs.length) }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label={t("top.notifications")}>
          <Bell className="h-4.5 w-4.5" />
          {unread > 0 && (
            <span className="absolute -end-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white num">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 border-line bg-popover p-0" sideOffset={8}>
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <span className="text-sm font-bold">{t("top.notifications")}</span>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSeen(logs.length)}>
            {t("top.markRead")}
          </Button>
        </div>
        <div className="max-h-80 overflow-y-auto scrollbar-sy p-2">
          {logs.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">{t("top.noNotifications")}</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2.5 rounded-lg px-3 py-2 hover:bg-accent">
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{
                    background:
                      log.level === "success"
                        ? "var(--chart-1)"
                        : log.level === "warn"
                          ? "var(--chart-4)"
                          : log.level === "error"
                            ? "var(--chart-5)"
                            : "var(--chart-3)",
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-snug">{lang === "ar" ? log.messageAr : log.messageEn}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{fmtRelative(log.createdAt, lang)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/* --------------------------------- topbar --------------------------------- */

function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { t, lang, toggle } = useI18n()
  const { theme, setTheme } = useTheme()
  const [searchOpen, setSearchOpen] = React.useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="flex h-14 items-center gap-2 px-3 md:h-16 md:gap-3 md:px-5">
        {/* mobile menu */}
        <Sheet open={false} onOpenChange={() => {}}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 lg:hidden" onClick={onOpenMenu} aria-label={t("top.openMenu")}>
              <MenuIcon className="h-5 w-5" />
            </Button>
          </SheetTrigger>
        </Sheet>

        {/* user */}
        <div className="hidden items-center gap-2.5 rounded-lg border border-line bg-panel px-3 py-1.5 sm:flex">
          <div className="text-end leading-tight">
            <div className="text-[12.5px] font-bold">{t("top.user")}</div>
            <div className="text-[10px] text-muted-foreground">{t("top.userRole")}</div>
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/40">
            <UsersRound className="h-4 w-4" />
          </span>
        </div>

        {/* search */}
        <button
          onClick={() => setSearchOpen(true)}
          className="group flex h-9 flex-1 items-center gap-2 rounded-lg border border-line bg-panel px-3 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground md:max-w-xl"
          aria-label={t("top.searchHint")}
          aria-keyshortcuts="Control+K"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="hidden flex-1 truncate text-start sm:block">{t("top.search")}</span>
          <span className="hidden sm:block">
            <kbd className="inline-flex items-center gap-0.5 rounded border border-line bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </span>
        </button>

        <div className="ms-auto flex items-center gap-1.5 md:gap-2">
          {/* language */}
          <div className="flex items-center rounded-lg border border-line bg-panel p-0.5" role="group" aria-label="Language">
            <button
              onClick={() => lang !== "en" && toggle()}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-bold transition",
                lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={lang === "en"}
            >
              EN
            </button>
            <button
              onClick={() => lang !== "ar" && toggle()}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-bold transition",
                lang === "ar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={lang === "ar"}
            >
              AR
            </button>
          </div>

          {/* theme */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={t("top.theme")}
          >
            <Sun className="h-4.5 w-4.5 dark:hidden" />
            <Moon className="hidden h-4.5 w-4.5 dark:block" />
          </Button>

          {/* version badge */}
          <span className="hidden items-center gap-2 rounded-lg border border-line bg-panel px-3 py-1.5 text-[11px] font-semibold md:flex">
            <span className="h-2 w-2 rounded-full bg-primary pulse-dot" />
            SYRIA AI <span className="num">{t("brand.version")}</span>
          </span>

          <NotificationsBell />
        </div>
      </div>
      <SearchPalette open={searchOpen} setOpen={setSearchOpen} />
    </header>
  )
}

/* --------------------------------- footer --------------------------------- */

type SystemInfoLite = {
  engines: { models: string; training: string; inference: string; dataEngine: string; platform: string }
  status: string
  serverTime: string
}

function FooterStatusBar() {
  const { t, lang } = useI18n()
  const [info, setInfo] = React.useState<SystemInfoLite | null>(null)
  const [updatedAt, setUpdatedAt] = React.useState<string>(new Date().toISOString())
  const [refreshing, setRefreshing] = React.useState(false)

  const load = React.useCallback(async () => {
    setRefreshing(true)
    try {
      const d = await apiGet<SystemInfoLite>("/api/system")
      setInfo(d)
      setUpdatedAt(new Date().toISOString())
    } catch {
      /* keep last */
    } finally {
      setRefreshing(false)
    }
  }, [])

  React.useEffect(() => {
    load()
    const id = setInterval(load, 15_000)
    return () => clearInterval(id)
  }, [load])

  const engines = info?.engines ?? { models: "v0.1.0", training: "v0.1.0", inference: "v0.1.0", dataEngine: "v0.3.0", platform: "v0.1.0" }

  return (
    <footer className="mt-auto border-t border-line bg-panel/80 backdrop-blur">
      <div className="mx-auto flex max-w-full flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-2.5 text-[11px] text-muted-foreground md:px-6">
        <span className="inline-flex items-center gap-2 font-semibold text-foreground/80">
          <span className="h-2 w-2 rounded-full bg-primary pulse-dot" />
          {t("footer.systemStatus")}: <span className="text-primary">{t("footer.operating")}</span>
        </span>
        <span className="hidden sm:inline">
          {t("footer.modelsEngine")}: <span className="num text-foreground/80">{engines.models}</span>
        </span>
        <span className="hidden sm:inline">
          {t("footer.trainingEngine")}: <span className="num text-foreground/80">{engines.training}</span>
        </span>
        <span className="hidden md:inline">
          {t("footer.inferenceEngine")}: <span className="num text-foreground/80">{engines.inference}</span>
        </span>
        <span className="hidden lg:inline">
          {t("footer.dataEngine")}: <span className="num text-foreground/80">{engines.dataEngine}</span>
        </span>
        <span className="ms-auto inline-flex items-center gap-2">
          {t("footer.lastUpdate")}: <span className="num">{fmtDateTime(updatedAt, lang)}</span>
          <button
            onClick={load}
            className="rounded-md p-1 transition hover:bg-accent hover:text-foreground"
            aria-label={t("footer.refresh")}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          </button>
        </span>
      </div>
    </footer>
  )
}

/* ---------------------------------- shell --------------------------------- */

function ViewRouter() {
  const { view } = useNav()

  const View = React.useMemo(() => {
    switch (view) {
      case "models":
        return React.lazy(() => import("@/components/syria/views/models"))
      case "experiments":
        return React.lazy(() => import("@/components/syria/views/experiments"))
      case "datasets":
        return React.lazy(() => import("@/components/syria/views/datasets"))
      case "benchmarks":
        return React.lazy(() => import("@/components/syria/views/benchmarks"))
      case "inference":
        return React.lazy(() => import("@/components/syria/views/inference"))
      case "api":
        return React.lazy(() => import("@/components/syria/views/api"))
      case "developers":
        return React.lazy(() => import("@/components/syria/views/developers"))
      case "admin":
        return React.lazy(() => import("@/components/syria/views/admin"))
      case "chat":
        return React.lazy(() => import("@/components/syria/views/chat"))
      case "research":
        return React.lazy(() => import("@/components/syria/views/research"))
      case "dashboard":
      default:
        return React.lazy(() => import("@/components/syria/views/dashboard"))
    }
  }, [view])

  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Activity className="me-2 h-4 w-4 animate-pulse" />
        </div>
      }
    >
      <div key={view} className="fade-up">
        <View />
      </div>
    </React.Suspense>
  )
}

export function AppShell() {
  const { t } = useI18n()
  const { demoMode } = useDemoMode()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  React.useEffect(() => {
    // close mobile sheet on Escape
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      {/* demo-mode fixed banner (ON only) */}
      {demoMode && (
        <div
          role="status"
          className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-amber-400 px-4 py-2 text-center text-[11px] font-extrabold text-amber-950 md:text-xs"
        >
          <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
          <span>{t("demo.banner")}</span>
        </div>
      )}
      {demoMode && <div className="h-9 shrink-0" aria-hidden />}

      <div className="flex flex-1">
        {/* desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 border-e border-sidebar-border lg:block" aria-label={t("nav.menu")}>
          <SidebarInner />
        </aside>

        {/* mobile sidebar */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="right"
            className="w-[280px] border-sidebar-border bg-sidebar p-0 [&>button]:hidden"
            dir="rtl"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>{t("nav.menu")}</SheetTitle>
            </SheetHeader>
            <SidebarInner onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenMenu={() => setMobileOpen(true)} />
          <main id="main" className="min-h-0 flex-1 px-3 pb-6 pt-4 md:px-5 md:pt-5">
            <ViewRouter />
          </main>
          <FooterStatusBar />
        </div>
      </div>
    </div>
  )
}
