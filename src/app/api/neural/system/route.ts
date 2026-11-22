import { NextResponse } from "next/server"
import { neuralFetch } from "@/lib/neural-service"
import type { DataSource } from "@/lib/types"

export const dynamic = "force-dynamic"

/* GET /api/neural/system — REAL hardware report from the neural engine service. */
export async function GET() {
  try {
    const sys = await neuralFetch<Record<string, unknown>>("/v1/system", undefined, 10000)
    if (!sys) {
      return NextResponse.json({
        ok: true,
        data: {
          source: "UNAVAILABLE" satisfies DataSource,
          gpu: { available: false, message: "No GPU detected" },
          summary: null,
        },
      })
    }
    return NextResponse.json({ ok: true, data: { source: "REAL" satisfies DataSource, ...sys } })
  } catch (e) {
    console.error("GET /api/neural/system", e)
    return NextResponse.json({ ok: false, error: "neural system failure" }, { status: 500 })
  }
}
