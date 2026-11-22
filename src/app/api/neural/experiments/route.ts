import { NextResponse } from "next/server"
import { neuralFetch } from "@/lib/neural-service"
import type { DataSource } from "@/lib/types"

export const dynamic = "force-dynamic"

/* GET /api/neural/experiments — REAL experiments (metrics.json derived, e.g. EXP-001). */
export async function GET() {
  try {
    const experiments = await neuralFetch<unknown[]>("/v1/experiments", undefined, 10000)
    if (!experiments || !Array.isArray(experiments)) {
      return NextResponse.json({ ok: true, data: { source: "UNAVAILABLE" satisfies DataSource, experiments: [] } })
    }
    return NextResponse.json({ ok: true, data: { source: "REAL" satisfies DataSource, experiments } })
  } catch (e) {
    console.error("GET /api/neural/experiments", e)
    return NextResponse.json({ ok: false, error: "neural experiments failure" }, { status: 500 })
  }
}
