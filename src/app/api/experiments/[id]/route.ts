import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const exp = await db.experiment.findUnique({
      where: { id },
      include: { lossPoints: { orderBy: { step: "asc" } } },
    })
    if (!exp) return NextResponse.json({ ok: false, error: "Experiment not found" }, { status: 404 })
    return NextResponse.json({ ok: true, data: exp })
  } catch (e) {
    console.error("GET /api/experiments/[id]", e)
    return NextResponse.json({ ok: false, error: "Failed to load experiment" }, { status: 500 })
  }
}

const ACTIONS: Record<string, string> = {
  start: "running",
  resume: "running",
  pause: "paused",
  stop: "stopped",
  complete: "completed",
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = (await req.json()) as { action?: string }
    const exp = await db.experiment.findUnique({ where: { id } })
    if (!exp) return NextResponse.json({ ok: false, error: "Experiment not found" }, { status: 404 })

    const next = body.action ? ACTIONS[body.action] : undefined
    if (!next) return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 })

    const updated = await db.experiment.update({
      where: { id },
      data: {
        status: next,
        finishedAt: next === "stopped" || next === "completed" ? new Date() : exp.finishedAt,
      },
    })

    await db.activityLog.create({
      data: {
        kind: "training",
        messageAr: `${exp.expId}: تغيير حالة التجربة إلى ${next}`,
        messageEn: `${exp.expId}: experiment state changed to ${next}`,
        level: next === "running" ? "success" : "warn",
      },
    })

    return NextResponse.json({ ok: true, data: updated })
  } catch (e) {
    console.error("PATCH /api/experiments/[id]", e)
    return NextResponse.json({ ok: false, error: "Failed to update experiment" }, { status: 500 })
  }
}
