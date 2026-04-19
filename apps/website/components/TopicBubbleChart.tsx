"use client"

import { useEffect, useRef } from "react"
import * as d3 from "d3"
import type { TopicCount } from "@/lib/types"

interface Props {
  data: TopicCount[]
}

// A soft red-orange ramp — bigger / hotter bubbles read as "more misinformed"
const GRADIENT_FROM = "#fecaca"
const GRADIENT_TO = "#dc2626"

export function TopicBubbleChart({ data }: Props) {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!ref.current || !data.length) return
    const el = ref.current
    d3.select(el).selectAll("*").remove()

    const W = 720
    const H = 380

    const svg = d3
      .select(el)
      .attr("viewBox", `0 0 ${W} ${H}`)
      .attr("width", "100%")
      .attr("height", H)
      .attr("preserveAspectRatio", "xMidYMid meet")

    type Datum = TopicCount
    type Node = d3.HierarchyCircularNode<Datum>

    const root = d3
      .hierarchy<{ children: Datum[] } & Partial<Datum>>({
        children: data,
      } as never)
      .sum((d) => ((d as Datum).count ?? 0))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

    d3.pack<Datum>().size([W - 4, H - 4]).padding(6)(root as unknown as d3.HierarchyNode<Datum>)

    const leaves = (root as unknown as Node).leaves() as Node[]

    const maxCount = d3.max(data, (d) => d.count) ?? 1
    const minCount = d3.min(data, (d) => d.count) ?? 0
    const color = d3
      .scaleLinear<string>()
      .domain([minCount, maxCount])
      .range([GRADIENT_FROM, GRADIENT_TO])
      .interpolate(d3.interpolateRgb)

    const g = svg
      .append("g")
      .attr("transform", `translate(2,2)`)

    const node = g
      .selectAll<SVGGElement, Node>("g")
      .data(leaves)
      .join("g")
      .attr("transform", (d) => `translate(${d.x},${d.y})`)

    node
      .append("circle")
      .attr("r", (d) => d.r)
      .attr("fill", (d) => color(d.data.count))
      .attr("fill-opacity", 0.92)
      .attr("stroke", "white")
      .attr("stroke-width", 1.5)

    node.append("title").text((d) => `${d.data.topic} — ${d.data.count.toLocaleString()} misinformed claims`)

    // Labels: only render text when the circle has enough room.
    node.each(function (d) {
      const sel = d3.select<SVGGElement, Node>(this)
      const r = d.r
      if (r < 16) return

      const labelSize = Math.min(Math.max(r / 3.6, 10), 18)
      const showCount = r >= 28

      // Truncate long topic labels so they don't overflow the circle.
      const maxChars = Math.max(3, Math.floor((r * 2) / (labelSize * 0.55)))
      const raw = d.data.topic
      const label = raw.length > maxChars ? `${raw.slice(0, maxChars - 1)}…` : raw

      sel
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dy", showCount ? "-0.1em" : "0.35em")
        .attr("font-size", labelSize)
        .attr("font-weight", 600)
        .attr("fill", "white")
        .attr("pointer-events", "none")
        .text(label)

      if (showCount) {
        sel
          .append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "1.1em")
          .attr("font-size", Math.max(labelSize * 0.72, 9))
          .attr("fill", "white")
          .attr("fill-opacity", 0.85)
          .attr("pointer-events", "none")
          .text(d.data.count.toLocaleString())
      }
    })
  }, [data])

  if (!data.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center text-sm text-slate-400">
        No topic data yet. Topics will appear here once claims are classified.
      </div>
    )
  }

  return <svg ref={ref} className="block w-full" />
}
