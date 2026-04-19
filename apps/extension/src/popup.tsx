/// <reference types="chrome" />
import iconUrl from "data-base64:../assets/icon.png"
import { useEffect, useState } from "react"
import { DEFAULT_API_BASE, getApiBase } from "~lib/storage"
import type { ClaimResult, Verdict } from "~lib/types"

const BG = "#efe8d4"
const PANEL = "#fdfaf1"
const CARD = "#ffffff"
const BORDER = "#d6cfc0"
const BORDER_SOFT = "#c8bfa9"
const TEXT = "#1e293b"
const TEXT_DIM = "#475569"
const TEXT_FAINT = "#78716c"
const AMBER = "#a16207"
const STAMP_RED = "#991b1b"
const MONO =
  "'American Typewriter', 'Courier Prime', 'Courier New', Courier, 'Lucida Console', monospace"

const VERDICT_COLORS: Record<
  Verdict,
  { bg: string; fg: string; dot: string; border: string }
> = {
  true:         { bg: "#dcfce7", fg: "#14532d", dot: "#16a34a", border: "#86efac" },
  false:        { bg: "#fee2e2", fg: "#7f1d1d", dot: "#dc2626", border: "#fca5a5" },
  misleading:   { bg: "#fef3c7", fg: "#78350f", dot: "#d97706", border: "#fcd34d" },
  unverifiable: { bg: "#f1f5f9", fg: "#334155", dot: "#64748b", border: "#cbd5e1" },
  opinion:      { bg: "#dbeafe", fg: "#1e3a8a", dot: "#2563eb", border: "#93c5fd" },
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
  rawText: string
  verdict: Verdict
  checkedAt: number
  sourceCount: number
  url: string | null
  claims: ClaimResult[]
}

interface StoredFeedEntry {
  id: string
  handle: string | null
  text: string
  rawText?: string
  verdict: Verdict
  checkedAt: number
  sourceCount: number
  url: string | null
  claims?: ClaimResult[]
}

const FEED_KEY = "feed"

