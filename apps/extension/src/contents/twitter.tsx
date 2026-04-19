import cssText from "data-text:./twitter.css"
import type { PlasmoCSConfig, PlasmoCSUIProps, PlasmoGetInlineAnchorList } from "plasmo"
import { useEffect, useRef, useState } from "react"

import { VerdictBadge } from "~components/VerdictBadge"
import {
  installHighlights,
  type HighlightHandle,
  type HighlightSpec,
} from "~contents/highlight"
import {
  TWEET_ARTICLE,
  TWEET_TEXT,
  extractAuthorHandle,
  extractTweetId,
  extractTweetText,
  extractTweetUrl,
} from "~contents/selectors"
import { hideTooltip, showTooltip } from "~contents/tooltip"
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

  const handleRef = useRef<HighlightHandle | null>(null)

  useEffect(() => {
    if (state !== "ready" || !data) return
    const el = anchor?.element as HTMLElement | undefined
    if (!el) return

    const specs: HighlightSpec[] = data.claims
      .map((c, i) =>
        c.source_span
          ? {
              claimIndex: i,
              sourceSpan: c.source_span,
              verdict: c.verdict,
              explanation: c.explanation,
              claimText: c.text,
            }
          : null,
      )
      .filter((x): x is HighlightSpec => x !== null)

    if (specs.length === 0) return

    handleRef.current = installHighlights(el, specs, showTooltip)

    return () => {
      handleRef.current?.destroy()
      handleRef.current = null
      hideTooltip()
    }
  }, [state, data, anchor])

  return <VerdictBadge state={state} data={data} error={error} />
}

export default Badge
