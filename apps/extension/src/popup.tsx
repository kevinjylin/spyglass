/// <reference types="chrome" />
import iconUrl from "data-base64:../assets/icon.png"
import { useEffect, useState } from "react"
import { DEFAULT_API_BASE, getApiBase } from "~lib/storage"
import type { Verdict } from "~lib/types"

const VERDICT_COLORS: Record<Verdict, { bg: string; fg: string; dot: string }> = {
  true:         { bg: "#dcfce7", fg: "#14532d", dot: "#16a34a" },
  false:        { bg: "#fee2e2", fg: "#7f1d1d", dot: "#dc2626" },
  misleading:   { bg: "#fef3c7", fg: "#78350f", dot: "#d97706" },
  unverifiable: { bg: "#f1f5f9", fg: "#334155", dot: "#64748b" },
  opinion:      { bg: "#dbeafe", fg: "#1e3a8a", dot: "#2563eb" },
}

const VERDICT_LABELS: Record<Verdict, string> = {
  true: "Likely true",
  false: "Likely false",
  misleading: "Misleading",
  unverifiable: "Unverifiable",
  opinion: "Opinion",
}

interface FeedItem {
  id: string
  author: string
  handle: string
  text: string
  verdict: Verdict
  checkedAt: number
  sourceCount: number
}

interface StoredFeedEntry {
  id: string
  handle: string | null
  text: string
  verdict: Verdict
  checkedAt: number
  sourceCount: number
  url: string | null
}

const FEED_KEY = "feed"

function toFeedItem(entry: StoredFeedEntry): FeedItem {
  const handle = entry.handle?.trim() || ""
  return {
    id: entry.id,
    author: handle || "Unknown",
    handle: handle ? `@${handle}` : "",
    text: entry.text,
    verdict: entry.verdict,
    checkedAt: entry.checkedAt,
    sourceCount: entry.sourceCount,
  }
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function Popup() {
  const [base, setBase] = useState(DEFAULT_API_BASE)
  const [health, setHealth] = useState<"unknown" | "ok" | "down">("unknown")
  const [feed, setFeed] = useState<FeedItem[]>([])

  useEffect(() => {
    void (async () => {
      const b = await getApiBase()
      setBase(b)
      try {
        const r = await fetch(`${b.replace(/\/$/, "")}/healthz`)
        setHealth(r.ok ? "ok" : "down")
      } catch {
        setHealth("down")
      }
    })()
  }, [])

  useEffect(() => {
    const load = async () => {
      const stored = await chrome.storage.local.get(FEED_KEY)
      const raw = (stored?.[FEED_KEY] as StoredFeedEntry[] | undefined) || []
      setFeed(raw.map(toFeedItem))
    }
    void load()
    const listener = (
      changes: { [k: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area === "local" && changes[FEED_KEY]) void load()
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  const healthColor =
    health === "ok" ? "#16a34a" : health === "down" ? "#dc2626" : "#94a3b8"

  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; background: #f8fafc; }
        * { box-sizing: border-box; }
      `}</style>
      <div
        style={{
          padding: 8,
          background: "#f8fafc",
        }}>
      <div
        style={{
          width: 360,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
          background: "linear-gradient(180deg, #fff7ed 0%, #ffffff 140px)",
          color: "#0f172a",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow:
            "0 1px 2px rgba(15,23,42,0.06), 0 12px 28px rgba(15,23,42,0.10)",
          border: "1px solid #e2e8f0",
        }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px 10px",
          }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src={iconUrl}
              alt=""
              width={30}
              height={30}
              style={{
                borderRadius: 10,
                objectFit: "cover",
                display: "block",
                boxShadow: "0 2px 6px rgba(245,158,11,0.35)",
              }}
            />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.2px" }}>
                SpyGlass
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                Inline fact-check for X / Twitter
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              title={`API: ${base}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                color: "#475569",
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: 999,
                padding: "4px 9px",
                fontWeight: 500,
              }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: healthColor,
                  boxShadow: `0 0 0 3px ${healthColor}22`,
                }}
              />
              {health}
            </div>
            <button
              type="button"
              aria-label="Options"
              onClick={() => chrome.runtime.openOptionsPage()}
              style={{
                width: 30,
                height: 30,
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                background: "white",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                padding: 0,
              }}>
              <GearIcon />
            </button>
          </div>
        </div>

        <div
          style={{
            padding: "2px 10px 12px",
            maxHeight: 420,
            overflowY: "auto",
          }}>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              color: "#94a3b8",
              padding: "8px 6px 8px",
            }}>
            Recent checks
          </div>
          {feed.length === 0 ? (
            <EmptyState />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {feed.map((item) => (
                <FeedCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  )
}

function FeedCard({ item }: { item: FeedItem }) {
  const c = VERDICT_COLORS[item.verdict]
  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 10,
      }}>
      <div style={{ display: "flex", gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            flexShrink: 0,
            background: "linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)",
            display: "grid",
            placeItems: "center",
            color: "#475569",
            fontWeight: 700,
            fontSize: 13,
          }}>
          {item.author.charAt(0).toUpperCase()}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 8,
            }}>
            <div
              style={{
                minWidth: 0,
                display: "flex",
                gap: 6,
                alignItems: "baseline",
                overflow: "hidden",
              }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#0f172a",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                {item.author}
              </span>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>
                {item.handle}
              </span>
            </div>
            <span
              style={{
                fontSize: 11,
                color: "#94a3b8",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}>
              {timeAgo(item.checkedAt)}
            </span>
          </div>
          <p
            style={{
              margin: "4px 0 8px",
              fontSize: 12.5,
              lineHeight: 1.45,
              color: "#334155",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>
            {item.text}
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: c.bg,
                color: c.fg,
                borderRadius: 999,
                padding: "3px 9px",
                fontSize: 11,
                fontWeight: 600,
              }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: c.dot,
                }}
              />
              {VERDICT_LABELS[item.verdict]}
            </span>
            {item.sourceCount > 0 && (
              <span
                style={{
                  fontSize: 11,
                  color: "#64748b",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}>
                <LinkIcon />
                {item.sourceCount} source{item.sourceCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "32px 16px",
        color: "#64748b",
        fontSize: 12,
      }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          background: "linear-gradient(135deg, #fed7aa 0%, #fde68a 100%)",
          margin: "0 auto 10px",
        }}
      />
      No checks yet. Open X / Twitter to get started.
    </div>
  )
}

function GearIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#475569"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#64748b"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

export default Popup
