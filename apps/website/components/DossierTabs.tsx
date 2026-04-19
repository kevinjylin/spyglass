"use client"

import { useState, type ReactNode } from "react"

interface Props {
  intelligence: ReactNode
  intercepts: ReactNode
}

export function DossierTabs({ intelligence, intercepts }: Props) {
  const [active, setActive] = useState<"intelligence" | "intercepts">("intelligence")

  return (
    <div>
      <div className="tabs-row">
        <button
          type="button"
          className={`tab ${active === "intelligence" ? "active" : ""}`}
          onClick={() => setActive("intelligence")}
        >
          ◉ Intelligence
        </button>
        <button
          type="button"
          className={`tab ${active === "intercepts" ? "active" : ""}`}
          onClick={() => setActive("intercepts")}
        >
          ⊚ Intercepts
        </button>
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={{ display: active === "intelligence" ? "block" : "none" }}>
          {intelligence}
        </div>
        <div style={{ display: active === "intercepts" ? "block" : "none" }}>
          {intercepts}
        </div>
      </div>
    </div>
  )
}
