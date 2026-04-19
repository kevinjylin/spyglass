import { getApiBase } from "~lib/storage"
import type { CheckRequest, CheckResponse, ClaimResult, Verdict } from "~lib/types"

interface CheckMessage {
  type: "CHECK_TWEET"
  payload: CheckRequest
}

export interface StoredFeedEntry {
  id: string
  handle: string | null
  authorName: string | null
  authorAvatarUrl: string | null
  text: string
  rawText: string
  verdict: Verdict
  checkedAt: number
  sourceCount: number
  url: string | null
  claims: ClaimResult[]
}

const FEED_KEY = "feed"
const FEED_LIMIT = 50

async function saveFeedEntry(entry: StoredFeedEntry): Promise<void> {
  const stored = await chrome.storage.local.get(FEED_KEY)
  const existing = (stored?.[FEED_KEY] as StoredFeedEntry[] | undefined) || []
  const next = [entry, ...existing.filter((e) => e.id !== entry.id)].slice(0, FEED_LIMIT)
  await chrome.storage.local.set({ [FEED_KEY]: next })
}

chrome.runtime.onMessage.addListener(
  (msg: CheckMessage, _sender, sendResponse) => {
    if (msg?.type !== "CHECK_TWEET") return false

    ;(async () => {
      try {
        const base = await getApiBase()
        const resp = await fetch(`${base.replace(/\/$/, "")}/tweets/check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(msg.payload),
        })
        if (!resp.ok) {
          const text = await resp.text()
          sendResponse({ ok: false, error: `HTTP ${resp.status}: ${text.slice(0, 200)}` })
          return
        }
        const data = (await resp.json()) as CheckResponse
        sendResponse({ ok: true, data })

        const sourceCount = data.claims.reduce(
          (n, c) => n + (c.sources?.length || 0),
          0
        )
        try {
          const context = msg.payload.tweet_context
          await saveFeedEntry({
            id: data.tweet_id,
            handle: context?.author_handle ?? msg.payload.author_handle ?? null,
            authorName: context?.author_name ?? null,
            authorAvatarUrl: context?.author_avatar_url ?? null,
            text: data.neutral_text || msg.payload.text,
            rawText: msg.payload.text,
            verdict: data.overall_verdict,
            checkedAt: Date.now(),
            sourceCount,
            url: msg.payload.url ?? null,
            claims: data.claims ?? [],
          })
        } catch {
          // storage errors shouldn't break the response flow
        }
      } catch (err) {
        sendResponse({ ok: false, error: String((err as Error).message || err) })
      }
    })()

    return true
  }
)
