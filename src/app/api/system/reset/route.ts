import { NextResponse } from "next/server"
import { seedDatabase } from "@/lib/seed"

export const dynamic = "force-dynamic"

export async function POST() {
  try {
    await seedDatabase()
    return NextResponse.json({ ok: true, data: { reseeded: true } })
  } catch (e) {
    console.error("POST /api/system/reset", e)
    return NextResponse.json({ ok: false, error: "Reset failed" }, { status: 500 })
  }
}
