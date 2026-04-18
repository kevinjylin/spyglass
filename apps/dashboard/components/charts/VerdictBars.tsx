"use client"

import * as d3 from "d3"
import { useEffect, useRef } from "react"
import type { VerdictBreakdown } from "@/lib/types"

const COLORS: Record<keyof VerdictBreakdown, string> = {
  true: "#15803d",
  false: "#b91c1c",
  misleading: "#b45309",
  unverifiable: "#6b7280",
  opinion: "#1d4ed8",
}

const ORDER: (keyof VerdictBreakdown)[] = [
  "true",
  "misleading",
  "false",
  "unverifiable",
  "opinion",
]

export function VerdictBars({ data }: { data: VerdictBreakdown }) {
  const ref = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const width = 480
    const height = 220
    const margin = { top: 16, right: 16, bottom: 32, left: 40 }

    const svg = d3.select(ref.current)
    svg.selectAll("*").remove()
    svg.attr("viewBox", `0 0 ${width} ${height}`)

    const x = d3
      .scaleBand<string>()
      .domain(ORDER)
      .range([margin.left, width - margin.right])
      .padding(0.2)

    const max = Math.max(1, ...ORDER.map((k) => data[k]))
    const y = d3
      .scaleLinear()
      .domain([0, max])
      .nice()
      .range([height - margin.bottom, margin.top])

    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .call((g) => g.selectAll("text").attr("fill", "#475569"))

    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(4))
      .call((g) => g.selectAll("text").attr("fill", "#475569"))

    svg
      .append("g")
      .selectAll("rect")
      .data(ORDER)
      .join("rect")
      .attr("x", (k) => x(k)!)
      .attr("y", (k) => y(data[k]))
      .attr("width", x.bandwidth())
      .attr("height", (k) => y(0) - y(data[k]))
      .attr("rx", 4)
      .attr("fill", (k) => COLORS[k])
  }, [data])

  return <svg ref={ref} className="w-full max-w-xl" />
}
