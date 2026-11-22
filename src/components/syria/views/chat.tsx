"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import ReactMarkdown from "react-markdown"
import {
  ArrowUp, Copy, MessageSquarePlus, MessagesSquare, SendHorizontal, Square, Trash2, TriangleAlert,
} from "lucide-react"
import { useI18n } from "@/components/syria/language-provider"
import { apiGet, apiPost, apiDelete } from "@/lib/api"
import { useChatEngine } from "@/lib/store"
import type { ChatMessageInfo, ChatSessionInfo } from "@/lib/types"
import { ViewHeader, DemoChip } from "@/components/syria/ui-bits"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

interface StreamEvent {
  sessionId?: string
  delta?: string
  done?: boolean
  demo?: boolean
  /* neural engine fields */
  engine?: string
  neural?: boolean
  modelReady?: boolean
  modelId?: string
  checkpointStep?: number | null
  start?: boolean
  promptTokens?: number | null
  tokenId?: number | null
  messageId?: string
  text?: string
  usage?: {
    promptTokens?: number | null
    completionTokens?: number | null
    elapsedMs?: number | null
    tokensPerSec?: number | null
  }
  error?: string
  messageAr?: string | null
  messageEn?: string | null
  cancelled?: boolean
}

type EngineKind = "neural" | "demo"

type MsgMeta = { kind: EngineKind; tokensPerSec?: number | null }

const NEURAL_NOT_READY_AR = "النموذج العصبي غير جاهز بعد (MODEL_NOT_READY)"

