"use client"

import * as React from "react"
import { Lang, translate } from "@/lib/i18n"

type LanguageContextValue = {
  lang: Lang
  dir: "rtl" | "ltr"
  isAr: boolean
  setLang: (l: Lang) => void
  toggle: () => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const LanguageContext = React.createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>("ar")

  React.useEffect(() => {
    const stored = window.localStorage.getItem("sy-lang") as Lang | null
    if (stored === "ar" || stored === "en") setLangState(stored)
  }, [])

  React.useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"
  }, [lang])

  const setLang = React.useCallback((l: Lang) => {
    setLangState(l)
    window.localStorage.setItem("sy-lang", l)
  }, [])

  const t = React.useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang]
  )

  const value = React.useMemo<LanguageContextValue>(
    () => ({
      lang,
      dir: lang === "ar" ? "rtl" : "ltr",
      isAr: lang === "ar",
      setLang,
      toggle: () => setLang(lang === "ar" ? "en" : "ar"),
      t,
    }),
    [lang, setLang, t]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useI18n() {
  const ctx = React.useContext(LanguageContext)
  if (!ctx) throw new Error("useI18n must be used inside LanguageProvider")
  return ctx
}
