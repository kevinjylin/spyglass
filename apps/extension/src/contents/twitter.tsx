import cssText from "data-text:./twitter.css"
import type { PlasmoCSConfig, PlasmoCSUIProps, PlasmoGetInlineAnchorList } from "plasmo"
import { useEffect, useState } from "react"

import { VerdictBadge } from "~components/VerdictBadge"
import {
  TWEET_ARTICLE,
  TWEET_TEXT,
  extractAuthorHandle,
  extractTweetId,
  extractTweetText,
  extractTweetUrl,
} from "~contents/selectors"
import type { CheckResponse } from "~lib/types"

export const config: PlasmoCSConfig = {
  matches: ["https://twitter.com/*", "https://x.com/*"],
  all_frames: false,
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

export const getInlineAnchorList: PlasmoGetInlineAnchorList = () => {
  return Array.from(document.querySelectorAll(`${TWEET_ARTICLE} ${TWEET_TEXT}`)).map(
    (el) => ({ element: el as HTMLElement, insertPosition: "afterend" })
  )
}

const Badge = ({ anchor }: PlasmoCSUIProps) => {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading")
  const [data, setData] = useState<CheckResponse | undefined>()
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    if (!anchor?.element) return
    const article = (anchor.element as HTMLElement).closest(TWEET_ARTICLE)
    if (!article) return

    const tweetId = extractTweetId(article)
    const text = extractTweetText(article)
    if (!tweetId || !text) return

    const payload = {
      tweet_id: tweetId,
      text,
      author_handle: extractAuthorHandle(article),
      url: extractTweetUrl(article),
    }

    chrome.runtime.sendMessage({ type: "CHECK_TWEET", payload }, (resp) => {
      if (chrome.runtime.lastError) {
        setError(chrome.runtime.lastError.message || "runtime error")
        setState("error")
        return
      }
      if (!resp?.ok) {
        setError(resp?.error || "unknown error")
        setState("error")
        return
      }
      setData(resp.data as CheckResponse)
      setState("ready")
    })
  }, [anchor])

  return <VerdictBadge state={state} data={data} error={error} />
}

export default Badge
