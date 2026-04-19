"use client"

import { useEffect, useRef } from "react"
import * as d3 from "d3"
import type { DailyCount } from "@/lib/types"

interface Props {
  data: DailyCount[]
}

export function ActivityChart({ data }: Props) {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    d3.select(el).selectAll("*").remove()

    if (!data.length) return

    const W = 500
    const H = 200
    const svg = d3
      .select(el)
      .attr("viewBox", `0 0 ${W} ${H}`)
      .attr("preserveAspectRatio", "none")

    const defs = svg.append("defs")
    const pat = defs
      .append("pattern")
      .attr("id", "areaHatch")
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
      .attr("stroke-width", 0.7)
      .attr("opacity", 0.25)

    const x = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => new Date(d.date)) as [Date, Date])
      .range([0, W])

    const maxV = Math.max(d3.max(data, (d) => d.count) ?? 1, 1)
    const y = d3.scaleLinear().domain([0, maxV]).range([H - 20, 14]).nice()

    const line = d3
      .line<DailyCount>()
      .x((d) => x(new Date(d.date)))
      .y((d) => y(d.count))
      .curve(d3.curveMonotoneX)

    const area = d3
      .area<DailyCount>()
      .x((d) => x(new Date(d.date)))
      .y0(H)
      .y1((d) => y(d.count))
      .curve(d3.curveMonotoneX)

    svg.append("path").datum(data).attr("fill", "url(#areaHatch)").attr("d", area)
    svg
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#1a1612")
      .attr("stroke-width", 1.6)
      .attr("d", line)

    // data ticks on days with non-zero counts (sample up to 4 evenly)
    const active = data.filter((d) => d.count > 0)
    const sampled =
      active.length > 4
        ? [0, 1, 2, 3].map((i) => active[Math.floor(((active.length - 1) * i) / 3)])
        : active
    svg
      .append("g")
      .attr("fill", "#1a1612")
      .selectAll("circle")
      .data(sampled)
      .join("circle")
      .attr("cx", (d) => x(new Date(d.date)))
      .attr("cy", (d) => y(d.count))
      .attr("r", 2.5)
  }, [data])

  const total = data.reduce((s, d) => s + d.count, 0)

  if (total === 0) {
    return (
      <div className="chart-area-ds" style={{ display: "grid", placeItems: "center" }}>
        <p
          className="font-mono-ds"
          style={{
            fontSize: 11,
            letterSpacing: ".2em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
            margin: 0,
          }}
        >
          No transmissions in last 30 days
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="chart-area-ds">
        <svg ref={ref} />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 8,
        }}
      >
        {["W-04", "W-03", "W-02", "W-01", "NOW"].map((l) => (
          <span
            key={l}
            className="font-mono-ds"
            style={{
              fontSize: 9.5,
              fontWeight: 600,
              letterSpacing: ".16em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
            }}
          >
            {l}
          </span>
        ))}
      </div>
    </div>
  )
}
