interface Props {
  label: string
  value: string
  sub?: string
}

export function StatCard({ label, value, sub }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-300">
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
        {value}
      </div>
      <div className="mt-1 min-h-[1rem] text-xs text-slate-400">{sub ?? "\u00A0"}</div>
    </div>
  )
}
