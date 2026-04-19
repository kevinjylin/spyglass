import type { Verdict } from "~lib/types"

export interface HighlightSpec {
  claimIndex: number
  sourceSpan: string
  verdict: Verdict
  explanation: string
  claimText: string
}

export interface HighlightHandle {
  refresh: () => void
  destroy: () => void
}

type HoverCallback = (
  spec: HighlightSpec | null,
  anchorRect: DOMRect | null,
) => void

const HIGHLIGHT_CLASS = "spyglass-highlight"
const MARKER_ATTR = "data-spyglass-highlighted"
const CLAIM_INDEX_ATTR = "data-claim-index"
const MIN_SPAN_LEN = 3
const STYLE_ID = "spyglass-highlight-styles"

const HIGHLIGHT_CSS = `
.${HIGHLIGHT_CLASS} {
  border-radius: 2px;
  padding: 0 1px;
  cursor: help;
  transition: background-color 120ms ease;
}
.${HIGHLIGHT_CLASS}:hover,
.${HIGHLIGHT_CLASS}:focus-visible {
  outline: none;
  filter: brightness(0.95);
}
.spyglass-verdict-true        { background: rgba(21,128,61,.18);   box-shadow: inset 0 -2px 0 #15803d; }
.spyglass-verdict-false       { background: rgba(185,28,28,.22);   box-shadow: inset 0 -2px 0 #b91c1c; }
.spyglass-verdict-misleading  { background: rgba(180,83,9,.22);    box-shadow: inset 0 -2px 0 #b45309; }
.spyglass-verdict-unverifiable{ background: rgba(107,114,128,.20); box-shadow: inset 0 -2px 0 #6b7280; }
.spyglass-verdict-opinion     { background: rgba(29,78,216,.16);   box-shadow: inset 0 -2px 0 #1d4ed8; }
`

function ensurePageStyles(): void {
  if (document.getElementById(STYLE_ID)) return
  const el = document.createElement("style")
  el.id = STYLE_ID
  el.textContent = HIGHLIGHT_CSS
  document.head.appendChild(el)
}

interface Hit {
  start: number
  end: number
  spec: HighlightSpec
}

function overlaps(range: [number, number], claimed: Array<[number, number]>): boolean {
  for (const [s, e] of claimed) {
    if (range[0] < e && range[1] > s) return true
  }
  return false
}

