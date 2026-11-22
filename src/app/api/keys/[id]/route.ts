import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const key = await db.apiKey.findUnique({ where: { id } })
    if (!key) return NextResponse.json({ ok: false, error: "Key not found" }, { status: 404 })
    const updated = await db.apiKey.update({ where: { id }, data: { status: "revoked" } })
    await db.activityLog.create({
      data: {
        kind: "security",
        messageAr: `إلغاء مفتاح API — ${key.name}`,
        messageEn: `API key revoked — ${key.name}`,
        level: "warn",
      },
    })
    return NextResponse.json({ ok: true, data: updated })
  } catch (e) {
    console.error("DELETE /api/keys/[id]", e)
    return NextResponse.json({ ok: false, error: "Failed to revoke key" }, { status: 500 })
  }
}
