import type { Verdict } from "@/lib/types"

const COLORS: Record<Verdict, string> = {
  true: "bg-green-100 text-green-800 border-green-200",
  false: "bg-red-100 text-red-800 border-red-200",
  misleading: "bg-amber-100 text-amber-800 border-amber-200",
  unverifiable: "bg-slate-100 text-slate-700 border-slate-200",
  opinion: "bg-blue-100 text-blue-800 border-blue-200",
}

const LABELS: Record<Verdict, string> = {
  true: "Likely true",
  false: "Likely false",
  misleading: "Misleading",
  unverifiable: "Unverifiable",
  opinion: "Opinion",
}

export function VerdictCard({
  verdict,
  text,
  url,
  timestamp,
}: {
  verdict: Verdict
  text: string
  url?: string | null
  timestamp?: string
}) {
  return (
    <article className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${COLORS[verdict]}`}>
          {LABELS[verdict]}
        </span>
        {timestamp && (
          <time className="text-xs text-slate-500">{timestamp}</time>
        )}
      </div>
      <p className="mt-2 text-sm text-slate-800">{text}</p>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs text-blue-700 hover:underline">
          view on X
        </a>
      )}
    </article>
  )
}
