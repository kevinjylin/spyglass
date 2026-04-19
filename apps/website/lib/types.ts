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

export interface TweetLink {
  url: string
  label: string | null
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
  media_urls: string[] | null
  links: TweetLink[] | null
  author_handle: string | null
  author_name: string | null
  author_avatar_url: string | null
  like_count: number | null
  retweet_count: number | null
  quote_count: number | null
  reply_count: number | null
  view_count: number | null
  metadata_captured_at: string | null
}

export interface FalseTweetView {
  id: string
  handle: string | null
  authorName: string | null
  snippet: string
  views: number
  url: string | null
}

export interface SiteStats {
  total_tweets: number
  last_24h: number
  by_verdict: VerdictBreakdown
  total_claims: number
  fact_claims: number
  opinion_claims: number
  activity: DailyCount[]
  false_tweet_views: FalseTweetView[]
  false_tweets_with_views: number
  avg_views_false: number | null
  avg_views_other: number | null
}
