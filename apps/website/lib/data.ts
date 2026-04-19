import { createClient } from "@supabase/supabase-js"
import type {
  Verdict,
  VerdictBreakdown,
  DailyCount,
  TweetRow,
  SiteStats,
  FalseTweetView,
  EngagementPoint,
} from "./types"

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
    { data: falseViewRows },
    { data: falseAvgRows },
    { data: otherAvgRows },
    { data: scatterRows },
    ...verdictResults
  ] = await Promise.all([
    sb
      .from("tweets")
      .select("*", { count: "exact", head: true })
      .not("overall_verdict", "is", null),
    sb
      .from("tweets")
      .select("*", { count: "exact", head: true })
      .not("overall_verdict", "is", null)
      .gte("checked_at", oneDayAgo.toISOString()),
    sb.from("claims").select("*", { count: "exact", head: true }),
    sb.from("claims").select("*", { count: "exact", head: true }).eq("claim_type", "fact"),
    sb.from("claims").select("*", { count: "exact", head: true }).eq("claim_type", "opinion"),
    sb.from("tweets")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true }),
    // Top false tweets by view count (for the popularity-vs-falseness bar chart)
    sb.from("tweets")
      .select("id, text, neutral_text, author_handle, author_name, url, view_count")
      .eq("overall_verdict", "false")
      .not("view_count", "is", null)
      .order("view_count", { ascending: false })
      .limit(15),
    // All false tweets' view counts (for average + reference)
    sb.from("tweets")
      .select("view_count")
      .eq("overall_verdict", "false")
      .not("view_count", "is", null),
    // All non-false tweets' view counts (for comparison average)
    sb.from("tweets")
      .select("view_count")
      .neq("overall_verdict", "false")
      .not("overall_verdict", "is", null)
      .not("view_count", "is", null),
    // Scatter points: true + false tweets with retweet + like counts
    sb.from("tweets")
      .select(
        "id, text, neutral_text, author_handle, author_name, url, overall_verdict, retweet_count, like_count"
      )
      .in("overall_verdict", ["true", "false"])
      .not("retweet_count", "is", null)
      .not("like_count", "is", null)
      .limit(1000),
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

  // Shape false-tweet bar chart rows
  type RawFalseRow = {
    id: string
    text: string | null
    neutral_text: string | null
    author_handle: string | null
    author_name: string | null
    url: string | null
    view_count: number | null
  }
  const false_tweet_views: FalseTweetView[] = ((falseViewRows || []) as RawFalseRow[]).map((r) => {
    const rawText = (r.neutral_text ?? r.text ?? "").trim()
    const snippet = rawText.length > 96 ? `${rawText.slice(0, 95)}…` : rawText
    return {
      id: r.id,
      handle: r.author_handle,
      authorName: r.author_name,
      snippet,
      views: r.view_count ?? 0,
      url: r.url,
    }
  })

  // Averages (null when no data)
  const avgOf = (rows: { view_count: number | null }[] | null): number | null => {
    if (!rows || rows.length === 0) return null
    const total = rows.reduce((s, r) => s + (r.view_count ?? 0), 0)
    return Math.round(total / rows.length)
  }
  const avg_views_false = avgOf(falseAvgRows as { view_count: number | null }[] | null)
  const avg_views_other = avgOf(otherAvgRows as { view_count: number | null }[] | null)
  const false_tweets_with_views = (falseAvgRows as unknown[] | null)?.length || 0

  // Shape scatter points
  type RawScatterRow = {
    id: string
    text: string | null
    neutral_text: string | null
    author_handle: string | null
    author_name: string | null
    url: string | null
    overall_verdict: Verdict | null
    retweet_count: number | null
    like_count: number | null
  }
  const scatter_points: EngagementPoint[] = ((scatterRows || []) as RawScatterRow[])
    .filter((r) => r.overall_verdict === "true" || r.overall_verdict === "false")
    .map((r) => {
      const rawText = (r.neutral_text ?? r.text ?? "").trim()
      const snippet = rawText.length > 140 ? `${rawText.slice(0, 139)}…` : rawText
      return {
        id: r.id,
        verdict: r.overall_verdict as "true" | "false",
        retweets: r.retweet_count ?? 0,
        likes: r.like_count ?? 0,
        handle: r.author_handle,
        authorName: r.author_name,
        snippet,
        url: r.url,
      }
    })

  return {
    total_tweets: total_tweets || 0,
    last_24h: last_24h || 0,
    by_verdict,
    total_claims: total_claims || 0,
    fact_claims: fact_claims || 0,
    opinion_claims: opinion_claims || 0,
    activity,
    false_tweet_views,
    false_tweets_with_views,
    avg_views_false,
    avg_views_other,
    scatter_points,
  }
}
