import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react"
import { createRoot, type Root } from "react-dom/client"

import { COLORS, LABELS } from "~lib/verdict"
import type { HighlightSpec } from "~contents/highlight"

interface TooltipState {
  spec: HighlightSpec | null
  rect: DOMRect | null
}

const listeners = new Set<() => void>()
let state: TooltipState = { spec: null, rect: null }

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function getSnapshot(): TooltipState {
  return state
}

function setState(next: TooltipState): void {
  state = next
  for (const cb of listeners) cb()
}

let mounted = false
let root: Root | null = null

function ensureMounted(): void {
  if (mounted) return
  mounted = true
  const host = document.createElement("div")
  host.id = "spyglass-tooltip-root"
  host.style.position = "fixed"
  host.style.top = "0"
  host.style.left = "0"
  host.style.zIndex = "2147483647"
  host.style.pointerEvents = "none"
  document.body.appendChild(host)
  root = createRoot(host)
  root.render(<SpyglassTooltip />)
}

export function showTooltip(
  spec: HighlightSpec | null,
  rect: DOMRect | null,
): void {
  ensureMounted()
  setState({ spec, rect })
}

export function hideTooltip(): void {
  setState({ spec: null, rect: null })
}

function SpyglassTooltip() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const ref = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!snap.spec || !snap.rect || !ref.current) {
      setPos(null)
      return
    }
    const el = ref.current
    const tw = el.offsetWidth
    const th = el.offsetHeight
    const gap = 8
    const anchor = snap.rect
    const vw = window.innerWidth
    const vh = window.innerHeight

    let top = anchor.top - th - gap
    if (top < 8) top = Math.min(anchor.bottom + gap, vh - th - 8)
    let left = anchor.left + anchor.width / 2 - tw / 2
    left = Math.max(8, Math.min(left, vw - tw - 8))
    setPos({ top, left })
  }, [snap])

  if (!snap.spec || !snap.rect) return null
  const spec = snap.spec

  const style: React.CSSProperties = {
    position: "fixed",
    top: pos?.top ?? -9999,
    left: pos?.left ?? -9999,
    visibility: pos ? "visible" : "hidden",
    maxWidth: 360,
    padding: "8px 10px",
    background: "white",
    color: "#111827",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
    fontSize: 12,
    lineHeight: 1.4,
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    pointerEvents: "none",
  }

  return (
    <div ref={ref} style={style}>
      <div
        style={{
          color: COLORS[spec.verdict],
          fontWeight: 700,
          marginBottom: 4,
        }}>
        {LABELS[spec.verdict]}
      </div>
      <div style={{ fontStyle: "italic", marginBottom: 4 }}>
        {spec.claimText}
      </div>
      {spec.explanation ? (
        <div style={{ color: "#4b5563" }}>{spec.explanation}</div>
      ) : null}
    </div>
  )
}
