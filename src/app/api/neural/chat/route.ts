import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { neuralRawFetch, neuralModelState } from "@/lib/neural-service"

export const dynamic = "force-dynamic"

const MODEL_NOT_READY_AR = "النموذج العصبي غير جاهز بعد — لا توجد أوزان محملة"
const MODEL_NOT_READY_EN = "Neural model not ready — no weights loaded"

interface NeuralStreamEvent {
  type?: string
  request_id?: string
  prompt_tokens?: number
  model_id?: string
  token_id?: number
  piece?: string
  text?: string
  output_tokens?: number
  elapsed_ms?: number
  tokens_per_sec?: number
  error?: string
  message?: string
}

/* Streaming chat endpoint backed by the REAL neural engine (syria-ai-core).
 * Never fabricates a reply: when the model is not ready the stream reports the
 * honest MODEL_NOT_READY state. */
export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()

  try {
    const body = (await req.json()) as {
      sessionId?: string
      message?: string
      model?: string
      params?: { temperature?: number; topP?: number; topK?: number; maxTokens?: number }
      seed?: number
    }
    const message = body.message?.trim()
    if (!message) {
      return new Response(JSON.stringify({ ok: false, error: "message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    /* Same persistence flow as /api/chat: session + user message */
    let sessionId = body.sessionId
    if (!sessionId) {
      const session = await db.chatSession.create({
        data: { title: message.slice(0, 32) || "محادثة جديدة", model: body.model || "syria-ai-debug" },
      })
      sessionId = session.id
    }
    await db.chatMessage.create({ data: { sessionId, role: "user", content: message } })
    await db.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } })

    const params = {
      temperature: Math.min(2, Math.max(0, body.params?.temperature ?? 0.9)),
      topP: Math.min(1, Math.max(0.05, body.params?.topP ?? 0.95)),
      topK: Math.max(1, body.params?.topK ?? 40),
      maxTokens: Math.min(256, Math.max(1, body.params?.maxTokens ?? 64)),
    }

    /* Probe / auto-start the neural service */
    const state = await neuralModelState()

    /* Honest unavailable stream — no fabricated text */
    const notReady = (reason: string) => {
      const sid = sessionId!
      const stream = new ReadableStream({
        async start(controller) {
          const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
          send({ sessionId: sid, engine: "syria-neural", neural: true, modelReady: false, error: reason })
          send({ delta: "" })
          const honestText = `**${MODEL_NOT_READY_AR}**\n\n${MODEL_NOT_READY_EN}\n\n_(code: ${reason})_`
          const created = await db.chatMessage.create({
            data: { sessionId: sid, role: "assistant", content: honestText },
          })
          send({ done: true, messageId: created.id, sessionId: sid, error: reason, messageAr: MODEL_NOT_READY_AR, messageEn: MODEL_NOT_READY_EN })
          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
        },
      })
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      })
    }

    if (!state.ready || !state.model) {
      return notReady("MODEL_NOT_READY")
    }

    /* Proxy the real neural SSE stream */
    const upstreamAbort = new AbortController()
    let requestId: string | null = null
    const onClientAbort = () => {
      upstreamAbort.abort()
      if (requestId) {
        void neuralRawFetch("/v1/generate/cancel", { method: "POST", body: { request_id: requestId } }, 3000).catch(() => {})
      }
    }
    if (req.signal.aborted) onClientAbort()
    else req.signal.addEventListener("abort", onClientAbort, { once: true })

    const upRes = await neuralRawFetch(
      "/v1/generate/stream",
      {
        method: "POST",
        body: {
          prompt: message,
          max_new_tokens: params.maxTokens,
          temperature: params.temperature,
          top_k: params.topK,
          top_p: params.topP,
          seed: body.seed ?? null,
        },
        signal: upstreamAbort.signal,
      },
      30000
    ).catch(() => null)

    if (!upRes || !upRes.ok || !upRes.body) {
      req.signal.removeEventListener("abort", onClientAbort)
      return notReady("MODEL_NOT_READY")
    }

    const model = state.model
    const sid = sessionId!
    let closed = false

    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) => {
          if (closed) return
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
        }
        /* first event — honest engine metadata */
        send({
          sessionId: sid,
          engine: "syria-ai-neural-inference",
          neural: true,
          modelReady: true,
          modelId: model.model_id ?? "syria-ai-debug",
          checkpointStep: model.checkpoint_step ?? null,
          demo: false,
        })
        send({ delta: "" })

        const reader = upRes.body!.getReader()
        const decoder = new TextDecoder()
        let buf = ""

        const handleEvent = async (evt: NeuralStreamEvent) => {
          if (evt.request_id && !requestId) requestId = evt.request_id
          switch (evt.type) {
            case "start":
              send({ start: true, promptTokens: evt.prompt_tokens ?? null, modelId: evt.model_id ?? null })
              break
            case "token":
              if (evt.piece !== undefined) send({ delta: evt.piece, tokenId: evt.token_id ?? null })
              break
            case "done": {
              const full = evt.text ?? ""
              const created = await db.chatMessage.create({
                data: { sessionId: sid, role: "assistant", content: full },
              })
              send({
                done: true,
                messageId: created.id,
                sessionId: sid,
                text: full,
                usage: {
                  promptTokens: null,
                  completionTokens: evt.output_tokens ?? null,
                  elapsedMs: evt.elapsed_ms ?? null,
                  tokensPerSec: evt.tokens_per_sec ?? null,
                },
              })
              break
            }
            case "cancelled":
              send({ done: true, sessionId: sid, cancelled: true })
              break
            case "error":
              send({ done: true, error: evt.error ?? "ENGINE_ERROR", messageAr: evt.message ?? null })
              break
            default:
              break
          }
        }

        try {
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            buf += decoder.decode(value, { stream: true })
            const parts = buf.split("\n\n")
            buf = parts.pop() ?? ""
            for (const part of parts) {
              const line = part.trim()
              if (!line.startsWith("data:")) continue
              const payload = line.slice(5).trim()
              if (payload === "[DONE]") continue
              try {
                await handleEvent(JSON.parse(payload) as NeuralStreamEvent)
              } catch {
                /* partial line — ignore */
              }
            }
          }
        } catch {
          /* upstream aborted or network error — report honestly */
          send({ done: true, error: "STREAM_INTERRUPTED" })
        } finally {
          req.signal.removeEventListener("abort", onClientAbort)
          if (!closed) {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"))
            controller.close()
            closed = true
          }
        }
      },
      cancel() {
        closed = true
        onClientAbort()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    })
  } catch (e) {
    console.error("POST /api/neural/chat", e)
    return new Response(JSON.stringify({ ok: false, error: "Neural chat failure" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
