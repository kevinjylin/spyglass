interface Props {
  factClaims: number
  opinionClaims: number
  total: number
}

export function ClaimsBreakdown({ factClaims, opinionClaims, total }: Props) {
  if (total === 0) {
    return <p className="text-sm text-slate-400">No claims data yet.</p>
  }

  const factPct = Math.round((factClaims / total) * 100)
  const opinionPct = Math.round((opinionClaims / total) * 100)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <ClaimBar
          label="Verifiable facts"
          count={factClaims}
          total={total}
          pct={factPct}
          color="bg-indigo-500"
        />
        <ClaimBar
          label="Opinions"
          count={opinionClaims}
          total={total}
          pct={opinionPct}
          color="bg-slate-400"
        />
      </div>
      <p className="text-xs text-slate-400">
        Fact claims are verified against live web sources. Opinion claims are flagged but not rated true or false.
      </p>
    </div>
  )
}

function ClaimBar({
  label,
  count,
  total,
  pct,
  color,
}: {
  label: string
  count: number
  total: number
  pct: number
  color: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500 tabular-nums">
          {count.toLocaleString()} <span className="text-slate-400">({pct}%)</span>
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
