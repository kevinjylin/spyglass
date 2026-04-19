import { createClient } from "@supabase/supabase-js"
import type { Verdict, VerdictBreakdown, DailyCount, TweetRow, SiteStats } from "./types"

const VERDICTS: Verdict[] = ["true", "false", "misleading", "unverifiable", "opinion"]

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function fetchSiteStats(): Promise<SiteStats | null> {
  const sb = serverClient()
  if (!sb) return null

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const oneDayAgo = new Date()
  oneDayAgo.setDate(oneDayAgo.getDate() - 1)

  const [
    { count: total_tweets },
    { count: last_24h },
    { count: total_claims },
    { count: fact_claims },
    { count: opinion_claims },
    { data: activityRows },
    ...verdictResults
  ] = await Promise.all([
    sb.from("tweets").select("*", { count: "exact", head: true }),
    sb.from("tweets").select("*", { count: "exact", head: true }).gte("created_at", oneDayAgo.toISOString()),
    sb.from("claims").select("*", { count: "exact", head: true }),
    sb.from("claims").select("*", { count: "exact", head: true }).eq("claim_type", "fact"),
    sb.from("claims").select("*", { count: "exact", head: true }).eq("claim_type", "opinion"),
    sb.from("tweets")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true }),
    ...VERDICTS.map((v) =>
      sb.from("tweets").select("*", { count: "exact", head: true }).eq("overall_verdict", v)
    ),
  ])

  const by_verdict: VerdictBreakdown = {
    true: verdictResults[0]?.count || 0,
    false: verdictResults[1]?.count || 0,
    misleading: verdictResults[2]?.count || 0,
    unverifiable: verdictResults[3]?.count || 0,
    opinion: verdictResults[4]?.count || 0,
  }

  // Build daily activity, filling missing days with 0
  const dayMap = new Map<string, number>()
  for (const row of (activityRows || []) as Pick<TweetRow, "created_at">[]) {
    const day = row.created_at.slice(0, 10)
    dayMap.set(day, (dayMap.get(day) || 0) + 1)
  }

  const activity: DailyCount[] = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    const key = d.toISOString().slice(0, 10)
    return { date: key, count: dayMap.get(key) || 0 }
  })

  return {
    total_tweets: total_tweets || 0,
    last_24h: last_24h || 0,
    by_verdict,
    total_claims: total_claims || 0,
    fact_claims: fact_claims || 0,
    opinion_claims: opinion_claims || 0,
    activity,
  }
}
