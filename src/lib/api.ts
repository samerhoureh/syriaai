"use client"

import type { ApiResult } from "./types"

async function handle<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => null)) as ApiResult<T> | null
  if (!res.ok || !json || json.ok === false) {
    const msg =
      json && json.ok === false ? json.error : `HTTP ${res.status} — ${res.statusText}`
    throw new Error(msg)
  }
  return (json as { ok: true; data: T }).data
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { signal, cache: "no-store" })
  return handle<T>(res)
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return handle<T>(res)
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return handle<T>(res)
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(path, { method: "DELETE" })
  return handle<T>(res)
}
