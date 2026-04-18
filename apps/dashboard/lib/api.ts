import type { CheckResponse, StatsResponse } from "./types"

const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"

function url(path: string) {
  return `${BASE.replace(/\/$/, "")}${path}`
}

export async function fetchStats(): Promise<StatsResponse> {
  const res = await fetch(url("/stats"), { cache: "no-store" })
  if (!res.ok) throw new Error(`stats ${res.status}`)
  return res.json()
}

export async function checkTweet(payload: {
  tweet_id: string
  text: string
}): Promise<CheckResponse> {
  const res = await fetch(url("/tweets/check"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`check ${res.status}: ${await res.text()}`)
  return res.json()
}
