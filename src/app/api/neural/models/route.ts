import { NextResponse } from "next/server"
import { neuralFetch } from "@/lib/neural-service"
import type { DataSource } from "@/lib/types"

export const dynamic = "force-dynamic"

/* GET /api/neural/models — REAL model registry derived from artifacts on disk. */
export async function GET() {
  try {
    const models = await neuralFetch<unknown[]>("/v1/models", undefined, 10000)
    if (!models || !Array.isArray(models)) {
      return NextResponse.json({ ok: true, data: { source: "UNAVAILABLE" satisfies DataSource, models: [] } })
    }
    return NextResponse.json({ ok: true, data: { source: "REAL" satisfies DataSource, models } })
  } catch (e) {
    console.error("GET /api/neural/models", e)
    return NextResponse.json({ ok: false, error: "neural models failure" }, { status: 500 })
  }
}
