import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const rows = await db.experiment.findMany({ orderBy: { startedAt: "desc" } })
    // No synthetic drift: rows are returned as stored (static demo values).
    return NextResponse.json({ ok: true, data: rows })
  } catch (e) {
    console.error("GET /api/experiments", e)
    return NextResponse.json({ ok: false, error: "Failed to load experiments" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      titleAr?: string
      modelId?: string
      totalSteps?: number
      learningRate?: number
      batchSize?: number
      seqLen?: number
    }
    if (!body.modelId) {
      return NextResponse.json({ ok: false, error: "modelId is required" }, { status: 400 })
    }
    const model = await db.aiModel.findUnique({ where: { modelId: body.modelId } })
    if (!model) {
      return NextResponse.json({ ok: false, error: "Unknown model" }, { status: 404 })
    }
    const count = await db.experiment.count()
    const nextNum = count + 25 // EXP-025 onwards (seed uses 020..024)
    const expId = `EXP-${String(nextNum).padStart(3, "0")}`
    const created = await db.experiment.create({
      data: {
        expId,
        title: `New ${model.name} experiment`,
        titleAr: body.titleAr?.trim() || `تجربة جديدة على ${model.name}`,
        modelName: `${model.name.replace("SYRIA AI ", "")} (${model.params})`,
        modelId: model.modelId,
        status: "queued",
        progress: 0,
        steps: 0,
        totalSteps: Math.min(2_000_000, Math.max(1000, Number(body.totalSteps) || 100_000)),
        tokensB: 0,
        tokensTargetB: Number(((Number(body.totalSteps) || 100_000) * (Number(body.seqLen) || 2048) * (Number(body.batchSize) || 64)) / 1e9),
        speedTokSec: model.paramsNum >= 1000 ? 21000 : 38000,
        elapsedWeeks: 0,
        remainingDays: 21,
        architecture: "decoder-only-baseline",
        optimizer: "AdamW",
        learningRate: Number(body.learningRate) || 0.0006,
        batchSize: Number(body.batchSize) || 64,
        seqLen: Number(body.seqLen) || 2048,
        warmupSteps: 2000,
        weightDecay: 0.1,
        precision: "bf16",
        seed: 20250201,
        notes: "Created from the Training Studio console.",
        startedAt: new Date(),
        source: "DEMO",
      },
    })
    await db.activityLog.create({
      data: {
        kind: "training",
        messageAr: `تم إنشاء التجربة ${expId} على ${model.name} (في الانتظار)`,
        messageEn: `Experiment ${expId} created on ${model.name} (queued)`,
        level: "info",
      },
    })
    return NextResponse.json({ ok: true, data: created })
  } catch (e) {
    console.error("POST /api/experiments", e)
    return NextResponse.json({ ok: false, error: "Failed to create experiment" }, { status: 500 })
  }
}
