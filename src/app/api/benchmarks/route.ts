import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const rows = await db.benchmark.findMany({ orderBy: { benchId: "asc" } })
    return NextResponse.json({ ok: true, data: rows })
  } catch (e) {
    console.error("GET /api/benchmarks", e)
    return NextResponse.json({ ok: false, error: "Failed to load benchmarks" }, { status: 500 })
  }
}
