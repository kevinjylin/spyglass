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
  const containerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<SVGSVGElement>(null)
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({})

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

    const POP = 10
    const OUTER = radius - 12

    // helpers for connector line bookkeeping
    const setConnector = (mid: number, key: string) => {
      const container = containerRef.current
      const overlay = overlayRef.current
      const row = rowRefs.current[key]
      if (!container || !overlay || !row) return
      const cRect = container.getBoundingClientRect()
      const rRect = row.getBoundingClientRect()
      // slice outer edge in container coords (donut SVG occupies 0..200 in col 1)
      const edge = OUTER + POP
      const sx = radius + Math.sin(mid) * edge
      const sy = radius - Math.cos(mid) * edge
      // row endpoint: left edge, vertically centered
      const ex = rRect.left - cRect.left
      const ey = rRect.top - cRect.top + rRect.height / 2
      d3.select(overlay)
        .select<SVGLineElement>("line.vw-connector")
        .attr("x1", sx)
        .attr("y1", sy)
        .attr("x2", ex)
        .attr("y2", ey)
        .style("opacity", 1)
    }
    const clearConnector = () => {
      d3.select(overlayRef.current)
        .select<SVGLineElement>("line.vw-connector")
        .style("opacity", 0)
    }
    const boldRow = (key: string, on: boolean) => {
      const row = rowRefs.current[key]
      if (row) row.classList.toggle("vw-row-active", on)
    }

    if (entries.length > 0 && total > 0) {
      const pie = d3
        .pie<[string, number]>()
        .value(([, v]) => v)
        .sort(null)
      const arc = d3
        .arc<d3.PieArcDatum<[string, number]>>()
        .innerRadius(inner)
        .outerRadius(OUTER)

      const g = svg.append("g").attr("transform", `translate(${radius},${radius})`)
      const paths = g
        .selectAll("path")
        .data(pie(entries))
        .join("path")
        .attr("d", arc)
        .attr("fill", (d) => `url(#${PATTERN_IDS[d.data[0]] ?? "vw-h2"})`)
        .attr("stroke", "#1a1612")
        .attr("stroke-width", 1.2)
        .style("cursor", "pointer")
        .style(
          "transition",
          "transform 180ms ease-out, filter 180ms ease-out, stroke-width 120ms ease-out"
        )

      // native SVG tooltip (verdict + count)
      paths.append("title").text(
        (d) =>
          `${LABELS[d.data[0]] ?? d.data[0]} · ${d.data[1].toLocaleString()} (${
            total > 0 ? Math.round((d.data[1] / total) * 100) : 0
          }%)`
      )

      paths
        .on("mouseenter", function (_, d) {
          const key = d.data[0]
          const mid = (d.startAngle + d.endAngle) / 2
          const tx = Math.sin(mid) * POP
          const ty = -Math.cos(mid) * POP
          d3.select(this)
            .style("transform", `translate(${tx}px, ${ty}px)`)
            .style("filter", "drop-shadow(0 2px 3px rgba(26,22,18,0.25))")
            .attr("stroke-width", 2.6) // bolded outline
            .raise()
          setConnector(mid, key)
          boldRow(key, true)
        })
        .on("mouseleave", function (_, d) {
          const key = d.data[0]
          d3.select(this)
            .style("transform", "translate(0, 0)")
            .style("filter", "none")
            .attr("stroke-width", 1.2)
          clearConnector()
          boldRow(key, false)
        })
    } else {
      svg
        .append("circle")
        .attr("cx", radius)
        .attr("cy", radius)
        .attr("r", OUTER)
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
      ref={containerRef}
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: "200px 1fr",
        gap: 28,
        alignItems: "center",
      }}
    >
      {/* Overlay SVG for leader line — spans the whole container */}
      <svg
        ref={overlayRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 3,
          overflow: "visible",
        }}
      >
        <line
          className="vw-connector"
          stroke="#1a1612"
          strokeWidth={1.2}
          strokeLinecap="round"
          style={{ opacity: 0, transition: "opacity 150ms ease-out" }}
        />
      </svg>

      {/* Scoped styles for the active-row bold state */}
      <style>{`
        .vw-row-active .key-label,
        .vw-row-active .key-value {
          font-weight: 700;
          color: var(--ink);
        }
        .vw-row-active .key-dot {
          transform: scale(1.25);
        }
        .key-row {
          transition: color 150ms ease-out;
        }
        .key-dot {
          transition: transform 150ms ease-out;
        }
      `}</style>

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
            <div
              key={k}
              ref={(el) => {
                rowRefs.current[k] = el
              }}
              className="key-row"
            >
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
