// X / Twitter DOM selectors. These are brittle by nature — when X changes
// markup, update here. Verified against twitter.com / x.com timeline as of
// early 2026; review periodically.

import type { TweetContext, TweetLink } from "~lib/types"

export const TWEET_ARTICLE = 'article[data-testid="tweet"]'
export const TWEET_TEXT = '[data-testid="tweetText"]'
export const TWEET_PERMALINK = 'a[href*="/status/"][role="link"]'
export const USER_NAME_LINK = 'a[role="link"][href^="/"]'
const USER_NAME = '[data-testid="User-Name"]'
const USER_AVATAR = '[data-testid="Tweet-User-Avatar"] img'

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

/** Prefer <time> inside the permalink (avoids nested quote cards). */
export function extractTweetPostedAt(article: Element): string | null {
  const linkScoped = article.querySelector(`${TWEET_PERMALINK} time[datetime]`)
  const t = linkScoped || article.querySelector("time[datetime]")
  const raw = t?.getAttribute("datetime") || ""
  if (!raw) return null
  const ms = Date.parse(raw)
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null
}

function cleanText(value: string | null | undefined): string | null {
  const text = (value || "").replace(/\s+/g, " ").trim()
  return text || null
}

function normalizeHttpUrl(value: string | null | undefined): string | null {
  const raw = cleanText(value)
  if (!raw) return null
  try {
    const url = new URL(raw, window.location.origin)
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null
  } catch {
    return null
  }
}

function unique(values: Array<string | null>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

function parseCompactCount(value: string | null | undefined): number | null {
  const text = cleanText(value)
  if (!text) return null
  const match = text.match(/([\d,.]+)\s*([KMB])?/i)
  if (!match) return null
  const raw = Number(match[1].replace(/,/g, ""))
  if (!Number.isFinite(raw)) return null
  const suffix = (match[2] || "").toUpperCase()
  const multiplier = suffix === "K" ? 1_000 : suffix === "M" ? 1_000_000 : suffix === "B" ? 1_000_000_000 : 1
  return Math.round(raw * multiplier)
}

function countFromElement(el: Element, labelRe?: RegExp): number | null {
  const aria = cleanText(el.getAttribute("aria-label"))
  if (aria && (!labelRe || labelRe.test(aria))) {
    const count = parseCompactCount(aria)
    if (count !== null) return count
  }
  const text = cleanText(el.textContent)
  if (text && (!labelRe || labelRe.test(text) || !/[a-z]/i.test(text))) {
    return parseCompactCount(text)
  }
  return null
}

function extractCount(article: Element, selectors: string[], labelRe?: RegExp): number | null {
  for (const selector of selectors) {
    const elements = Array.from(article.querySelectorAll(selector))
    for (const el of elements) {
      const count = countFromElement(el, labelRe)
      if (count !== null) return count
    }
  }
  return null
}

function extractAuthorName(article: Element, handle: string | null): string | null {
  const block = article.querySelector(USER_NAME)
  const spans = Array.from(block?.querySelectorAll("span") || [])
  const normalizedHandle = handle ? `@${handle.replace(/^@/, "")}`.toLowerCase() : null
  for (const span of spans) {
    const text = cleanText(span.textContent)
    if (!text) continue
    const lower = text.toLowerCase()
    if (normalizedHandle && lower === normalizedHandle) continue
    if (text.startsWith("@") || text === "·" || /^\d+[smhd]$/.test(text)) continue
    return text
  }
  return null
}

function extractAuthorAvatarUrl(article: Element): string | null {
  const img =
    article.querySelector<HTMLImageElement>(USER_AVATAR) ||
    article.querySelector<HTMLImageElement>('img[src*="profile_images"]')
  return normalizeHttpUrl(img?.currentSrc || img?.src)
}

function extractMediaUrls(article: Element): string[] {
  const imageUrls = Array.from(
    article.querySelectorAll<HTMLImageElement>(
      '[data-testid="tweetPhoto"] img, img[src*="/media/"], img[src*="twimg.com/media"]',
    ),
  )
    .map((img) => normalizeHttpUrl(img.currentSrc || img.src))
    .filter((url): url is string => Boolean(url) && !url.includes("/profile_images/"))

  const posterUrls = Array.from(article.querySelectorAll<HTMLVideoElement>("video[poster]"))
    .map((video) => normalizeHttpUrl(video.poster))
    .filter((url): url is string => Boolean(url))

  return unique([...imageUrls, ...posterUrls])
}

function extractLinks(article: Element): TweetLink[] {
  const tweetText = article.querySelector(TWEET_TEXT)
  if (!tweetText) return []
  const out: TweetLink[] = []
  for (const a of Array.from(tweetText.querySelectorAll<HTMLAnchorElement>("a[href]"))) {
    const url = normalizeHttpUrl(a.href)
    if (!url) continue
    const host = new URL(url).hostname.replace(/^www\./, "")
    if ((host === "x.com" || host === "twitter.com") && !host.endsWith("t.co")) continue
    if (out.some((link) => link.url === url)) continue
    out.push({ url, label: cleanText(a.textContent) || host })
  }
  return out
}

export function extractTweetContext(article: Element): TweetContext {
  const authorHandle = extractAuthorHandle(article)
  const mediaUrls = extractMediaUrls(article)
  return {
    author_name: extractAuthorName(article, authorHandle),
    author_handle: authorHandle,
    author_avatar_url: extractAuthorAvatarUrl(article),
    image_url: mediaUrls[0] || null,
    media_urls: mediaUrls,
    links: extractLinks(article),
    reply_count: extractCount(article, ['[data-testid="reply"]'], /repl/i),
    retweet_count: extractCount(article, ['[data-testid="retweet"]'], /repost|retweet/i),
    quote_count: extractCount(article, ['a[href*="/quotes"]', '[aria-label*="Quote"]'], /quote/i),
    like_count: extractCount(article, ['[data-testid="like"]', '[data-testid="unlike"]'], /like/i),
    view_count: extractCount(
      article,
      ['a[href$="/analytics"]', 'a[aria-label*="views"]', '[aria-label*="Views"]'],
      /view/i,
    ),
    metadata_captured_at: new Date().toISOString(),
    posted_at: extractTweetPostedAt(article),
  }
}
