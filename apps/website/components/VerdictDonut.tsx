"use client"

import { useEffect, useRef } from "react"
import * as d3 from "d3"
import type { VerdictBreakdown } from "@/lib/types"

const PATTERN_IDS: Record<string, string> = {
  true: "vw-h1",
  false: "vw-h2",
  misleading: "vw-h3",
  unverifiable: "vw-h4",
  opinion: "vw-h5",
}

const LABELS: Record<string, string> = {
  true: "True",
  false: "False",
  misleading: "Misleading",
  unverifiable: "Unverifiable",
  opinion: "Opinion",
}

const ORDER: (keyof VerdictBreakdown)[] = [
  "true",
  "false",
  "misleading",
  "unverifiable",
  "opinion",
]

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

    const size = 200
    const radius = size / 2
    const inner = 52

    const svg = d3
      .select(el)
      .attr("viewBox", `0 0 ${size} ${size}`)
      .attr("width", size)
      .attr("height", size)

    const defs = svg.append("defs")

    const patterns: { id: string; rotate: number; mode: "line" | "dot"; stroke: number }[] = [
      { id: "vw-h1", rotate: 45, mode: "line", stroke: 2.4 },
      { id: "vw-h2", rotate: 0, mode: "line", stroke: 1.2 },
      { id: "vw-h3", rotate: 0, mode: "dot", stroke: 0.7 },
      { id: "vw-h4", rotate: 90, mode: "line", stroke: 0.9 },
      { id: "vw-h5", rotate: 135, mode: "line", stroke: 1.6 },
    ]

    patterns.forEach((p) => {
      const pat = defs
        .append("pattern")
        .attr("id", p.id)
        .attr("patternUnits", "userSpaceOnUse")
        .attr("width", 5)
        .attr("height", 5)
        .attr("patternTransform", `rotate(${p.rotate})`)
      if (p.mode === "line") {
        pat
          .append("line")
          .attr("x1", 0)
          .attr("y1", 0)
          .attr("x2", 0)
          .attr("y2", 5)
          .attr("stroke", "#1a1612")
          .attr("stroke-width", p.stroke)
      } else {
        pat
          .append("circle")
          .attr("cx", 2.5)
          .attr("cy", 2.5)
          .attr("r", p.stroke)
          .attr("fill", "#1a1612")
      }
    })

    // outer decorative rings
    svg
      .append("circle")
      .attr("cx", radius)
      .attr("cy", radius)
      .attr("r", radius - 8)
      .attr("fill", "none")
      .attr("stroke", "#1a1612")
      .attr("stroke-width", 1.5)
    svg
      .append("circle")
      .attr("cx", radius)
      .attr("cy", radius)
      .attr("r", radius - 12)
      .attr("fill", "none")
      .attr("stroke", "#1a1612")
      .attr("stroke-width", 0.5)
      .attr("stroke-dasharray", "2 3")

    const entries = ORDER.map((k) => [k, data[k] || 0] as [string, number]).filter(
      ([, v]) => v > 0
    )

    if (entries.length > 0 && total > 0) {
      const pie = d3
        .pie<[string, number]>()
        .value(([, v]) => v)
        .sort(null)
      const arc = d3
        .arc<d3.PieArcDatum<[string, number]>>()
        .innerRadius(inner)
        .outerRadius(radius - 12)

      const g = svg.append("g").attr("transform", `translate(${radius},${radius})`)
      g.selectAll("path")
        .data(pie(entries))
        .join("path")
        .attr("d", arc)
        .attr("fill", (d) => `url(#${PATTERN_IDS[d.data[0]] ?? "vw-h2"})`)
        .attr("stroke", "#1a1612")
        .attr("stroke-width", 1.2)
    } else {
      svg
        .append("circle")
        .attr("cx", radius)
        .attr("cy", radius)
        .attr("r", radius - 12)
        .attr("fill", "#e8decf")
        .attr("stroke", "#1a1612")
        .attr("stroke-width", 1.2)
    }

    // hollow center
    svg
      .append("circle")
      .attr("cx", radius)
      .attr("cy", radius)
      .attr("r", inner)
      .attr("fill", "#e8decf")
      .attr("stroke", "#1a1612")
      .attr("stroke-width", 1.2)

    // N/E/S/W compass ticks
    const ticks: [number, number, number, number][] = [
      [radius, 4, radius, 14],
      [size - 4, radius, size - 14, radius],
      [radius, size - 4, radius, size - 14],
      [4, radius, 14, radius],
    ]
    ticks.forEach(([x1, y1, x2, y2]) =>
      svg
        .append("line")
        .attr("x1", x1)
        .attr("y1", y1)
        .attr("x2", x2)
        .attr("y2", y2)
        .attr("stroke", "#1a1612")
        .attr("stroke-width", 1.5)
    )
  }, [data, total])

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "200px 1fr",
        gap: 28,
        alignItems: "center",
      }}
    >
      <div style={{ position: "relative", width: 200, height: 200 }}>
        <svg ref={ref} style={{ width: "100%", height: "100%" }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            pointerEvents: "none",
          }}
        >
          <div
            className="font-type"
            style={{
              fontSize: 22,
              color: "var(--ink)",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}
          >
            {total.toLocaleString()}
          </div>
          <div
            className="font-mono-ds"
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: ".25em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
            }}
          >
            Intercepts
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {ORDER.map((k) => {
          const value = data[k] || 0
          const pct = total > 0 ? (value / total) * 100 : 0
          return (
            <div key={k} className="key-row">
              <span className="key-dot" />
              <span className="key-label">{LABELS[k]}</span>
              <span className="key-track">
                <span className="key-fill" style={{ width: `${pct}%` }} />
              </span>
              <span className="key-value">{value.toLocaleString()}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
