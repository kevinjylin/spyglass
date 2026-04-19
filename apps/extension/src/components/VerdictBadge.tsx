import { useState } from "react"
import type { CheckResponse } from "~lib/types"
import { COLORS, LABELS } from "~lib/verdict"

interface Props {
  state: "loading" | "ready" | "error"
  data?: CheckResponse
  error?: string
}

export function VerdictBadge({ state, data, error }: Props) {
  const [open, setOpen] = useState(false)

  if (state === "loading") {
    return <Pill bg="#e5e7eb" color="#374151" label="checking…" />
  }
  if (state === "error") {
    return <Pill bg="#fee2e2" color="#991b1b" label={`error: ${error || "?"}`} />
  }
  if (!data) return null

  const color = COLORS[data.overall_verdict]
  return (
    <div style={{ display: "inline-block", marginTop: 6 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          background: color,
          color: "white",
          border: "none",
          borderRadius: 9999,
          padding: "2px 10px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}>
        {LABELS[data.overall_verdict]}
        {data.cached ? " · cached" : ""}
      </button>
      {open && (
        <div
          style={{
            marginTop: 6,
            padding: 10,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            background: "white",
            color: "#111827",
            fontSize: 12,
            lineHeight: 1.4,
            maxWidth: 480,
          }}>
          <div style={{ fontStyle: "italic", marginBottom: 6 }}>
            “{data.neutral_text}”
          </div>
          <ul style={{ paddingLeft: 16, margin: 0 }}>
            {data.claims.map((c, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                <strong style={{ color: COLORS[c.verdict] }}>
                  {LABELS[c.verdict]}
                </strong>{" "}
                — {c.text}
                {c.explanation ? (
                  <div style={{ color: "#4b5563" }}>{c.explanation}</div>
                ) : null}
                {c.sources?.length ? (
                  <div style={{ marginTop: 2 }}>
                    {c.sources.slice(0, 3).map((s, j) => (
                      <a
                        key={j}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#1d4ed8", marginRight: 8 }}>
                        {s.title || new URL(s.url).hostname}
                      </a>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Pill({ bg, color, label }: { bg: string; color: string; label: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        background: bg,
        color,
        borderRadius: 9999,
        padding: "2px 10px",
        fontSize: 12,
        fontWeight: 600,
        marginTop: 6,
      }}>
      {label}
    </span>
  )
}
