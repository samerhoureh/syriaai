import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await db.chatSession.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    })
    if (!session) return NextResponse.json({ ok: false, error: "Session not found" }, { status: 404 })
    return NextResponse.json({ ok: true, data: session })
  } catch (e) {
    console.error("GET /api/chat/sessions/[id]", e)
    return NextResponse.json({ ok: false, error: "Failed to load session" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = (await req.json()) as { title?: string }
    if (!body.title?.trim()) return NextResponse.json({ ok: false, error: "title required" }, { status: 400 })
    const updated = await db.chatSession.update({ where: { id }, data: { title: body.title.trim() } })
    return NextResponse.json({ ok: true, data: updated })
  } catch (e) {
    console.error("PATCH /api/chat/sessions/[id]", e)
    return NextResponse.json({ ok: false, error: "Failed to rename session" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.chatSession.delete({ where: { id } })
    return NextResponse.json({ ok: true, data: { deleted: id } })
  } catch (e) {
    console.error("DELETE /api/chat/sessions/[id]", e)
    return NextResponse.json({ ok: false, error: "Failed to delete session" }, { status: 500 })
  }
}
