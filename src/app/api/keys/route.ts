import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

function newKey() {
  const hex = () => Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, "0")
  return `SK-syria-${hex()}-${hex()}-${hex()}`
}

export async function GET() {
  try {
    const rows = await db.apiKey.findMany({ orderBy: { createdAt: "desc" } })
    return NextResponse.json({ ok: true, data: rows })
  } catch (e) {
    console.error("GET /api/keys", e)
    return NextResponse.json({ ok: false, error: "Failed to load API keys" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { name?: string; tier?: string }
    if (!body.name?.trim()) {
      return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 })
    }
    const tier = ["internal", "research", "community"].includes(body.tier ?? "") ? body.tier! : "community"
    const full = newKey()
    const masked = `${full.slice(0, 9)}****-${full.slice(-4)}`
    const created = await db.apiKey.create({
      data: {
        keyId: full.replace("SK-syria-", "SK-"),
        name: body.name.trim(),
        maskedKey: masked,
        fullKey: full,
        tier,
        status: "active",
        rateLimit: tier === "internal" ? 600 : tier === "research" ? 120 : 60,
        requests: 0,
        tokensUsed: 0,
        lastUsed: null,
      },
    })
    await db.activityLog.create({
      data: {
        kind: "api",
        messageAr: `إنشاء مفتاح API جديد (${tier}) — ${created.name}`,
        messageEn: `New API key created (${tier}) — ${created.name}`,
        level: "info",
      },
    })
    return NextResponse.json({ ok: true, data: created })
  } catch (e) {
    console.error("POST /api/keys", e)
    return NextResponse.json({ ok: false, error: "Failed to create key" }, { status: 500 })
  }
}