function locate(
  offset: number,
  nodeStarts: number[],
): { nodeIdx: number; local: number } {
  let lo = 0
  let hi = nodeStarts.length - 1
  let idx = 0
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (nodeStarts[mid] <= offset) {
      idx = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return { nodeIdx: idx, local: offset - nodeStarts[idx] }
}

export function installHighlights(
  tweetTextEl: HTMLElement,
  specs: HighlightSpec[],
  onHover: HoverCallback,
): HighlightHandle {
  ensurePageStyles()

  const wrappers: HTMLSpanElement[] = []
  let observer: MutationObserver | null = null
  let refreshScheduled = false
  let destroyed = false

  function unwrapAll(): void {
    for (const span of wrappers) {
      const parent = span.parentNode
      if (!parent) continue
      while (span.firstChild) parent.insertBefore(span.firstChild, span)
      parent.removeChild(span)
      if (parent instanceof Element) parent.normalize()
    }
    wrappers.length = 0
    tweetTextEl.removeAttribute(MARKER_ATTR)
  }

  function wrapTextNode(textNode: Text, spec: HighlightSpec): void {
    const parent = textNode.parentNode
    if (!parent) return
    const span = document.createElement("span")
    span.className = `${HIGHLIGHT_CLASS} spyglass-verdict-${spec.verdict}`
    span.setAttribute(CLAIM_INDEX_ATTR, String(spec.claimIndex))
    span.setAttribute("tabindex", "0")
    parent.insertBefore(span, textNode)
    span.appendChild(textNode)
    wrappers.push(span)
  }

  function wrapRange(
    textNodes: Text[],
    nodeStarts: number[],
    hit: Hit,
  ): void {
    const { nodeIdx: sIdx, local: sOff } = locate(hit.start, nodeStarts)
    const { nodeIdx: eIdx, local: eOff } = locate(hit.end, nodeStarts)

    if (sIdx === eIdx) {
      const node = textNodes[sIdx]
      const len = node.nodeValue?.length ?? 0
      let middle: Text = node
      if (sOff > 0) middle = node.splitText(sOff)
      if (eOff - sOff < middle.nodeValue!.length) {
        middle.splitText(eOff - sOff)
      }
      wrapTextNode(middle, hit.spec)
      return
    }

    // Multi-node: wrap trailing of start, all middle nodes, leading of end.
    const startNode = textNodes[sIdx]
    const startTail = sOff > 0 ? startNode.splitText(sOff) : startNode
    wrapTextNode(startTail, hit.spec)
    for (let i = sIdx + 1; i < eIdx; i++) {
      wrapTextNode(textNodes[i], hit.spec)
    }
    const endNode = textNodes[eIdx]
    if (eOff < (endNode.nodeValue?.length ?? 0)) {
      endNode.splitText(eOff)
    }
    wrapTextNode(endNode, hit.spec)
  }

  function applyHighlights(): void {
    if (destroyed) return
    if (tweetTextEl.getAttribute(MARKER_ATTR) === "1") return

    // Collect text nodes + offset map, skipping those already inside our highlights.
    const textNodes: Text[] = []
    const nodeStarts: number[] = []
    let buffer = ""
    const walker = document.createTreeWalker(tweetTextEl, NodeFilter.SHOW_TEXT)
    let node: Node | null = walker.nextNode()
    while (node) {
      const parent = (node as Text).parentElement
      if (!parent || !parent.closest(`.${HIGHLIGHT_CLASS}`)) {
        nodeStarts.push(buffer.length)
        textNodes.push(node as Text)
        buffer += (node as Text).nodeValue ?? ""
      }
      node = walker.nextNode()
    }

    if (buffer.length === 0) return

    const sorted = specs
      .filter((s) => s.sourceSpan && s.sourceSpan.length >= MIN_SPAN_LEN)
      .slice()
      .sort((a, b) => b.sourceSpan.length - a.sourceSpan.length)

    const claimed: Array<[number, number]> = []
    const hits: Hit[] = []

    for (const spec of sorted) {
      let from = 0
      while (true) {
        const idx = buffer.indexOf(spec.sourceSpan, from)
        if (idx === -1) break
        const range: [number, number] = [idx, idx + spec.sourceSpan.length]
        if (!overlaps(range, claimed)) {
          hits.push({ start: range[0], end: range[1], spec })
          claimed.push(range)
          break
        }
        from = idx + 1
      }
    }

    if (hits.length === 0) return

    // Apply in reverse document order so earlier offsets remain valid.
    hits.sort((a, b) => b.start - a.start)
    for (const hit of hits) {
      wrapRange(textNodes, nodeStarts, hit)
    }

    tweetTextEl.setAttribute(MARKER_ATTR, "1")
  }

  function scheduleRefresh(): void {
    if (refreshScheduled || destroyed) return
    refreshScheduled = true
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        refreshScheduled = false
        if (destroyed) return
        refresh()
      }, 50)
    })
  }

  function refresh(): void {
    if (destroyed) return
    // Pause observer while we mutate the DOM.
    observer?.disconnect()
    try {
      unwrapAll()
      applyHighlights()
    } finally {
      observer?.observe(tweetTextEl, {
        subtree: true,
        childList: true,
        characterData: true,
      })
    }
  }

  // --- Hover delegation ---

  function findHighlight(target: EventTarget | null): HTMLElement | null {
    if (!(target instanceof Element)) return null
    const el = target.closest(`.${HIGHLIGHT_CLASS}`)
    if (!el || !tweetTextEl.contains(el)) return null
    return el as HTMLElement
  }

  function specFor(el: HTMLElement): HighlightSpec | null {
    const raw = el.getAttribute(CLAIM_INDEX_ATTR)
    if (raw == null) return null
    const idx = Number(raw)
    const spec = specs.find((s) => s.claimIndex === idx)
    return spec ?? null
  }

  function onMouseOver(ev: Event): void {
    const el = findHighlight(ev.target)
    if (!el) return
    const spec = specFor(el)
    if (!spec) return
    onHover(spec, el.getBoundingClientRect())
  }

  function onMouseOut(ev: MouseEvent): void {
    const from = findHighlight(ev.target)
    if (!from) return
    const to = findHighlight(ev.relatedTarget)
    if (to) return
    onHover(null, null)
  }

  function onFocusIn(ev: Event): void {
    const el = findHighlight(ev.target)
    if (!el) return
    const spec = specFor(el)
    if (!spec) return
    onHover(spec, el.getBoundingClientRect())
  }

  function onFocusOut(ev: FocusEvent): void {
    const from = findHighlight(ev.target)
    if (!from) return
    const to = findHighlight(ev.relatedTarget)
    if (to) return
    onHover(null, null)
  }

  tweetTextEl.addEventListener("mouseover", onMouseOver)
  tweetTextEl.addEventListener("mouseout", onMouseOut)
  tweetTextEl.addEventListener("focusin", onFocusIn)
  tweetTextEl.addEventListener("focusout", onFocusOut)

  // Initial apply + observer install.
  applyHighlights()
  observer = new MutationObserver((mutations) => {
    if (destroyed) return
    // If any of our wrappers got detached, or the marker disappeared, re-apply.
    if (tweetTextEl.getAttribute(MARKER_ATTR) !== "1") {
      scheduleRefresh()
      return
    }
    for (const m of mutations) {
      if (m.type === "childList") {
        for (const n of Array.from(m.removedNodes)) {
          if (n instanceof HTMLElement && n.classList.contains(HIGHLIGHT_CLASS)) {
            scheduleRefresh()
            return
          }
        }
      }
    }
  })
  observer.observe(tweetTextEl, {
    subtree: true,
    childList: true,
    characterData: true,
  })

  return {
    refresh,
    destroy: () => {
      if (destroyed) return
      destroyed = true
      observer?.disconnect()
      observer = null
      tweetTextEl.removeEventListener("mouseover", onMouseOver)
      tweetTextEl.removeEventListener("mouseout", onMouseOut)
      tweetTextEl.removeEventListener("focusin", onFocusIn)
      tweetTextEl.removeEventListener("focusout", onFocusOut)
      unwrapAll()
    },
  }
}
