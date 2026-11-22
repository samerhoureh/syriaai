import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { applySampling, chunkReply, detectLang, ENGINE_ID, ENGINE_VERSION, generateReply } from "@/lib/demo-engine"

export const dynamic = "force-dynamic"

/* Streaming chat endpoint backed by the local demo engine (no external LLM). */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      sessionId?: string
      message?: string
      model?: string
      params?: { temperature?: number; topP?: number; topK?: number; maxTokens?: number }
    }
    const message = body.message?.trim()
    if (!message) {
      return new Response(JSON.stringify({ ok: false, error: "message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    let sessionId = body.sessionId
    if (!sessionId) {
      const session = await db.chatSession.create({
        data: { title: message.slice(0, 32) || "محادثة جديدة", model: body.model || "syria-ai-nano" },
      })
      sessionId = session.id
    }

    await db.chatMessage.create({ data: { sessionId, role: "user", content: message } })
    await db.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } })

    const lang = detectLang(message)
    const raw = generateReply(message)
    const params = {
      temperature: body.params?.temperature ?? 0.8,
      topP: body.params?.topP ?? 0.95,
      topK: body.params?.topK ?? 50,
      maxTokens: body.params?.maxTokens ?? 512,
    }
    const reply = applySampling(raw, params)
    const chunks = chunkReply(reply)
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
        send({ sessionId, engine: ENGINE_ID, engineVersion: ENGINE_VERSION, demo: true })
        // simulate token-by-token streaming
        for (const chunk of chunks) {
          await new Promise((r) => setTimeout(r, 45 + Math.random() * 70))
          send({ delta: chunk })
        }
        const full = reply
        const created = await db.chatMessage.create({
          data: { sessionId: sessionId!, role: "assistant", content: full },
        })
        send({ done: true, messageId: created.id, sessionId, usage: { promptTokens: Math.ceil(message.length / 4), completionTokens: Math.ceil(full.length / 4) } })
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
  } catch (e) {
    console.error("POST /api/chat", e)
    return new Response(JSON.stringify({ ok: false, error: "Chat engine failure" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
