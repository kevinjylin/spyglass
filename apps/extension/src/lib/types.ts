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

export interface CheckRequest {
  tweet_id: string
  text: string
  author_handle?: string | null
  url?: string | null
}