function toFeedItem(entry: StoredFeedEntry): FeedItem {
  const handle = entry.handle?.trim() || ""
  return {
    id: entry.id,
    author: handle || "UNKNOWN",
    handle: handle ? `@${handle}` : "",
    text: entry.text,
    rawText: entry.rawText || entry.text,
    verdict: entry.verdict,
    checkedAt: entry.checkedAt,
    sourceCount: entry.sourceCount,
    url: entry.url,
    claims: entry.claims || [],
  }
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms
  const m = Math.floor(diff / 60000)
  if (m < 1) return "LIVE"
  if (m < 60) return `${m}m AGO`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h AGO`
  const d = Math.floor(h / 24)
  return `${d}d AGO`
}

function caseCode(id: string): string {
  const tail = id.slice(-6).toUpperCase().padStart(6, "0")
  return `CASE-${tail}`
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
    health === "ok" ? "#16a34a" : health === "down" ? "#dc2626" : AMBER
  const healthLabel =
    health === "ok" ? "ONLINE" : health === "down" ? "COMMS DARK" : "LINK…"

  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; background: ${BG}; }
        * { box-sizing: border-box; }
        @keyframes spg-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes spg-sweep { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
      <div
        style={{
          padding: 8,
          background: BG,
        }}>
        <div
          style={{
            width: 360,
            fontFamily: MONO,
            background: `radial-gradient(1200px 200px at 50% -60px, ${AMBER}22, transparent 60%), ${PANEL}`,
            color: TEXT,
            borderRadius: 14,
            overflow: "hidden",
            boxShadow:
              "0 1px 0 rgba(255,255,255,0.8) inset, 0 10px 28px rgba(107,74,20,0.18)",
            border: `1px solid ${BORDER}`,
          }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 14px 10px",
              borderBottom: `1px dashed ${BORDER}`,
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img
                src={iconUrl}
                alt=""
                width={32}
                height={32}
                style={{
                  borderRadius: 8,
                  objectFit: "cover",
                  display: "block",
                  border: `1px solid ${BORDER_SOFT}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                }}
              />
              <div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 14,
                    fontWeight: 700,
                    color: "black",
                    letterSpacing: "1.5px",
                  }}>
                  SPYGLASS
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 10,
                    color: TEXT_DIM,
                    letterSpacing: "0.6px",
                    textTransform: "uppercase",
                  }}>
                  Counter-intel · X / Twitter
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                title={`LINK: ${base}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: MONO,
                  fontSize: 10,
                  color: TEXT,
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 4,
                  padding: "4px 8px",
                  letterSpacing: "0.6px",
                  textTransform: "uppercase",
                }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    background: healthColor,
                    boxShadow: `0 0 0 3px ${healthColor}22`,
                    animation:
                      health === "unknown"
                        ? "spg-blink 1.2s ease-in-out infinite"
                        : undefined,
                  }}
                />
                {healthLabel}
              </div>
              <button
                type="button"
                aria-label="Options"
                onClick={() => chrome.runtime.openOptionsPage()}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: `1px solid ${BORDER}`,
                  background: CARD,
                  color: TEXT_DIM,
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
              padding: "4px 10px 12px",
              maxHeight: 420,
              overflowY: "auto",
            }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 4px 8px",
              }}>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "2px",
                  color: "black",
                }}>
                ⬢ RECENT INTEL
              </div>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  color: TEXT_FAINT,
                  letterSpacing: "0.8px",
                }}>
                {feed.length} DOSSIER{feed.length === 1 ? "" : "S"}
              </div>
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

          <div
            style={{
              padding: "8px 14px",
              borderTop: `1px dashed ${BORDER}`,
              fontFamily: MONO,
              fontSize: 9,
              color: "black",
              fontWeight: 700,
              letterSpacing: "1.4px",
              textAlign: "center",
              textTransform: "uppercase",
            }}>
            ▲ CLASSIFIED · DO NOT DISTRIBUTE ▲
          </div>
        </div>
      </div>
    </>
  )
}

function FeedCard({ item }: { item: FeedItem }) {
  const [expanded, setExpanded] = useState(false)
  const c = VERDICT_COLORS[item.verdict]
  const hasDetails = item.claims.length > 0 || item.rawText !== item.text
  return (
    <div
      style={{
        position: "relative",
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderLeft: `3px solid ${c.dot}`,
        borderRadius: 6,
        padding: "10px 10px 10px 12px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: MONO,
          fontSize: 9,
          color: TEXT_FAINT,
          letterSpacing: "1px",
          marginBottom: 6,
        }}>
        <span>{caseCode(item.id)}</span>
        <span>{timeAgo(item.checkedAt)}</span>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            flexShrink: 0,
            background: `linear-gradient(135deg, ${BG} 0%, ${BORDER} 100%)`,
            display: "grid",
            placeItems: "center",
            color: AMBER,
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: 13,
            border: `1px solid ${BORDER_SOFT}`,
          }}>
          {item.author.charAt(0).toUpperCase()}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 6,
              overflow: "hidden",
            }}>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 11,
                fontWeight: 700,
                color: TEXT,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
              {item.author}
            </span>
            {item.handle && (
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  color: TEXT_FAINT,
                  whiteSpace: "nowrap",
                }}>
                {item.handle}
              </span>
            )}
          </div>
          <p
            style={{
              margin: "6px 0 8px",
              fontFamily: MONO,
              fontSize: 12.5,
              lineHeight: 1.5,
              color: TEXT,
              ...(expanded
                ? {}
                : {
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }),
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
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (hasDetails) setExpanded((v) => !v)
              }}
              disabled={!hasDetails}
              aria-expanded={expanded}
              title={hasDetails ? "Toggle details" : undefined}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: c.bg,
                color: c.fg,
                border: `1px solid ${c.border}`,
                borderRadius: 3,
                padding: "3px 8px",
                fontFamily: MONO,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "1.4px",
                textTransform: "uppercase",
                cursor: hasDetails ? "pointer" : "default",
                margin: 0,
                boxShadow: expanded
                  ? `0 0 0 2px ${c.dot}33`
                  : "none",
                transition: "box-shadow 0.15s ease",
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
              {hasDetails && <Chevron open={expanded} />}
            </button>
            {item.sourceCount > 0 && (
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  color: TEXT_DIM,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  letterSpacing: "0.6px",
                }}>
                <LinkIcon />
                {item.sourceCount} SIGINT
              </span>
            )}
          </div>
        </div>
      </div>
      {expanded && hasDetails && <ExpandedDetails item={item} />}
    </div>
  )
}

function ExpandedDetails({ item }: { item: FeedItem }) {
  const showOriginal =
    item.rawText && item.rawText.trim() && item.rawText !== item.text
  return (
    <div
      style={{
        marginTop: 10,
        paddingTop: 10,
        borderTop: `1px dashed ${BORDER}`,
        fontFamily: MONO,
      }}>
      {showOriginal && (
        <div style={{ marginBottom: 10 }}>
          <SectionLabel>ORIGINAL TRANSMISSION</SectionLabel>
          <div
            style={{
              fontSize: 11.5,
              lineHeight: 1.5,
              color: TEXT_DIM,
              fontStyle: "italic",
              whiteSpace: "pre-wrap",
            }}>
            “{item.rawText}”
          </div>
        </div>
      )}
      {item.claims.length > 0 && (
        <div>
          <SectionLabel>FIELD FINDINGS ({item.claims.length})</SectionLabel>
          <ol
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}>
            {item.claims.map((claim, i) => (
              <ClaimRow key={i} index={i + 1} claim={claim} />
            ))}
          </ol>
        </div>
      )}
      {item.url && (
        <div style={{ marginTop: 10 }}>
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              fontFamily: MONO,
              fontSize: 10,
              color: AMBER,
              textDecoration: "none",
              letterSpacing: "0.8px",
              textTransform: "uppercase",
              fontWeight: 700,
            }}>
            ▶ OPEN ORIGINAL ON X
          </a>
        </div>
      )}
    </div>
  )
}

function ClaimRow({ index, claim }: { index: number; claim: ClaimResult }) {
  const c = VERDICT_COLORS[claim.verdict]
  return (
    <li
      style={{
        background: PANEL,
        border: `1px solid ${BORDER}`,
        borderLeft: `2px solid ${c.dot}`,
        borderRadius: 4,
        padding: "8px 10px",
      }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 6,
        }}>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 9,
            color: TEXT_FAINT,
            letterSpacing: "1px",
          }}>
          CLAIM #{String(index).padStart(2, "0")}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            background: c.bg,
            color: c.fg,
            border: `1px solid ${c.border}`,
            borderRadius: 3,
            padding: "2px 6px",
            fontFamily: MONO,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "1.2px",
            textTransform: "uppercase",
          }}>
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: 999,
              background: c.dot,
            }}
          />
          {VERDICT_LABELS[claim.verdict]}
        </span>
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 11.5,
          lineHeight: 1.5,
          color: TEXT,
          marginBottom: claim.explanation ? 6 : 0,
        }}>
        {claim.text}
      </div>
      {claim.explanation && (
        <div
          style={{
            fontFamily: MONO,
            fontSize: 10.5,
            lineHeight: 1.5,
            color: TEXT_DIM,
          }}>
          <span
            style={{
              color: AMBER,
              fontWeight: 700,
              letterSpacing: "1px",
              marginRight: 6,
            }}>
            ANALYSIS:
          </span>
          {claim.explanation}
        </div>
      )}
      {claim.sources && claim.sources.length > 0 && (
        <div
          style={{
            marginTop: 8,
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
          }}>
          {claim.sources.map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={s.title || s.url}
              style={{
                fontFamily: MONO,
                fontSize: 9.5,
                color: TEXT_DIM,
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 3,
                padding: "2px 6px",
                textDecoration: "none",
                letterSpacing: "0.4px",
                maxWidth: 200,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
              ↗ {sourceLabel(s.url, s.title)}
            </a>
          ))}
        </div>
      )}
    </li>
  )
}

function sourceLabel(url: string, title?: string | null): string {
  if (title && title.trim()) return title
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: 9,
        fontWeight: 700,
        color: AMBER,
        letterSpacing: "1.8px",
        textTransform: "uppercase",
        marginBottom: 6,
      }}>
      {children}
    </div>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.15s ease",
      }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function EmptyState() {
  return (
    <div
      style={{
        position: "relative",
        textAlign: "center",
        padding: "40px 16px 36px",
        border: `1px dashed ${BORDER}`,
        borderRadius: 8,
        background: `repeating-linear-gradient(-45deg, ${PANEL} 0 6px, ${BG} 6px 12px)`,
        color: TEXT_DIM,
      }}>
      <div
        style={{
          position: "relative",
          width: 56,
          height: 56,
          margin: "0 auto 14px",
        }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 999,
            border: `1px solid ${AMBER}77`,
            boxShadow: `0 0 0 4px ${AMBER}18`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 8,
            borderRadius: 999,
            border: `1px solid ${AMBER}77`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 16,
            borderRadius: 999,
            border: `1px solid ${AMBER}77`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width: 1,
            background: `${AMBER}77`,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: 1,
            background: `${AMBER}77`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 999,
            background: `conic-gradient(from 0deg, ${AMBER}55, transparent 120deg)`,
            animation: "spg-sweep 2.6s linear infinite",
          }}
        />
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: "1.8px",
          color: AMBER,
          fontWeight: 700,
        }}>
        AWAITING TRANSMISSIONS
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: "0.6px",
          color: TEXT_FAINT,
          marginTop: 6,
          textTransform: "uppercase",
        }}>
        Open X / Twitter to deploy field agents
      </div>
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
      stroke="currentColor"
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
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

export default Popup
