import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const rows = await db.chatSession.findMany({
      orderBy: { updatedAt: "desc" },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    })
    return NextResponse.json({ ok: true, data: rows })
  } catch (e) {
    console.error("GET /api/chat/sessions", e)
    return NextResponse.json({ ok: false, error: "Failed to load sessions" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { title?: string; model?: string }
    const created = await db.chatSession.create({
      data: {
        title: body.title?.trim() || "محادثة جديدة",
        model: body.model || "syria-ai-nano",
      },
      include: { messages: true },
    })
    return NextResponse.json({ ok: true, data: created })
  } catch (e) {
    console.error("POST /api/chat/sessions", e)
    return NextResponse.json({ ok: false, error: "Failed to create session" }, { status: 500 })
  }
}
