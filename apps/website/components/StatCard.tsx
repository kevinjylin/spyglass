interface Props {
  caseId: string
  label: string
  value: string
  sub?: string
}

export function StatCard({ caseId, label, value, sub }: Props) {
  return (
    <div className="dossier-tile">
      <div className="hd">
        <span>Case · {caseId}</span>
        <span>▲</span>
      </div>
      <div className="bd">
        <div className="label">{label}</div>
        <div className="value">{value}</div>
        <div className="sub">{sub ?? "\u00A0"}</div>
      </div>
    </div>
  )
}
