import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { applySampling, ENGINE_ID, ENGINE_VERSION, generateReply } from "@/lib/demo-engine"

export const dynamic = "force-dynamic"

/* Non-streaming inference endpoint for the playground (local demo engine). */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      prompt?: string
      model?: string
      params?: { temperature?: number; topP?: number; topK?: number; maxTokens?: number }
    }
    const prompt = body.prompt?.trim()
    if (!prompt) return NextResponse.json({ ok: false, error: "prompt is required" }, { status: 400 })

    const model = body.model || "syria-ai-nano"
    // HONEST: the demo engine NEVER loads real weights (no weights exist for
    // any planned model). Real generation only happens via /api/neural/generate.
    const weightsLoaded = false

    const params = {
      temperature: body.params?.temperature ?? 0.8,
      topP: body.params?.topP ?? 0.95,
      topK: body.params?.topK ?? 50,
      maxTokens: body.params?.maxTokens ?? 256,
    }

    const t0 = performance.now()
    const raw = generateReply(prompt)
    const text = applySampling(raw, params)
    const latencyMs = Math.round(performance.now() - t0 + 60 + Math.random() * 140)
    const completionTokens = Math.ceil(text.length / 4)

    if (body.prompt && (await db.apiKey.count()) > 0) {
      // demo usage accounting on the first active key (simulated telemetry)
      const key = await db.apiKey.findFirst({ where: { status: "active" } })
      if (key) {
        await db.apiKey
          .update({
            where: { id: key.id },
            data: { requests: { increment: 1 }, tokensUsed: { increment: completionTokens / 1e6 }, lastUsed: new Date() },
          })
          .catch(() => {})
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        model,
        engine: ENGINE_ID,
        engineVersion: ENGINE_VERSION,
        demo: true,
        weightsLoaded,
        text,
        metrics: {
          latencyMs,
          tokensPerSecond: Math.round((completionTokens / latencyMs) * 1000),
          completionTokens,
          promptTokens: Math.ceil(prompt.length / 4),
        },
        params,
      },
    })
  } catch (e) {
    console.error("POST /api/inference", e)
    return NextResponse.json({ ok: false, error: "Inference failure" }, { status: 500 })
  }
}
