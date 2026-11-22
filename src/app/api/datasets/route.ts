import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const rows = await db.dataset.findMany({ orderBy: { createdAt: "asc" } })
    return NextResponse.json({ ok: true, data: rows })
  } catch (e) {
    console.error("GET /api/datasets", e)
    return NextResponse.json({ ok: false, error: "Failed to load datasets" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      name?: string
      nameAr?: string
      category?: string
      language?: string
      license?: string
      source?: string
      docsM?: number
      tokensB?: number
      notes?: string
    }
    if (!body.name || !body.nameAr) {
      return NextResponse.json({ ok: false, error: "name and nameAr are required" }, { status: 400 })
    }
    const count = await db.dataset.count()
    const dsId = `DS-${String(count + 1).padStart(3, "0")}`
    const created = await db.dataset.create({
      data: {
        dsId,
        name: body.name.trim(),
        nameAr: body.nameAr.trim(),
        category: body.category || "web",
        language: body.language || "mixed",
        docsM: Number(body.docsM) || 0,
        tokensB: Number(body.tokensB) || 0,
        license: body.license || "Internal-Research",
        licenseUrl: null,
        source: body.source?.trim() || "Manual registration",
        status: "review",
        version: "v0.1",
        quality: null,
        dedupRatio: null,
        splitsTrain: 0.94,
        splitsValid: 0.04,
        splitsTest: 0.02,
        notes: body.notes?.trim() || null,
      },
    })
    await db.activityLog.create({
      data: {
        kind: "data",
        messageAr: `تسجيل مجموعة بيانات جديدة ${dsId} — ${created.nameAr} (قيد المراجعة)`,
        messageEn: `New dataset registered ${dsId} — ${created.name} (under review)`,
        level: "info",
      },
    })
    return NextResponse.json({ ok: true, data: created })
  } catch (e) {
    console.error("POST /api/datasets", e)
    return NextResponse.json({ ok: false, error: "Failed to create dataset" }, { status: 500 })
  }
}
