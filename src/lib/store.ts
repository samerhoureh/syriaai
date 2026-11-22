"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type ViewId =
  | "dashboard"
  | "models"
  | "experiments"
  | "datasets"
  | "benchmarks"
  | "inference"
  | "api"
  | "developers"
  | "admin"
  | "chat"
  | "research"

type NavPayload = Record<string, unknown> | undefined

type NavState = {
  view: ViewId
  payload: NavPayload
  navigate: (view: ViewId, payload?: NavPayload) => void
}

export const useNav = create<NavState>()(
  persist(
    (set) => ({
      view: "dashboard",
      payload: undefined,
      navigate: (view, payload) => set({ view, payload }),
    }),
    { name: "sy-nav", partialize: (s) => ({ view: s.view }) }
  )
)

type DemoModeState = {
  demoMode: boolean
  setDemoMode: (v: boolean) => void
}

/* Global demo-mode toggle (OFF by default = honest real/unavailable data). */
export const useDemoMode = create<DemoModeState>()(
  persist(
    (set) => ({
      demoMode: false,
      setDemoMode: (v) => set({ demoMode: v }),
    }),
    { name: "sy-demo-mode" }
  )
)

type ChatEngine = "neural" | "demo"

type ChatEngineState = {
  engine: ChatEngine
  setEngine: (v: ChatEngine) => void
}

/* Chat engine selector: neural (real PyTorch weights) vs demo (rule-based). */
export const useChatEngine = create<ChatEngineState>()(
  persist(
    (set) => ({
      engine: "neural",
      setEngine: (v) => set({ engine: v }),
    }),
    { name: "sy-chat-engine" }
  )
)
