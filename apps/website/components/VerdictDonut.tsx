"use client"

import { useEffect, useRef } from "react"
import * as d3 from "d3"
import type { VerdictBreakdown } from "@/lib/types"

const COLORS: Record<string, string> = {
  true: "#22c55e",
  false: "#ef4444",
  misleading: "#f59e0b",
  unverifiable: "#94a3b8",
  opinion: "#3b82f6",
}

const LABELS: Record<string, string> = {
  true: "True",
  false: "False",
  misleading: "Misleading",
  unverifiable: "Unverifiable",
  opinion: "Opinion",
}

interface Props {
  data: VerdictBreakdown
  total: number
}

export function VerdictDonut({ data, total }: Props) {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    d3.select(el).selectAll("*").remove()

    const entries = (Object.entries(data) as [string, number][]).filter(([, v]) => v > 0)
    if (!entries.length) return

    const size = 220
    const radius = size / 2
    const inner = radius * 0.58

    const svg = d3
      .select(el)
      .attr("viewBox", `0 0 ${size} ${size}`)
      .attr("width", size)
      .attr("height", size)

    const g = svg.append("g").attr("transform", `translate(${radius},${radius})`)

    const pie = d3.pie<[string, number]>().value(([, v]) => v).sort(null).padAngle(0.02)
    const arc = d3
      .arc<d3.PieArcDatum<[string, number]>>()
      .innerRadius(inner)
      .outerRadius(radius - 4)
      .cornerRadius(3)

    g.selectAll("path")
      .data(pie(entries))
      .join("path")
      .attr("d", arc)
      .attr("fill", (d) => COLORS[d.data[0]] ?? "#94a3b8")

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.3em")
      .attr("font-size", "26")
      .attr("font-weight", "700")
      .attr("fill", "#0f172a")
      .text(total.toLocaleString())

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1.2em")
      .attr("font-size", "10")
      .attr("fill", "#94a3b8")
      .attr("font-weight", "500")
      .attr("letter-spacing", "0.05em")
      .text("TWEETS")
  }, [data, total])

  const entries = Object.entries(data) as [string, number][]

  return (
    <div className="flex flex-col sm:flex-row items-center gap-8">
      <svg ref={ref} className="shrink-0" />
      <div className="w-full space-y-2.5">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center gap-3 text-sm">
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{ background: COLORS[key] }}
            />
            <span className="text-slate-600 w-28">{LABELS[key]}</span>
            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: total > 0 ? `${(value / total) * 100}%` : "0%",
                  background: COLORS[key],
                }}
              />
            </div>
            <span className="font-semibold text-slate-900 w-12 text-right tabular-nums">
              {value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
