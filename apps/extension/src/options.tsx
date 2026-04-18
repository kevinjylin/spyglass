import { useEffect, useState } from "react"
import { DEFAULT_API_BASE, getApiBase, setApiBase } from "~lib/storage"

function Options() {
  const [value, setValue] = useState(DEFAULT_API_BASE)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void getApiBase().then(setValue)
  }, [])

  const onSave = async () => {
    await setApiBase(value)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div style={{ maxWidth: 480, margin: "32px auto", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 18 }}>precitrus options</h1>
      <label style={{ display: "block", fontSize: 13, marginTop: 16 }}>
        API base URL
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{
            display: "block",
            width: "100%",
            padding: "6px 8px",
            marginTop: 6,
            border: "1px solid #d1d5db",
            borderRadius: 6,
            fontSize: 13,
          }}
        />
      </label>
      <button
        type="button"
        onClick={onSave}
        style={{
          marginTop: 12,
          padding: "8px 14px",
          background: "#111827",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
        }}>
        Save
      </button>
      {saved && <span style={{ marginLeft: 10, color: "#15803d" }}>Saved.</span>}
    </div>
  )
}

export default Options
