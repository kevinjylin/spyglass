import { getApiBase } from "~lib/storage"
import type { CheckRequest, CheckResponse } from "~lib/types"

interface CheckMessage {
  type: "CHECK_TWEET"
  payload: CheckRequest
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
      } catch (err) {
        sendResponse({ ok: false, error: String((err as Error).message || err) })
      }
    })()

    return true
  }
)
