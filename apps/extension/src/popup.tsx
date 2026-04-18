import { useEffect, useState } from "react"
import { DEFAULT_API_BASE, getApiBase } from "~lib/storage"

function Popup() {
  const [base, setBase] = useState(DEFAULT_API_BASE)
  const [health, setHealth] = useState<"unknown" | "ok" | "down">("unknown")

  useEffect(() => {
    void (async () => {
      const b = await getApiBase()
      setBase(b)
      try {
        const r = await fetch(`${b.replace(/\/$/, "")}/healthz`)
        setHealth(r.ok ? "ok" : "down")
      } catch {
        setHealth("down")
      }
    })()
  }, [])

  return (
    <div style={{ width: 280, padding: 14, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 14, margin: "0 0 10px 0" }}>precitrus</h1>
      <p style={{ fontSize: 12, color: "#374151", margin: "0 0 10px 0" }}>
        Inline fact-check badges for X / Twitter.
      </p>
      <div style={{ fontSize: 12, marginBottom: 6 }}>
        <span style={{ color: "#6b7280" }}>API:</span>{" "}
        <code>{base}</code>
      </div>
      <div style={{ fontSize: 12, marginBottom: 10 }}>
        <span style={{ color: "#6b7280" }}>Health:</span>{" "}
        <strong
          style={{
            color: health === "ok" ? "#15803d" : health === "down" ? "#b91c1c" : "#6b7280",
          }}>
          {health}
        </strong>
      </div>
      <button
        type="button"
        onClick={() => chrome.runtime.openOptionsPage()}
        style={{
          fontSize: 12,
          padding: "6px 10px",
          borderRadius: 6,
          border: "1px solid #d1d5db",
          background: "#f9fafb",
          cursor: "pointer",
        }}>
        Options
      </button>
    </div>
  )
}

export default Popup
