import { core } from "./core"
import { dashboard } from "./dashboard"
import { models } from "./models"
import { experiments } from "./experiments"
import { datasets } from "./datasets"
import { benchmarks } from "./benchmarks"
import { inference } from "./inference"
import { apiView } from "./api-view"
import { developers } from "./developers"
import { admin } from "./admin"
import { chat } from "./chat"
import { research } from "./research"

export type Lang = "ar" | "en"
export type Dict = Record<string, string>

const parts: Dict[] = [
  core as unknown as Dict,
  dashboard as unknown as Dict,
  models as unknown as Dict,
  experiments as unknown as Dict,
  datasets as unknown as Dict,
  benchmarks as unknown as Dict,
  inference as unknown as Dict,
  apiView as unknown as Dict,
  developers as unknown as Dict,
  admin as unknown as Dict,
  chat as unknown as Dict,
  research as unknown as Dict,
]

function build(lang: Lang): Dict {
  const out: Dict = {}
  for (const part of parts) {
    Object.assign(out, part[lang] ?? {})
  }
  return out
}

const dicts: Record<Lang, Dict> = {
  ar: build("ar"),
  en: build("en"),
}

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  let s = dicts[lang][key] ?? dicts.en[key] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v))
    }
  }
  return s
}
