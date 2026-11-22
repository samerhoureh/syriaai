import { NextResponse } from "next/server"
import os from "os"
import { db } from "@/lib/db"
import { ENGINES, PIPELINE } from "@/lib/seed"
import { neuralFetch } from "@/lib/neural-service"
import type { DataSource } from "@/lib/types"

export const dynamic = "force-dynamic"

interface NeuralSystemPayload {
  gpu?: { available?: boolean; message?: string; devices?: unknown[]; backend?: string }
  cpu?: { physical_cores?: number; logical_cores?: number; percent?: number; load_avg_1m?: number; arch?: string }
  memory?: { total_gb?: number; available_gb?: number; used_gb?: number; percent?: number; process_rss_mb?: number }
  disk?: { total_gb?: number; free_gb?: number; percent?: number }
}

/* GET /api/system — REAL hardware metrics from Node os/process (+ neural engine
 * GPU probe). Pipeline stays DEMO (seeded showcase data). */
export async function GET() {
  try {
    /* ---- real CPU / RAM (Node os + process) ---- */
    const cpuCount = os.cpus().length || 1
    const load1 = os.loadavg()[0] ?? 0
    const cpuPercent = Math.min(100, Math.max(0, (load1 / cpuCount) * 100))
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const ramPercent = Math.min(100, Math.max(0, (usedMem / totalMem) * 100))
    const rssMb = process.memoryUsage().rss / (1024 * 1024)

    /* ---- GPU: probe the neural engine service (REAL) else honest UNAVAILABLE ---- */
    let gpuSource: DataSource = "UNAVAILABLE"
    let gpuMessage = "No GPU detected"
    const neural = await neuralFetch<NeuralSystemPayload>("/v1/system", undefined, 6000)
    if (neural?.gpu) {
      gpuSource = "REAL"
      gpuMessage = neural.gpu.message ?? (neural.gpu.available ? "GPU available" : "No GPU detected")
    }

    /* ---- storage: real filesystem stats for the project volume ---- */
    let storagePercent = 41
    let storageDetail = "project volume"
    if (neural?.disk) {
      const totalGb = neural.disk.total_gb ?? 0
      const freeGb = neural.disk.free_gb ?? 0
      const usedGb = Math.max(0, totalGb - freeGb)
      storagePercent = Math.min(100, Math.max(0, neural.disk.percent ?? (totalGb > 0 ? (usedGb / totalGb) * 100 : 0)))
      storageDetail = `${usedGb.toFixed(1)} / ${totalGb.toFixed(1)} GB`
    }

    const metrics = [
      {
        id: "gpu",
        metricId: "gpu",
        label: "GPU",
        value: 0,
        detail: gpuMessage,
        kind: "gpu",
        sort: 1,
        source: gpuSource satisfies DataSource,
      },
      {
        id: "ram",
        metricId: "ram",
        label: "RAM",
        value: Math.round(ramPercent),
        detail: `${(usedMem / 1024 ** 3).toFixed(1)} / ${(totalMem / 1024 ** 3).toFixed(1)} GB`,
        kind: "memory",
        sort: 2,
        source: "REAL" satisfies DataSource,
      },
      {
        id: "cpu",
        metricId: "cpu",
        label: "CPU",
        value: Math.round(cpuPercent),
        detail: `${cpuCount} Cores`,
        kind: "compute",
        sort: 3,
        source: "REAL" satisfies DataSource,
      },
      {
        id: "storage",
        metricId: "storage",
        label: "Storage",
        value: Math.round(storagePercent),
        detail: storageDetail,
        kind: "storage",
        sort: 4,
        source: (neural ? "REAL" : "DEMO") satisfies DataSource,
      },
    ]

    /* ---- running experiments: prefer REAL training status; else demo DB count ---- */
    let runningExperiments = 0
    let runningSource: DataSource = "DEMO"
    const trainStatus = await neuralFetch<{ running?: boolean }>("/v1/training/status", undefined, 4000)
    if (trainStatus) {
      runningExperiments = trainStatus.running ? 1 : 0
      runningSource = "REAL"
    } else {
      runningExperiments = await db.experiment.count({ where: { status: "running" } })
    }

    const failed = await db.experiment.count({ where: { status: "failed" } })

    return NextResponse.json({
      ok: true,
      data: {
        engines: ENGINES,
        metrics,
        pipeline: PIPELINE,
        pipelineSource: "DEMO" satisfies DataSource,
        status: failed > 2 ? "degraded" : "operating",
        runningExperiments,
        runningSource,
        serverTime: new Date().toISOString(),
        rssMb: Math.round(rssMb),
      },
    })
  } catch (e) {
    console.error("GET /api/system", e)
    return NextResponse.json({ ok: false, error: "Failed to load system info" }, { status: 500 })
  }
}
