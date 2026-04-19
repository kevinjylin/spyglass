"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { TweetRow, Verdict } from "@/lib/types"

const VERDICT_STYLES: Record<Verdict, { bg: string; text: string; ring: string; label: string }> = {
  true:         { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", label: "True" },
  false:        { bg: "bg-rose-50",    text: "text-rose-700",    ring: "ring-rose-200",    label: "False" },
  misleading:   { bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-200",   label: "Misleading" },
  unverifiable: { bg: "bg-slate-100",  text: "text-slate-600",   ring: "ring-slate-200",   label: "Unverifiable" },
  opinion:      { bg: "bg-sky-50",     text: "text-sky-700",     ring: "ring-sky-200",     label: "Opinion" },
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
  if (diffSec < 5) return "just now"
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
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

function RelativeTime({ iso, now }: { iso: string; now: number }) {
  const absolute = new Date(iso).toLocaleString()
  return (
    <time dateTime={iso} title={absolute} className="tabular-nums">
      {formatRelative(iso, now)}
    </time>
  )
}

/* Inline, tiny Twitter-style engagement icons. */
const Icon = {
  Reply: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  Retweet: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  ),
  Like: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  Views: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <path d="M3 3v18h18" />
      <path d="M7 15l4-4 3 3 5-6" />
    </svg>
  ),
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-slate-500" title={label}>
      <span className="text-slate-400">{icon}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tweets" }, (payload) => {
        const row = payload.new as TweetRow
        if (!isVerified(row)) return
        setRows((prev) => sortRows([row, ...prev.filter((r) => r.id !== row.id)]).slice(0, PAGE_SIZE))
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tweets" }, (payload) => {
        const row = payload.new as TweetRow
        setRows((prev) => {
          const exists = prev.some((r) => r.id === row.id)
          if (!isVerified(row)) return exists ? prev.filter((r) => r.id !== row.id) : prev
          const next = exists ? prev.map((r) => (r.id === row.id ? row : r)) : [row, ...prev]
          return sortRows(next).slice(0, PAGE_SIZE)
        })
      })
      .subscribe()

    return () => {
      cancelled = true
      void supabase!.removeChannel(channel)
    }
  }, [])

  if (error) return <p className="text-sm text-rose-600">{error}</p>
  if (!rows.length)
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
        Waiting for tweets to be checked…
      </div>
    )

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((r) => (
        <FeedCard key={r.id} row={r} now={now} />
      ))}
    </div>
  )
}

function FeedCard({ row: r, now }: { row: TweetRow; now: number }) {
  const verdict = (r.overall_verdict ?? "unverifiable") as Verdict
  const style = VERDICT_STYLES[verdict] ?? VERDICT_STYLES.unverifiable
  const handle = r.author_handle ? `@${r.author_handle.replace(/^@/, "")}` : null

  const stats: { icon: React.ReactNode; value: string; label: string }[] = []
  const reply = formatCompact(r.reply_count);   if (reply)   stats.push({ icon: <Icon.Reply className="h-3.5 w-3.5" />,   value: reply,   label: "Replies" })
  const rt    = formatCompact(r.retweet_count); if (rt)      stats.push({ icon: <Icon.Retweet className="h-3.5 w-3.5" />, value: rt,      label: "Retweets" })
  const like  = formatCompact(r.like_count);    if (like)    stats.push({ icon: <Icon.Like className="h-3.5 w-3.5" />,    value: like,    label: "Likes" })
  const views = formatCompact(r.view_count);    if (views)   stats.push({ icon: <Icon.Views className="h-3.5 w-3.5" />,   value: views,   label: "Views" })

  return (
    <article className="group flex aspect-square flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      {/* Centered verdict badge */}
      <div className="flex items-center justify-center pt-5 pb-4">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${style.bg} ${style.text} ${style.ring}`}
        >
          {style.label}
        </span>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-5">
        {(r.author_name || handle) && (
          <div className="flex items-baseline gap-1.5 text-xs text-slate-500">
            {r.author_name && <span className="font-medium text-slate-700">{r.author_name}</span>}
            {handle && <span className="truncate">{handle}</span>}
          </div>
        )}

        <p className="line-clamp-4 text-[15px] leading-snug text-slate-800">
          {r.neutral_text || r.text}
        </p>

        {r.image_url && (
          <div className="relative mt-auto h-32 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={r.image_url}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Footer: engagement + timestamp */}
      <div className="mt-auto flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs">
        <div className="flex items-center gap-4">
          {stats.length > 0 ? (
            stats.map((s, i) => <Stat key={i} {...s} />)
          ) : (
            <span className="text-slate-300">No engagement data</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <RelativeTime iso={eventTime(r)} now={now} />
          {r.url && (
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-slate-700"
              aria-label="View tweet"
            >
              ↗
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

function sortRows(rows: TweetRow[]): TweetRow[] {
  return [...rows].sort(
    (a, b) => new Date(eventTime(b)).getTime() - new Date(eventTime(a)).getTime()
  )
}
