import type { Verdict } from "~lib/types"

export const COLORS: Record<Verdict, string> = {
  true: "#15803d",
  false: "#b91c1c",
  misleading: "#b45309",
  unverifiable: "#6b7280",
  opinion: "#1d4ed8",
}

export const LABELS: Record<Verdict, string> = {
  true: "Likely true",
  false: "Likely false",
  misleading: "Misleading",
  unverifiable: "Unverifiable",
  opinion: "Opinion",
}
