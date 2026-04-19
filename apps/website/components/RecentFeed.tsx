"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { TweetLink, TweetRow, Verdict } from "@/lib/types"

const VERDICT_STAMP: Record<Verdict, { label: string; color: string }> = {
  true: { label: "TRUE", color: "#3a5c3a" },
  false: { label: "FALSE", color: "#a31d1d" },
  misleading: { label: "MISLEADING", color: "#b8892f" },
  unverifiable: { label: "UNVERIFIABLE", color: "#6b5e4d" },
  opinion: { label: "OPINION", color: "#1f3a5f" },
}

const PAGE_SIZE = 12
const VERIFIED_VERDICTS: Verdict[] = ["true", "false", "misleading"]
const isVerified = (r: TweetRow) =>
  r.overall_verdict !== null && VERIFIED_VERDICTS.includes(r.overall_verdict)

function eventTime(r: TweetRow): string {
  return r.checked_at || r.created_at
}

function formatRelative(iso: string, now: number): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const diffSec = Math.round((now - then) / 1000)
  if (diffSec < 5) return "LIVE"
  if (diffSec < 60) return `T-${diffSec}s`
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `T-${diffMin}m`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `T-${diffHr}h`
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 7) return `T-${diffDay}d`
  return new Date(iso)
    .toLocaleDateString(undefined, { month: "short", day: "numeric" })
    .toUpperCase()
}

