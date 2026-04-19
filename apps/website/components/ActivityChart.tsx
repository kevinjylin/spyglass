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
    if (!ref.current || !data.length) return
    const el = ref.current
    d3.select(el).selectAll("*").remove()

    const margin = { top: 10, right: 16, bottom: 28, left: 36 }
    const W = 480
    const H = 200
    const iW = W - margin.left - margin.right
    const iH = H - margin.top - margin.bottom

    const svg = d3
      .select(el)
      .attr("viewBox", `0 0 ${W} ${H}`)
      .attr("width", "100%")
      .attr("height", H)

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

    const x = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => new Date(d.date)) as [Date, Date])
      .range([0, iW])

    const y = d3
      .scaleLinear()
      .domain([0, Math.max(d3.max(data, (d) => d.count) ?? 1, 1)])
      .range([iH, 0])
      .nice()

    // Gridlines
    g.append("g")
      .call(d3.axisLeft(y).ticks(4).tickSize(-iW))
      .call((ax) => ax.select(".domain").remove())
      .call((ax) => ax.selectAll(".tick line").attr("stroke", "#f1f5f9").attr("stroke-dasharray", "3,3"))
      .call((ax) => ax.selectAll(".tick text").attr("fill", "#94a3b8").attr("font-size", 10))

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${iH})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(6)
          .tickFormat((d) => d3.timeFormat("%b %d")(d as Date))
      )
      .call((ax) => ax.select(".domain").remove())
      .call((ax) => ax.selectAll(".tick line").remove())
      .call((ax) => ax.selectAll(".tick text").attr("fill", "#94a3b8").attr("font-size", 10))

    // Area fill
    const area = d3
      .area<DailyCount>()
      .x((d) => x(new Date(d.date)))
      .y0(iH)
      .y1((d) => y(d.count))
      .curve(d3.curveCatmullRom.alpha(0.5))

    g.append("path")
      .datum(data)
      .attr("fill", "rgba(99,102,241,0.08)")
      .attr("d", area)

    // Line
    const line = d3
      .line<DailyCount>()
      .x((d) => x(new Date(d.date)))
      .y((d) => y(d.count))
      .curve(d3.curveCatmullRom.alpha(0.5))

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#6366f1")
      .attr("stroke-width", 2)
      .attr("d", line)

    // Dots for non-zero days
    g.selectAll("circle")
      .data(data.filter((d) => d.count > 0))
      .join("circle")
      .attr("cx", (d) => x(new Date(d.date)))
      .attr("cy", (d) => y(d.count))
      .attr("r", 3)
      .attr("fill", "#6366f1")
  }, [data])

  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <div>
      {total === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No activity in the last 30 days.</p>
      ) : (
        <svg ref={ref} className="w-full" />
      )}
    </div>
  )
}
