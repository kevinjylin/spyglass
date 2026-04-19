"use client"

import { useEffect, useRef } from "react"
import * as d3 from "d3"
import type { FalseTweetView } from "@/lib/types"

interface Props {
  data: FalseTweetView[]
  avgFalse: number | null
  avgOther: number | null
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`
  return n.toLocaleString()
}

function labelFor(t: FalseTweetView): string {
  if (t.handle) return `@${t.handle}`
  if (t.authorName) return t.authorName
  return t.snippet || t.id.slice(0, 8)
}

export function FalseTweetViews({ data, avgFalse, avgOther }: Props) {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    d3.select(el).selectAll("*").remove()
    if (!data.length) return

    // Layout
    const ROW_H = 22
    const ROW_GAP = 6
    const LABEL_W = 120
    const VALUE_W = 56
    const PAD_L = 4
    const PAD_R = 4
    const W = 500
    const H = data.length * (ROW_H + ROW_GAP) + 8

    const svg = d3
      .select(el)
      .attr("viewBox", `0 0 ${W} ${H}`)
      .attr("preserveAspectRatio", "xMinYMin meet")
      .attr("width", "100%")

    // Hatched bar pattern, matching the folio aesthetic
    const defs = svg.append("defs")
    const pat = defs
      .append("pattern")
      .attr("id", "ftHatch")
      .attr("patternUnits", "userSpaceOnUse")
      .attr("width", 5)
      .attr("height", 5)
      .attr("patternTransform", "rotate(45)")
    pat
      .append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 0)
      .attr("y2", 5)
      .attr("stroke", "#1a1612")
      .attr("stroke-width", 1.4)

    const barAreaX = PAD_L + LABEL_W + 8
    const barAreaW = W - barAreaX - VALUE_W - PAD_R

    const maxV = d3.max(data, (d) => d.views) ?? 1
    const x = d3.scaleLinear().domain([0, Math.max(maxV, 1)]).range([0, barAreaW])

    // Reference line: average views for non-false tweets
    if (avgOther != null && avgOther > 0 && avgOther <= maxV) {
      const rx = barAreaX + x(avgOther)
      svg
        .append("line")
        .attr("x1", rx)
        .attr("x2", rx)
        .attr("y1", 0)
        .attr("y2", H - 4)
        .attr("stroke", "#1a1612")
        .attr("stroke-width", 0.8)
        .attr("stroke-dasharray", "3 3")
        .attr("opacity", 0.45)

      svg
        .append("text")
        .attr("x", rx + 4)
        .attr("y", 10)
        .attr("font-family", "var(--font-mono)")
        .attr("font-size", 9)
        .attr("font-weight", 600)
        .attr("letter-spacing", ".12em")
        .attr("text-transform", "uppercase")
        .attr("fill", "#1a1612")
        .attr("opacity", 0.55)
        .text(`avg · non-false (${compact(avgOther)})`)
    }

    const rows = svg
      .selectAll("g.row")
      .data(data)
      .join("g")
      .attr("class", "row")
      .attr("transform", (_, i) => `translate(0, ${i * (ROW_H + ROW_GAP) + 4})`)

    // left label (handle or snippet)
    rows
      .append("text")
      .attr("x", PAD_L)
      .attr("y", ROW_H * 0.68)
      .attr("font-family", "var(--font-mono)")
      .attr("font-size", 10.5)
      .attr("font-weight", 600)
      .attr("fill", "#1a1612")
      .each(function (d) {
        const full = labelFor(d)
        const trimmed = full.length > 18 ? `${full.slice(0, 17)}…` : full
        d3.select(this).text(trimmed).append("title").text(d.snippet || full)
      })

    // bar track (light frame)
    rows
      .append("rect")
      .attr("x", barAreaX)
      .attr("y", 4)
      .attr("width", barAreaW)
      .attr("height", ROW_H - 6)
      .attr("fill", "none")
      .attr("stroke", "#1a1612")
      .attr("stroke-width", 0.5)
      .attr("opacity", 0.35)

    // actual bar (hatched)
    const bars = rows
      .append("rect")
      .attr("x", barAreaX)
      .attr("y", 4)
      .attr("width", (d) => Math.max(x(d.views), 1))
      .attr("height", ROW_H - 6)
      .attr("fill", "url(#ftHatch)")
      .attr("stroke", "#1a1612")
      .attr("stroke-width", 1)
      .style("cursor", (d) => (d.url ? "pointer" : "default"))
      .style("transition", "stroke-width 120ms ease-out, filter 120ms ease-out")

    bars.append("title").text((d) => `${labelFor(d)} · ${d.views.toLocaleString()} views`)

    bars
      .on("mouseenter", function () {
        d3.select(this)
          .attr("stroke-width", 2.2)
          .style("filter", "drop-shadow(0 1px 2px rgba(26,22,18,0.25))")
      })
      .on("mouseleave", function () {
        d3.select(this).attr("stroke-width", 1).style("filter", "none")
      })
      .on("click", function (_, d) {
        if (d.url) window.open(d.url, "_blank", "noopener,noreferrer")
      })

    // right value label
    rows
      .append("text")
      .attr("x", W - PAD_R)
      .attr("y", ROW_H * 0.68)
      .attr("text-anchor", "end")
      .attr("font-family", "var(--font-mono)")
      .attr("font-size", 10.5)
      .attr("font-weight", 700)
      .attr("fill", "#1a1612")
      .attr("font-variant-numeric", "tabular-nums")
      .text((d) => compact(d.views))
  }, [data, avgFalse, avgOther])

  if (!data.length) {
    return (
      <div className="chart-area-ds" style={{ display: "grid", placeItems: "center", padding: 32 }}>
        <p
          className="font-mono-ds"
          style={{
            fontSize: 11,
            letterSpacing: ".2em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
            margin: 0,
            textAlign: "center",
          }}
        >
          No false tweets with view data yet.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Small context strip: false vs non-false averages */}
      {(avgFalse != null || avgOther != null) && (
        <div
          style={{
            display: "flex",
            gap: 20,
            flexWrap: "wrap",
            marginBottom: 12,
            paddingBottom: 10,
            borderBottom: "1px dashed var(--ink-mute)",
          }}
        >
          {avgFalse != null && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span
                className="font-mono-ds"
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: ".2em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                }}
              >
                Avg views · false
              </span>
              <span
                className="font-type"
                style={{ fontSize: 20, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}
              >
                {avgFalse.toLocaleString()}
              </span>
            </div>
          )}
          {avgOther != null && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span
                className="font-mono-ds"
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: ".2em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                }}
              >
                Avg views · other verdicts
              </span>
              <span
                className="font-type"
                style={{ fontSize: 20, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}
              >
                {avgOther.toLocaleString()}
              </span>
            </div>
          )}
          {avgFalse != null && avgOther != null && avgOther > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span
                className="font-mono-ds"
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: ".2em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                }}
              >
                Ratio
              </span>
              <span
                className="font-type"
                style={{ fontSize: 20, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}
              >
                {(avgFalse / avgOther).toFixed(2)}×
              </span>
            </div>
          )}
        </div>
      )}

      <div className="chart-area-ds" style={{ padding: 10 }}>
        <svg ref={ref} style={{ display: "block", width: "100%" }} />
      </div>
    </div>
  )
}
