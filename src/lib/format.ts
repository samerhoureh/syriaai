/* SYRIA AI — formatting helpers (bilingual) */

const nf = new Intl.NumberFormat("en-US")

export function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—"
  return nf.format(Math.round(n))
}

export function fmtNum1(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—"
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(n)
}

export function fmtNum2(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—"
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

/** 18.7 → "18.7B" ; 0.9 → "0.9B" */
export function fmtB(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—"
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(n)}B`
}

/** 256480 → "256K" ; 400000 → "400K" */
export function fmtSteps(n: number): string {
  if (n >= 1_000_000) return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(n / 1_000_000)}M`
  if (n >= 1000) return `${Math.round(n / 1000)}K`
  return String(n)
}

export function fmtPct(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—"
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n)}%`
}

const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
]
const EN_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

export function fmtDate(iso: string | null | undefined, lang: "ar" | "en" = "ar"): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  const months = lang === "ar" ? AR_MONTHS : EN_MONTHS
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

/** "27 يناير - 10:24 ص" style */
export function fmtDateTime(iso: string | null | undefined, lang: "ar" | "en" = "ar"): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  const months = lang === "ar" ? AR_MONTHS : EN_MONTHS
  let h = d.getHours()
  const ampm = lang === "ar" ? (h < 12 ? "ص" : "م") : h < 12 ? "AM" : "PM"
  h = h % 12 || 12
  const mm = String(d.getMinutes()).padStart(2, "0")
  if (lang === "ar") return `${d.getDate()} ${months[d.getMonth()]} - ${h}:${mm} ${ampm}`
  return `${months[d.getMonth()]} ${d.getDate()} - ${h}:${mm} ${ampm}`
}

export function fmtRelative(iso: string | null | undefined, lang: "ar" | "en" = "ar"): string {
  if (!iso) return "—"
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return "—"
  const diff = Date.now() - then
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return lang === "ar" ? "الآن" : "now"
  if (mins < 60) return lang === "ar" ? `قبل ${mins} دقيقة` : `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return lang === "ar" ? `قبل ${hours} ساعة` : `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return lang === "ar" ? "أمس" : "yesterday"
  if (lang === "ar") return `قبل ${days} أيام`
  return `${days}d ago`
}

/** Arabic-aware week phrasing: 14 → "14 أسبوع", 2 → "أسبوعان", 5 → "5 أسابيع" */
export function fmtWeeksAr(n: number): string {
  const rounded = Math.round(n)
  if (rounded === 1) return "أسبوع واحد"
  if (rounded === 2) return "أسبوعان"
  if (rounded >= 3 && rounded <= 10) return `${rounded} أسابيع`
  return `${rounded} أسبوع`
}

export function fmtDaysAr(n: number): string {
  const rounded = Math.round(n)
  if (rounded === 1) return "يوم واحد"
  if (rounded === 2) return "يومان"
  if (rounded >= 3 && rounded <= 10) return `${rounded} أيام`
  return `${rounded} يوماً`
}

export function fmtWeeksEn(n: number): string {
  const r = Math.round(n)
  return `${r} ${r === 1 ? "week" : "weeks"}`
}

/** Arabic-Indic aware remaining time: 2 أسبوع و 6 أيام */
export function fmtRemainingAr(days: number): string {
  const weeks = Math.floor(days / 7)
  const rem = days % 7
  const parts: string[] = []
  if (weeks >= 1) parts.push(fmtWeeksAr(weeks))
  if (rem >= 1) parts.push(fmtDaysAr(rem))
  return parts.join(" و ") || "أقل من يوم"
}

export function fmtRemainingEn(days: number): string {
  const weeks = Math.floor(days / 7)
  const rem = days % 7
  const parts: string[] = []
  if (weeks >= 1) parts.push(fmtWeeksEn(weeks))
  if (rem >= 1) return `${parts.join(", ") ? parts.join(", ") + " and " : ""}${rem} day${rem === 1 ? "" : "s"}`
  return parts.join(", ") || "less than a day"
}
