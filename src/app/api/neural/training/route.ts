import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { neuralFetch } from "@/lib/neural-service"
import type { DataSource } from "@/lib/types"

export const dynamic = "force-dynamic"

interface TrainingStartResult {
  ok?: boolean
  pid?: number
  exp_id?: string
  command?: string
  detail?: { error?: string; message?: string }
}

interface TrainingStopResult {
  ok?: boolean
  status?: string
}

/* GET /api/neural/training — REAL training process status. */
export async function GET() {
  try {
    const status = await neuralFetch<Record<string, unknown>>("/v1/training/status", undefined, 10000)
    if (!status) {
      return NextResponse.json({ ok: true, data: { source: "UNAVAILABLE" satisfies DataSource, running: false, pid: null } })
    }
    return NextResponse.json({ ok: true, data: { source: "REAL" satisfies DataSource, ...status } })
  } catch (e) {
    console.error("GET /api/neural/training", e)
    return NextResponse.json({ ok: false, error: "neural training status failure" }, { status: 500 })
  }
}

/* POST /api/neural/training — start / stop the REAL training process. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      action?: "start" | "stop"
      steps?: number
      batch?: number
      lr?: number
      seed?: number
    }
    const action = body.action ?? "start"

    if (action === "stop") {
      const res = await neuralFetch<TrainingStopResult>("/v1/training/stop", { method: "POST", body: {} }, 60000)
      if (!res) {
        return NextResponse.json({ ok: true, data: { source: "UNAVAILABLE" satisfies DataSource, ok: false, status: "service_unavailable" } })
      }
      if (res.ok) {
        await db.activityLog.create({
          data: {
            kind: "training",
            messageAr: "تم إيقاف التدريب الحقيقي بأمان (إشارة SIGTERM)",
            messageEn: "Real training stopped safely (SIGTERM)",
            level: "warn",
            source: "REAL",
          },
        })
      }
      return NextResponse.json({ ok: true, data: { source: "REAL" satisfies DataSource, ...res } })
    }

    // action === "start"
    const payload = {
      steps: Math.min(20000, Math.max(50, Number(body.steps) || 1200)),
      vocab_size: 4096,
      batch_size: Math.min(64, Math.max(1, Number(body.batch) || 8)),
      lr: Number(body.lr) || 0.003,
      seed: Number(body.seed) || 42,
      notes: "Started from the SYRIA AI platform Training Studio",
    }
    const res = await neuralFetch<TrainingStartResult>("/v1/training/start", { method: "POST", body: payload }, 15000)
    if (!res) {
      return NextResponse.json({ ok: true, data: { source: "UNAVAILABLE" satisfies DataSource, ok: false, error: "SERVICE_UNAVAILABLE" } })
    }
    if (res.detail?.error === "TRAINING_ALREADY_RUNNING") {
      return NextResponse.json({
        ok: true,
        data: { source: "REAL" satisfies DataSource, ok: false, error: "TRAINING_ALREADY_RUNNING", detail: res.detail },
      })
    }
    if (res.ok) {
      await db.activityLog.create({
        data: {
          kind: "training",
          messageAr: `تم بدء تدريب حقيقي ${res.exp_id ?? "EXP-001"} — ${payload.steps} خطوة على المعالج (بدون GPU)`,
          messageEn: `Real training started ${res.exp_id ?? "EXP-001"} — ${payload.steps} steps on CPU`,
          level: "info",
          source: "REAL",
        },
      })
    }
    return NextResponse.json({ ok: true, data: { source: "REAL" satisfies DataSource, ...res } })
  } catch (e) {
    console.error("POST /api/neural/training", e)
    return NextResponse.json({ ok: false, error: "neural training control failure" }, { status: 500 })
  }
}
