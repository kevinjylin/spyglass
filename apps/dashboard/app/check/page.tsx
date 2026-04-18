"use client"

import { useState } from "react"
import { checkTweet } from "@/lib/api"
import type { CheckResponse, Verdict } from "@/lib/types"

const COLORS: Record<Verdict, string> = {
  true: "text-green-700",
  false: "text-red-700",
  misleading: "text-amber-700",
  unverifiable: "text-slate-600",
  opinion: "text-blue-700",
}

export default function CheckPage() {
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CheckResponse | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await checkTweet({
        tweet_id: `manual-${crypto.randomUUID()}`,
        text,
      })
      setResult(res)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Check a tweet</h1>
        <p className="mt-1 text-sm text-slate-600">
          Paste any text — the API will neutralize, extract claims, and verify
          fact claims with Gemini + Google Search.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Paste tweet text…"
          className="w-full rounded-lg border bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          required
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {loading ? "Checking…" : "Check"}
        </button>
      </form>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg border bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Overall verdict
          </div>
          <div className={`text-xl font-semibold ${COLORS[result.overall_verdict]}`}>
            {result.overall_verdict}
          </div>
          <div className="mt-3 italic text-slate-700">"{result.neutral_text}"</div>

          <ul className="mt-4 space-y-3">
            {result.claims.map((c, i) => (
              <li key={i} className="border-t pt-3">
                <div className={`text-sm font-semibold ${COLORS[c.verdict]}`}>
                  {c.verdict.toUpperCase()} — {c.text}
                </div>
                {c.explanation && (
                  <p className="mt-1 text-sm text-slate-700">{c.explanation}</p>
                )}
                {c.sources?.length ? (
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {c.sources.map((s, j) => (
                      <li key={j}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-700 hover:underline">
                          {s.title || new URL(s.url).hostname}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
