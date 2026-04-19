export type Verdict =
  | "true"
  | "false"
  | "misleading"
  | "unverifiable"
  | "opinion"

export interface Source {
  url: string
  title?: string | null
  excerpt?: string | null
}

export interface ClaimResult {
  text: string
  claim_type: "fact" | "opinion"
  verdict: Verdict
  explanation: string
  sources: Source[]
  source_span?: string | null
}

export interface CheckResponse {
  tweet_id: string
  neutral_text: string
  overall_verdict: Verdict
  claims: ClaimResult[]
  cached: boolean
}

export interface TweetLink {
  url: string
  label?: string | null
}

export interface TweetContext {
  author_name?: string | null
  author_handle?: string | null
  author_avatar_url?: string | null
  image_url?: string | null
  media_urls?: string[]
  links?: TweetLink[]
  reply_count?: number | null
  retweet_count?: number | null
  quote_count?: number | null
  like_count?: number | null
  view_count?: number | null
  metadata_captured_at?: string | null
}

export interface CheckRequest {
  tweet_id: string
  text: string
  author_handle?: string | null
  url?: string | null
  tweet_context?: TweetContext | null
}
