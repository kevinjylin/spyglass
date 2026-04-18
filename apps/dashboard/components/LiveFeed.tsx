"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { TweetRow, Verdict } from "@/lib/types"
import { VerdictCard } from "./VerdictCard"

const PAGE_SIZE = 20

export function LiveFeed() {
  const [rows, setRows] = useState<TweetRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      setError("Supabase not configured (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).")
      return
    }

    let cancelled = false
    void (async () => {
      const { data, error } = await supabase
        .from("tweets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE)
      if (cancelled) return
      if (error) setError(error.message)
      else setRows((data || []) as TweetRow[])
    })()

    const channel = supabase
      .channel("tweets-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tweets" },
        (payload) => {
          setRows((prev) => [payload.new as TweetRow, ...prev].slice(0, PAGE_SIZE))
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tweets" },
        (payload) => {
          setRows((prev) =>
            prev.map((r) => (r.id === (payload.new as TweetRow).id ? (payload.new as TweetRow) : r))
          )
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [])

  if (error) return <p className="text-sm text-red-700">{error}</p>
  if (!rows.length) return <p className="text-sm text-slate-500">Waiting for tweets…</p>

  return (
    <div className="grid gap-3">
      {rows.map((r) => (
        <VerdictCard
          key={r.id}
          verdict={(r.overall_verdict || "unverifiable") as Verdict}
          text={r.neutral_text || r.text}
          url={r.url}
          timestamp={new Date(r.created_at).toLocaleString()}
        />
      ))}
    </div>
  )
}
