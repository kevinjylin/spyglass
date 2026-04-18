// X / Twitter DOM selectors. These are brittle by nature — when X changes
// markup, update here. Verified against twitter.com / x.com timeline as of
// early 2026; review periodically.

export const TWEET_ARTICLE = 'article[data-testid="tweet"]'
export const TWEET_TEXT = '[data-testid="tweetText"]'
export const TWEET_PERMALINK = 'a[href*="/status/"][role="link"]'
export const USER_NAME_LINK = 'a[role="link"][href^="/"]'

export function extractTweetId(article: Element): string | null {
  const link = article.querySelector<HTMLAnchorElement>(TWEET_PERMALINK)
  const href = link?.getAttribute("href") || ""
  const m = href.match(/\/status\/(\d+)/)
  return m ? m[1] : null
}

export function extractAuthorHandle(article: Element): string | null {
  const links = article.querySelectorAll<HTMLAnchorElement>(USER_NAME_LINK)
  for (const a of Array.from(links)) {
    const href = a.getAttribute("href") || ""
    if (/^\/[^/]+$/.test(href) && !href.startsWith("/i/") && !href.startsWith("/home")) {
      return href.slice(1)
    }
  }
  return null
}

export function extractTweetText(article: Element): string {
  const node = article.querySelector(TWEET_TEXT)
  return (node?.textContent || "").trim()
}

export function extractTweetUrl(article: Element): string | null {
  const link = article.querySelector<HTMLAnchorElement>(TWEET_PERMALINK)
  if (!link) return null
  return new URL(link.href, window.location.origin).href
}
