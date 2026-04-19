interface Props {
  factClaims: number
  opinionClaims: number
  total: number
}

export function ClaimsBreakdown({ factClaims, opinionClaims, total }: Props) {
  if (total === 0) {
    return (
      <p
        className="font-mono-ds"
        style={{
          fontSize: 11,
          letterSpacing: ".16em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
        }}
      >
        No claims data yet
      </p>
    )
  }

  const factPct = (factClaims / total) * 100
  const opinionPct = (opinionClaims / total) * 100
  const factDisplay = Math.round(factPct)
  const opinionDisplay = Math.round(opinionPct)

  return (
    <div>
      <div className="split-bar">
        <div className="a" style={{ flex: factPct }}>
          ◣ FACT · {factDisplay}%
        </div>
        <div className="b" style={{ flex: Math.max(opinionPct, 0.01) }}>
          OPINION · {opinionDisplay}%
        </div>
      </div>
      <div className="split-legend">
        <div className="item">
          <span className="sw a" />
          Fact · {factClaims.toLocaleString()} verified
        </div>
        <div className="item">
          <span className="sw b" />
          Opinion · {opinionClaims.toLocaleString()} logged
        </div>
      </div>
    </div>
  )
}