function formatCompact(n: number | null | undefined): string | null {
  if (n == null) return null
  if (n < 1000) return n.toLocaleString()
  if (n < 10_000) return `${(n / 1000).toFixed(1)}K`
  if (n < 1_000_000) return `${Math.round(n / 1000)}K`
  if (n < 10_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  return `${Math.round(n / 1_000_000)}M`
}

function useNow(intervalMs = 15000): number {
  const [now, setNow] = useState<number>(() => Date.now())
  useEffect(() => {
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

function normalizeLinks(links: TweetRow["links"]): TweetLink[] {
  return Array.isArray(links) ? links.filter((l) => Boolean(l?.url)) : []
}

function linkLabel(link: TweetLink): string {
  if (link.label?.trim()) return link.label.trim()
  try {
    return new URL(link.url).hostname.replace(/^www\./, "")
  } catch {
    return link.url
  }
}

function caseCode(id: string): string {
  const clean = id.replace(/\D/g, "")
  const n = clean.slice(-4).padStart(4, "0")
  return `EVIDENCE · ${n}`
}

export function RecentFeed() {
  const [rows, setRows] = useState<TweetRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const now = useNow()

  useEffect(() => {
    if (!supabase) {
      setError("Supabase not configured.")
      return
    }

    let cancelled = false
    void (async () => {
      const { data, error } = await supabase
        .from("tweets")
        .select("*")
        .in("overall_verdict", VERIFIED_VERDICTS)
        .order("checked_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE)
      if (cancelled) return
      if (error) setError(error.message)
      else setRows((data || []) as TweetRow[])
    })()

    const channel = supabase
      .channel("website-tweets-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tweets" },
        (payload) => {
          const row = payload.new as TweetRow
          if (!isVerified(row)) return
          setRows((prev) =>
            sortRows([row, ...prev.filter((r) => r.id !== row.id)]).slice(0, PAGE_SIZE)
          )
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tweets" },
        (payload) => {
          const row = payload.new as TweetRow
          setRows((prev) => {
            const exists = prev.some((r) => r.id === row.id)
            if (!isVerified(row)) return exists ? prev.filter((r) => r.id !== row.id) : prev
            const next = exists ? prev.map((r) => (r.id === row.id ? row : r)) : [row, ...prev]
            return sortRows(next).slice(0, PAGE_SIZE)
          })
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase!.removeChannel(channel)
    }
  }, [])

  if (error)
    return (
      <p
        className="font-mono-ds"
        style={{
          fontSize: 11,
          letterSpacing: ".16em",
          textTransform: "uppercase",
          color: "var(--stamp)",
        }}
      >
        ⚠ {error}
      </p>
    )

  if (!rows.length)
    return (
      <div
        className="font-mono-ds"
        style={{
          border: "1.5px dashed var(--rule)",
          padding: "40px 20px",
          textAlign: "center",
          fontSize: 11,
          letterSpacing: ".22em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
        }}
      >
        Waiting for intercepts…
      </div>
    )

  return (
    <div
      style={{
        display: "grid",
        gap: 18,
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      }}
    >
      {rows.map((r) => (
        <EvidenceCard key={r.id} row={r} now={now} />
      ))}
    </div>
  )
}

function EvidenceCard({ row: r, now }: { row: TweetRow; now: number }) {
  const verdict = (r.overall_verdict ?? "unverifiable") as Verdict
  const stamp = VERDICT_STAMP[verdict] ?? VERDICT_STAMP.unverifiable
  const handle = r.author_handle ? `@${r.author_handle.replace(/^@/, "")}` : null
  const authorLabel = r.author_name || handle || "UNKNOWN"
  const links = normalizeLinks(r.links).slice(0, 2)
  const tweetText = r.neutral_text || r.text

  const stats: string[] = []
  const reply = formatCompact(r.reply_count)
  if (reply) stats.push(`↩ ${reply}`)
  const rt = formatCompact(r.retweet_count)
  if (rt) stats.push(`⇄ ${rt}`)
  const like = formatCompact(r.like_count)
  if (like) stats.push(`♥ ${like}`)
  const views = formatCompact(r.view_count)
  if (views) stats.push(`◎ ${views}`)

  return (
    <article className="evidence">
      <div className="ev-hd">
        <span>{caseCode(r.id)}</span>
        {r.url ? (
          <a href={r.url} target="_blank" rel="noopener noreferrer" aria-label="View tweet">
            ↗
          </a>
        ) : (
          <span>·</span>
        )}
      </div>
      <div
        className="ev-verdict"
        style={{ borderColor: stamp.color, color: stamp.color }}
      >
        {stamp.label}
      </div>
      <div className="ev-body">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11,
            color: "var(--ink-mute)",
          }}
        >
          <EvidenceAvatar name={authorLabel} url={r.author_avatar_url} />
          <div style={{ minWidth: 0 }}>
            <div
              className="font-type"
              style={{
                color: "var(--ink)",
                fontSize: 14,
                lineHeight: 1.1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 180,
              }}
            >
              {authorLabel}
            </div>
            {handle && r.author_name && (
              <div
                className="font-mono-ds"
                style={{
                  fontSize: 10,
                  letterSpacing: ".08em",
                  color: "var(--ink-mute)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 180,
                }}
              >
                {handle}
              </div>
            )}
          </div>
        </div>

        <p
          className="font-type"
          style={{
            fontSize: 13.5,
            lineHeight: 1.5,
            color: "var(--ink)",
            margin: 0,
            display: "-webkit-box",
            WebkitLineClamp: 4,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {tweetText}
        </p>

        {links.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {links.map((l) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono-ds"
                style={{
                  fontSize: 9.5,
                  padding: "2px 6px",
                  border: "1px solid var(--ink)",
                  color: "var(--ink)",
                  textDecoration: "none",
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  background: "var(--paper-dark)",
                  maxWidth: 180,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                ↗ {linkLabel(l)}
              </a>
            ))}
          </div>
        )}

        {r.image_url && (
          <div
            style={{
              marginTop: "auto",
              height: 80,
              border: "1.5px solid var(--ink)",
              overflow: "hidden",
              background: "var(--paper-dark)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={r.image_url}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        )}
      </div>

      <div className="ev-footer">
        <div style={{ display: "flex", gap: 10 }}>
          {stats.length ? (
            stats.map((s, i) => <span key={i}>{s}</span>)
          ) : (
            <span style={{ color: "var(--ink-mute)" }}>NO SIGNALS</span>
          )}
        </div>
        <time dateTime={eventTime(r)}>{formatRelative(eventTime(r), now)}</time>
      </div>
    </article>
  )
}

function EvidenceAvatar({ name, url }: { name: string; url: string | null }) {
  const [failed, setFailed] = useState(false)
  const initial = name.replace(/^@/, "").charAt(0).toUpperCase() || "?"
  const shared: React.CSSProperties = {
    width: 32,
    height: 32,
    border: "1.5px solid var(--ink)",
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
  }

  if (url && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        style={{
          ...shared,
          objectFit: "cover",
          background: "var(--paper-dark)",
        }}
      />
    )
  }

  return (
    <div
      className="font-type"
      style={{
        ...shared,
        background: "var(--paper-dark)",
        color: "var(--ink)",
        fontSize: 14,
      }}
    >
      {initial}
    </div>
  )
}

function sortRows(rows: TweetRow[]): TweetRow[] {
  return [...rows].sort(
    (a, b) => new Date(eventTime(b)).getTime() - new Date(eventTime(a)).getTime()
  )
}
