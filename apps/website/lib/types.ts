export type Verdict = "true" | "false" | "misleading" | "unverifiable" | "opinion"

export interface VerdictBreakdown {
  true: number
  false: number
  misleading: number
  unverifiable: number
  opinion: number
}

export interface DailyCount {
  date: string // "YYYY-MM-DD"
  count: number
}

export interface TweetRow {
  id: string
  text: string
  neutral_text: string | null
  overall_verdict: Verdict | null
  url: string | null
  created_at: string
  checked_at: string | null
  // Optional — populated if the extension/API captures them. Rendered when present.
  image_url: string | null
  author_handle: string | null
  author_name: string | null
  like_count: number | null
  retweet_count: number | null
  reply_count: number | null
  view_count: number | null
}

export interface SiteStats {
  total_tweets: number
  last_24h: number
  by_verdict: VerdictBreakdown
  total_claims: number
  fact_claims: number
  opinion_claims: number
  activity: DailyCount[]
}
