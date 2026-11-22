import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const rows = await db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 })
    return NextResponse.json({ ok: true, data: rows })
  } catch (e) {
    console.error("GET /api/activity", e)
    return NextResponse.json({ ok: false, error: "Failed to load activity" }, { status: 500 })
  }
}
