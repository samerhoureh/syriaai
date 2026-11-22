import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const [foundation, specialized] = await Promise.all([
      db.aiModel.findMany({ where: { family: "foundation" }, orderBy: { sort: "asc" } }),
      db.aiModel.findMany({ where: { family: "specialized" }, orderBy: { sort: "asc" } }),
    ])
    return NextResponse.json({ ok: true, data: { foundation, specialized } })
  } catch (e) {
    console.error("GET /api/models", e)
    return NextResponse.json({ ok: false, error: "Failed to load models" }, { status: 500 })
  }
}
