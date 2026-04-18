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
}

export interface CheckResponse {
  tweet_id: string
  neutral_text: string
  overall_verdict: Verdict
  claims: ClaimResult[]
  cached: boolean
}

export interface VerdictBreakdown {
  true: number
  false: number
  misleading: number
  unverifiable: number
  opinion: number
}

export interface StatsResponse {
  total_tweets: number
  by_verdict: VerdictBreakdown
  last_24h: number
}

export interface TweetRow {
  id: string
  text: string
  neutral_text: string | null
  overall_verdict: Verdict | null
  url: string | null
  created_at: string
  checked_at: string | null
}
