import { NextRequest, NextResponse } from "next/server"
import { neuralFetch } from "@/lib/neural-service"

export const dynamic = "force-dynamic"

/**
 * REAL neural inference passthrough (playground, non-streaming).
 * Forwards to the independent Python inference service which runs our own
 * trained weights. No rule engine, no canned text, no external models.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      prompt?: string
      params?: { temperature?: number; topP?: number; topK?: number; maxTokens?: number }
      seed?: number
    }
    const prompt = body.prompt?.trim()
    if (!prompt) return NextResponse.json({ ok: false, error: "prompt is required" }, { status: 400 })

    const payload = {
      prompt,
      max_new_tokens: Math.min(256, Math.max(1, Math.round(body.params?.maxTokens ?? 64))),
      temperature: body.params?.temperature ?? 0.9,
      top_k: body.params?.topK ?? 40,
      top_p: body.params?.topP ?? 0.95,
      seed: body.seed ?? null,
    }

    const upstream = await neuralFetch<{
      ok?: boolean
      model_id?: string
      engine?: string
      text?: string
      prompt_tokens?: number
      output_tokens?: number
      elapsed_ms?: number
      tokens_per_sec?: number
      checkpoint_step?: number
      device?: string
      detail?: { error?: string; message?: string }
    }>("/v1/generate", {
      method: "POST",
      body: payload, // neuralFetch serializes objects — do NOT pre-stringify
    }, 90_000)

    if (!upstream || !upstream.text) {
      const detail = upstream?.detail
      return NextResponse.json(
        {
          ok: false,
          error: detail?.error ?? "MODEL_NOT_READY",
          message:
            detail?.message ??
            "خدمة الاستدلال العصبي غير متاحة — لا توليد وهمي",
        },
        { status: 503 },
      )
    }

    return NextResponse.json({
      ok: true,
      data: {
        model: upstream.model_id,
        engine: upstream.engine ?? "syria-ai-neural-inference",
        engineVersion: "neural-0.2.0",
        demo: false,
        neural: true,
        weightsLoaded: true,
        dataClass: "REAL",
        checkpointStep: upstream.checkpoint_step,
        device: upstream.device,
        text: upstream.text,
        metrics: {
          latencyMs: upstream.elapsed_ms,
          tokensPerSecond: upstream.tokens_per_sec,
          completionTokens: upstream.output_tokens,
          promptTokens: upstream.prompt_tokens,
        },
      },
    })
  } catch (e) {
    console.error("POST /api/neural/generate", e)
    return NextResponse.json({ ok: false, error: "Neural inference failure" }, { status: 500 })
  }
}