export default function ChatView() {
  const { t, lang, isAr } = useI18n()
  const qc = useQueryClient()
  const { engine, setEngine } = useChatEngine()

  const sessionsQ = useQuery({
    queryKey: ["chatSessions"],
    queryFn: () => apiGet<(ChatSessionInfo & { messages: ChatMessageInfo[] })[]>("/api/chat/sessions"),
  })

  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<ChatMessageInfo[]>([])
  const [msgMeta, setMsgMeta] = React.useState<Record<string, MsgMeta>>({})
  const [neuralError, setNeuralError] = React.useState<string | null>(null)
  const [input, setInput] = React.useState("")
  const [streaming, setStreaming] = React.useState(false)
  const [streamText, setStreamText] = React.useState("")
  const abortRef = React.useRef<AbortController | null>(null)
  const scrollRef = React.useRef<HTMLDivElement | null>(null)

  // default to first session
  React.useEffect(() => {
    if (!activeId && sessionsQ.data?.length) {
      setActiveId(sessionsQ.data[0].id)
    }
  }, [sessionsQ.data, activeId])

  // load messages when active session changes
  React.useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }
    const s = sessionsQ.data?.find((x) => x.id === activeId)
    setMessages(s?.messages ?? [])
     
  }, [activeId, sessionsQ.data])

  // autoscroll
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages.length, streamText])

  const send = async () => {
    const text = input.trim()
    if (!text || streaming) return
    setInput("")
    setStreaming(true)
    setStreamText("")
    setNeuralError(null)

    // optimistic user message
    const optimistic: ChatMessageInfo = {
      id: `tmp-${Date.now()}`,
      sessionId: activeId ?? "",
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    }
    setMessages((m) => [...m, optimistic])

    const controller = new AbortController()
    abortRef.current = controller
    let acc = ""
    let sid = activeId
    let kind: EngineKind = engine

    const isNeural = engine === "neural"
    const endpoint = isNeural ? "/api/neural/chat" : "/api/chat"
    const payload = isNeural
      ? {
          sessionId: sid,
          message: text,
          params: { temperature: 0.9, topP: 0.95, topK: 40, maxTokens: 64 },
        }
      : { sessionId: sid, message: text }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ""

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split("\n\n")
        buf = lines.pop() ?? ""
        for (const line of lines) {
          if (!line.startsWith("data:")) continue
          const raw = line.slice(5).trim()
          if (raw === "[DONE]") continue
          try {
            const evt = JSON.parse(raw) as StreamEvent
            if (evt.sessionId && !sid) {
              sid = evt.sessionId
              setActiveId(sid)
            }
            if (evt.neural === true || evt.demo === true) {
              kind = evt.neural === true && evt.demo !== true ? "neural" : "demo"
            }
            if (evt.delta) {
              acc += evt.delta
              setStreamText(acc)
            }
            if (evt.done) {
              const isError = !!evt.error
              if (isError) {
                // honest state — no fabricated text
                setNeuralError(evt.error ?? "MODEL_NOT_READY")
                const honestText = `**${evt.messageAr ?? NEURAL_NOT_READY_AR}**\n\n${evt.messageEn ?? "Neural model not ready"}`
                const id = evt.messageId ?? `a-${Date.now()}`
                setMessages((m) => [
                  ...m,
                  { id, sessionId: sid ?? "", role: "assistant", content: honestText, createdAt: new Date().toISOString() },
                ])
                setMsgMeta((prev) => ({ ...prev, [id]: { kind: "neural", tokensPerSec: null } }))
              } else {
                const finalText = evt.text && evt.text.length > 0 ? evt.text : acc
                const id = evt.messageId ?? `a-${Date.now()}`
                setMessages((m) => [
                  ...m,
                  { id, sessionId: sid ?? "", role: "assistant", content: finalText || acc, createdAt: new Date().toISOString() },
                ])
                setMsgMeta((prev) => ({
                  ...prev,
                  [id]: { kind, tokensPerSec: evt.usage?.tokensPerSec ?? null },
                }))
              }
              setStreamText("")
            }
          } catch {
            /* partial line */
          }
        }
      }
      qc.invalidateQueries({ queryKey: ["chatSessions"] })
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast({ title: t("chat.streamError"), description: String(e instanceof Error ? e.message : e) })
      }
      if (acc) {
        const id = `a-${Date.now()}`
        setMessages((m) => [
          ...m,
          { id, sessionId: sid ?? "", role: "assistant", content: acc + "\n\n_[...مقطوع]_", createdAt: new Date().toISOString() },
        ])
        setMsgMeta((prev) => ({ ...prev, [id]: { kind, tokensPerSec: null } }))
        setStreamText("")
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  const stop = () => {
    abortRef.current?.abort()
  }

  const newChat = async () => {
    try {
      const s = await apiPost<ChatSessionInfo>("/api/chat/sessions", {})
      qc.invalidateQueries({ queryKey: ["chatSessions"] })
      setActiveId(s.id)
      setMessages([])
    } catch (e) {
      toast({ title: t("c.error"), description: String(e instanceof Error ? e.message : e) })
    }
  }

  const deleteSession = async (id: string) => {
    try {
      await apiDelete(`/api/chat/sessions/${id}`)
      qc.invalidateQueries({ queryKey: ["chatSessions"] })
      if (activeId === id) {
        setActiveId(null)
        setMessages([])
      }
      toast({ title: t("chat.deleted") })
    } catch (e) {
      toast({ title: t("c.error"), description: String(e instanceof Error ? e.message : e) })
    }
  }

  const Md = ({ children }: { children: string }) => (
    <ReactMarkdown
      components={{
        pre: (props) => (
          <pre
            {...props}
            className="sy-code my-2 overflow-x-auto rounded-lg border border-line bg-panel-2 p-3 scrollbar-sy"
          />
        ),
        code: (props) => {
          const { className, children } = props
          const inline = !className?.includes("language-")
          return inline ? (
            <code className="rounded bg-panel-2 px-1.5 py-0.5 font-mono text-[0.8em]" dir="ltr">
              {children}
            </code>
          ) : (
            <code className={className}>{children}</code>
          )
        },
        p: (props) => <p {...props} className="my-1.5 leading-7" />,
        ul: (props) => <ul {...props} className="my-2 list-disc space-y-1 ps-5" />,
        li: (props) => <li {...props} className="leading-6" />,
        strong: (props) => <strong {...props} className="font-extrabold text-primary" />,
        a: (props) => <a {...props} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4" />,
      }}
    >
      {children}
    </ReactMarkdown>
  )

  return (
    <div className="space-y-4">
      <ViewHeader
        title={t("chat.title")}
        subtitle={t("chat.subtitle")}
        icon={<MessagesSquare className="h-5 w-5" />}
        actions={<DemoChip label={t("chat.demoBadge")} />}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
        {/* sessions */}
        <aside className="rounded-xl border border-line bg-panel" aria-label={t("chat.sessions")}>
          <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
            <span className="text-xs font-bold">{t("chat.sessions")}</span>
            <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-[11px]" onClick={newChat}>
              <MessageSquarePlus className="h-3.5 w-3.5" /> {t("chat.new")}
            </Button>
          </div>
          <div className="max-h-[420px] overflow-y-auto scrollbar-sy p-2">
            {sessionsQ.isLoading ? (
              <div className="space-y-2 p-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : !sessionsQ.data?.length ? (
              <p className="px-3 py-8 text-center text-[11px] leading-relaxed text-muted-foreground">{t("chat.noSessions")}</p>
            ) : (
              sessionsQ.data.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    "group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 transition",
                    activeId === s.id ? "bg-primary/12 text-primary" : "hover:bg-accent"
                  )}
                  onClick={() => setActiveId(s.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setActiveId(s.id)}
                >
                  <span className="min-w-0 flex-1 truncate text-[12px] font-semibold" dir="auto">
                    {s.title}
                  </span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                        aria-label={t("chat.delete")}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-3.5 w-3.5" style={{ color: "var(--chart-5)" }} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="border-line bg-popover">
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("chat.delete")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("chat.deleteConfirm")}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={(e) => e.stopPropagation()}>{t("c.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteSession(s.id)
                          }}
                        >
                          {t("c.delete")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* chat area */}
        <section className="flex min-h-[520px] flex-col rounded-xl border border-line bg-panel panel-glow">
          <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
            <span className="text-xs font-bold text-primary">{t("chat.modelInfo")}</span>
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold"
              style={
                engine === "neural"
                  ? {
                      color: "var(--chart-1)",
                      borderColor: "color-mix(in oklab, var(--chart-1) 40%, transparent)",
                      background: "color-mix(in oklab, var(--chart-1) 10%, transparent)",
                    }
                  : {
                      color: "var(--chart-4)",
                      borderColor: "color-mix(in oklab, var(--chart-4) 40%, transparent)",
                      background: "color-mix(in oklab, var(--chart-4) 10%, transparent)",
                    }
              }
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: engine === "neural" ? "var(--chart-1)" : "var(--chart-4)" }} />
              {engine === "neural" ? t("chat.neural.chip") : t("chat.demo.chip")}
            </span>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto scrollbar-sy p-4" style={{ maxHeight: 480 }}>
            {neuralError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[12px] font-semibold"
                style={{
                  color: "var(--chart-4)",
                  borderColor: "color-mix(in oklab, var(--chart-4) 45%, transparent)",
                  background: "color-mix(in oklab, var(--chart-4) 10%, transparent)",
                }}
              >
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{t("chat.neural.notReady")}</span>
              </div>
            )}
            {messages.length === 0 && !streamText ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
                <MessagesSquare className="h-10 w-10 text-primary/60" />
                <p className="text-sm font-bold">{t("chat.welcome")}</p>
                <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{t("chat.emptyHint")}</p>
              </div>
            ) : (
              <>
                {messages.map((m) => (
                  <div key={m.id} className={cn("flex gap-2.5", m.role === "user" ? "justify-end" : "justify-start")}>
                    {m.role === "assistant" && (
                      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                        <MessagesSquare className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <div
                      className={cn(
                        "group relative max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-7",
                        m.role === "user"
                          ? "rounded-ee-sm bg-primary text-primary-foreground"
                          : "rounded-es-sm border border-line bg-panel-2"
                      )}
                      dir={m.role === "assistant" ? "auto" : undefined}
                    >
                      {m.role === "user" ? <p className="whitespace-pre-wrap">{m.content}</p> : <Md>{m.content}</Md>}
                      {m.role === "assistant" && msgMeta[m.id] && (
                        <span
                          className="mt-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold"
                          style={
                            msgMeta[m.id].kind === "neural"
                              ? {
                                  color: "var(--chart-1)",
                                  borderColor: "color-mix(in oklab, var(--chart-1) 40%, transparent)",
                                  background: "color-mix(in oklab, var(--chart-1) 10%, transparent)",
                                }
                              : {
                                  color: "var(--chart-4)",
                                  borderColor: "color-mix(in oklab, var(--chart-4) 40%, transparent)",
                                  background: "color-mix(in oklab, var(--chart-4) 10%, transparent)",
                                }
                          }
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: msgMeta[m.id].kind === "neural" ? "var(--chart-1)" : "var(--chart-4)" }}
                          />
                          {msgMeta[m.id].kind === "neural" ? (
                            <>
                              {t("chat.neural.chip")}
                              {msgMeta[m.id].tokensPerSec ? (
                                <span className="num">· {msgMeta[m.id].tokensPerSec!.toFixed(1)} tok/s</span>
                              ) : null}
                            </>
                          ) : (
                            t("chat.demo.chip")
                          )}
                        </span>
                      )}
                      {m.role === "assistant" && (
                        <button
                          onClick={async () => {
                            await navigator.clipboard.writeText(m.content).catch(() => {})
                            toast({ title: t("chat.copied") })
                          }}
                          className="absolute end-2 top-1.5 rounded p-1 text-muted-foreground opacity-0 transition hover:text-foreground group-hover:opacity-100"
                          aria-label={t("chat.copyMsg")}
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {streamText && (
                  <div className="flex gap-2.5 justify-start">
                    <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                      <MessagesSquare className="h-3.5 w-3.5" />
                    </span>
                    <div className="max-w-[85%] rounded-2xl rounded-es-sm border border-line bg-panel-2 px-4 py-2.5 text-[13px]" dir="auto">
                      <Md>{streamText}</Md>
                      <span className="ms-0.5 inline-block h-4 w-2 animate-pulse bg-primary align-middle" aria-hidden />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* engine selector + composer */}
          <div className="border-t border-line p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div
                className="flex items-center rounded-lg border border-line bg-panel-2 p-0.5"
                role="group"
                aria-label={t("chat.engine.label")}
              >
                <button
                  onClick={() => {
                    setEngine("neural")
                    setNeuralError(null)
                  }}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-[11px] font-bold transition",
                    engine === "neural" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  style={engine === "neural" ? { background: "var(--chart-1)" } : undefined}
                  aria-pressed={engine === "neural"}
                >
                  {t("chat.engine.neural")}
                </button>
                <button
                  onClick={() => {
                    setEngine("demo")
                    setNeuralError(null)
                  }}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-[11px] font-bold transition",
                    engine === "demo" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  style={engine === "demo" ? { background: "var(--chart-4)" } : undefined}
                  aria-pressed={engine === "demo"}
                >
                  {t("chat.engine.demo")}
                </button>
              </div>
              <span className="text-[10px] leading-tight text-muted-foreground/80">
                {engine === "neural" ? t("chat.neural.hint") : t("chat.demo.hint")}
              </span>
            </div>
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("chat.placeholder")}
                className="min-h-11 flex-1 resize-none border-line bg-panel-2 py-2.5"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                aria-label={t("chat.placeholder")}
              />
              {streaming ? (
                <Button variant="destructive" size="icon" className="h-11 w-11 shrink-0" onClick={stop} aria-label={t("chat.stop")}>
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button size="icon" className="h-11 w-11 shrink-0" onClick={send} disabled={!input.trim()} aria-label={t("chat.send")}>
                  <SendHorizontal className={cn("h-4 w-4", isAr ? "-scale-x-100" : "")} />
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
