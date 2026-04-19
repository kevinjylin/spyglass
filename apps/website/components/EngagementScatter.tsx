"use client"

import { useEffect, useRef } from "react"
import * as d3 from "d3"
import type { EngagementPoint } from "@/lib/types"

interface Props {
  data: EngagementPoint[]
  /** Drop the top N extreme points by max(retweets, likes) so the cluster reads better. */
  trimOutliers?: number
}

const TRUE_COLOR = "#2d5e3f" // muted green
const FALSE_COLOR = "#991b1b" // stamp red (matches var(--stamp))
const INK = "#1a1612"

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`
  return n.toLocaleString()
}

function labelFor(p: EngagementPoint): string {
  if (p.handle) return `@${p.handle}`
  if (p.authorName) return p.authorName
  return p.id.slice(0, 8)
}

export function EngagementScatter({ data, trimOutliers = 0 }: Props) {
  const ref = useRef<SVGSVGElement>(null)

  // Drop the top N points by max(retweets, likes) — these single outliers
  // compress everyone else into the bottom-left corner and hide the real cluster.
  const trimmed =
    trimOutliers > 0 && data.length > trimOutliers
      ? [...data]
          .sort((a, b) => Math.max(b.retweets, b.likes) - Math.max(a.retweets, a.likes))
          .slice(trimOutliers)
      : data

  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    d3.select(el).selectAll("*").remove()
    if (!trimmed.length) return

    const W = 720
    const H = 420
    const M = { top: 20, right: 20, bottom: 44, left: 56 }
    const plotW = W - M.left - M.right
    const plotH = H - M.top - M.bottom

    const svg = d3
      .select(el)
      .attr("viewBox", `0 0 ${W} ${H}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("width", "100%")

    const plot = svg.append("g").attr("transform", `translate(${M.left},${M.top})`)

    // Domains — use sqrt (power) scale to tame the long tail while keeping zeros visible
    const maxRT = d3.max(trimmed, (d) => d.retweets) ?? 1
    const maxLK = d3.max(trimmed, (d) => d.likes) ?? 1

    const x = d3.scalePow().exponent(0.5).domain([0, Math.max(maxRT, 1)]).range([0, plotW]).nice()
    const y = d3.scalePow().exponent(0.5).domain([0, Math.max(maxLK, 1)]).range([plotH, 0]).nice()

    // Grid
    const xTicks = x.ticks(6)
    const yTicks = y.ticks(6)

    plot
      .append("g")
      .attr("class", "grid-x")
      .selectAll("line")
      .data(xTicks)
      .join("line")
      .attr("x1", (t) => x(t))
      .attr("x2", (t) => x(t))
      .attr("y1", 0)
      .attr("y2", plotH)
      .attr("stroke", INK)
      .attr("stroke-width", 0.4)
      .attr("stroke-dasharray", "2 3")
      .attr("opacity", 0.3)

    plot
      .append("g")
      .attr("class", "grid-y")
      .selectAll("line")
      .data(yTicks)
      .join("line")
      .attr("y1", (t) => y(t))
      .attr("y2", (t) => y(t))
      .attr("x1", 0)
      .attr("x2", plotW)
      .attr("stroke", INK)
      .attr("stroke-width", 0.4)
      .attr("stroke-dasharray", "2 3")
      .attr("opacity", 0.3)

    // Axes
    plot
      .append("line") // x axis
      .attr("x1", 0)
      .attr("x2", plotW)
      .attr("y1", plotH)
      .attr("y2", plotH)
      .attr("stroke", INK)
      .attr("stroke-width", 1.2)
    plot
      .append("line") // y axis
      .attr("x1", 0)
      .attr("x2", 0)
      .attr("y1", 0)
      .attr("y2", plotH)
      .attr("stroke", INK)
      .attr("stroke-width", 1.2)

    // Tick labels
    plot
      .append("g")
      .attr("class", "x-ticks")
      .selectAll("text")
      .data(xTicks)
      .join("text")
      .attr("x", (t) => x(t))
      .attr("y", plotH + 16)
      .attr("text-anchor", "middle")
      .attr("font-family", "var(--font-mono)")
      .attr("font-size", 10)
      .attr("font-weight", 500)
      .attr("letter-spacing", ".08em")
      .attr("fill", INK)
      .text((t) => compact(t))

    plot
      .append("g")
      .attr("class", "y-ticks")
      .selectAll("text")
      .data(yTicks)
      .join("text")
      .attr("x", -8)
      .attr("y", (t) => y(t))
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("font-family", "var(--font-mono)")
      .attr("font-size", 10)
      .attr("font-weight", 500)
      .attr("letter-spacing", ".08em")
      .attr("fill", INK)
      .text((t) => compact(t))

    // Axis titles
    plot
      .append("text")
      .attr("x", plotW / 2)
      .attr("y", plotH + 36)
      .attr("text-anchor", "middle")
      .attr("font-family", "var(--font-mono)")
      .attr("font-size", 10.5)
      .attr("font-weight", 700)
      .attr("letter-spacing", ".2em")
      .attr("text-transform", "uppercase")
      .attr("fill", INK)
      .text("Retweets →")

    plot
      .append("text")
      .attr("transform", `translate(-42, ${plotH / 2}) rotate(-90)`)
      .attr("text-anchor", "middle")
      .attr("font-family", "var(--font-mono)")
      .attr("font-size", 10.5)
      .attr("font-weight", 700)
      .attr("letter-spacing", ".2em")
      .attr("text-transform", "uppercase")
      .attr("fill", INK)
      .text("Likes →")

    // Points — draw FALSE on top so they're visible amid the dense TRUE cloud
    const sorted = [...trimmed].sort((a) =>
      a.verdict === "false" ? 1 : -1
    )

    const dots = plot
      .append("g")
      .attr("class", "dots")
      .selectAll("circle")
      .data(sorted)
      .join("circle")
      .attr("cx", (d) => x(d.retweets))
      .attr("cy", (d) => y(d.likes))
      .attr("r", 5)
      .attr("fill", (d) => (d.verdict === "false" ? FALSE_COLOR : "transparent"))
      .attr("fill-opacity", 0.85)
      .attr("stroke", (d) => (d.verdict === "false" ? FALSE_COLOR : TRUE_COLOR))
      .attr("stroke-width", 1.5)
      .style("cursor", (d) => (d.url ? "pointer" : "default"))
      .style("transition", "r 120ms ease-out, stroke-width 120ms ease-out")

    dots
      .append("title")
      .text(
        (d) =>
          `${labelFor(d)} · ${d.verdict.toUpperCase()}\nRetweets: ${d.retweets.toLocaleString()}\nLikes: ${d.likes.toLocaleString()}\n${d.snippet}`
      )

    dots
      .on("mouseenter", function () {
        d3.select(this)
          .attr("r", 8)
          .attr("stroke-width", 2.4)
          .raise()
      })
      .on("mouseleave", function () {
        d3.select(this).attr("r", 5).attr("stroke-width", 1.5)
      })
      .on("click", function (_, d) {
        if (d.url) window.open(d.url, "_blank", "noopener,noreferrer")
      })

    // Legend (top-right corner of plot)
    const legend = plot.append("g").attr("transform", `translate(${plotW - 160}, 8)`)

    legend
      .append("rect")
      .attr("x", -8)
      .attr("y", -6)
      .attr("width", 160)
      .attr("height", 42)
      .attr("fill", "#fff")
      .attr("fill-opacity", 0.75)
      .attr("stroke", INK)
      .attr("stroke-width", 0.6)

    // True sample
    legend
      .append("circle")
      .attr("cx", 6)
      .attr("cy", 6)
      .attr("r", 5)
      .attr("fill", "transparent")
      .attr("stroke", TRUE_COLOR)
      .attr("stroke-width", 1.5)
    legend
      .append("text")
      .attr("x", 18)
      .attr("y", 9)
      .attr("font-family", "var(--font-mono)")
      .attr("font-size", 10.5)
      .attr("font-weight", 600)
      .attr("fill", INK)
      .text(
        `True  (${trimmed.filter((d) => d.verdict === "true").length.toLocaleString()})`
      )

    // False sample
    legend
      .append("circle")
      .attr("cx", 6)
      .attr("cy", 26)
      .attr("r", 5)
      .attr("fill", FALSE_COLOR)
      .attr("fill-opacity", 0.85)
      .attr("stroke", FALSE_COLOR)
      .attr("stroke-width", 1.5)
    legend
      .append("text")
      .attr("x", 18)
      .attr("y", 29)
      .attr("font-family", "var(--font-mono)")
      .attr("font-size", 10.5)
      .attr("font-weight", 600)
      .attr("fill", INK)
      .text(
        `False (${trimmed.filter((d) => d.verdict === "false").length.toLocaleString()})`
      )
  }, [trimmed])

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
          No true/false tweets with engagement data yet.
        </p>
      </div>
    )
  }

  return (
    <div className="chart-area-ds" style={{ padding: 12 }}>
      <svg ref={ref} style={{ display: "block", width: "100%" }} />
    </div>
  )
}
