interface Props {
  trueTweets: number
  falseTweets: number
}

export function VerdictSplit({ trueTweets, falseTweets }: Props) {
  const total = trueTweets + falseTweets
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
        No verdict data yet
      </p>
    )
  }

  const factPct = (trueTweets / total) * 100
  const falsePct = (falseTweets / total) * 100
  const factDisplay = Math.round(factPct)
  const falseDisplay = Math.round(falsePct)

  return (
    <div>
      <div className="split-bar">
        <div className="a" style={{ flex: Math.max(factPct, 0.01) }}>
          ◣ FACT · {factDisplay}%
        </div>
        <div className="b" style={{ flex: Math.max(falsePct, 0.01) }}>
          FALSE · {falseDisplay}%
        </div>
      </div>
      <div className="split-legend">
        <div className="item">
          <span className="sw a" />
          Fact · {trueTweets.toLocaleString()} tweets
        </div>
        <div className="item">
          <span className="sw b" />
          False · {falseTweets.toLocaleString()} tweets
        </div>
      </div>
    </div>
  )
}
