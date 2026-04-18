import { fetchStats } from "@/lib/api"
import { VerdictBars } from "@/components/charts/VerdictBars"
import { LiveFeed } from "@/components/LiveFeed"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  let stats = null
  let statsError: string | null = null
  try {
    stats = await fetchStats()
  } catch (err) {
    statsError = (err as Error).message
  }

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="mt-1 text-sm text-slate-600">
          Aggregate verdicts across all tweets the extension has checked.
        </p>
        {statsError && (
          <p className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {statsError}
          </p>
        )}
        {stats && (
          <div className="mt-4 grid gap-6 sm:grid-cols-3">
            <Stat label="Total tweets" value={stats.total_tweets} />
            <Stat label="Last 24h" value={stats.last_24h} />
            <Stat
              label="False or misleading"
              value={stats.by_verdict.false + stats.by_verdict.misleading}
            />
          </div>
        )}
        {stats && (
          <div className="mt-6 rounded-lg border bg-white p-4">
            <VerdictBars data={stats.by_verdict} />
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold">Live feed</h2>
        <p className="mt-1 text-sm text-slate-600">
          New checks appear here in real time via Supabase realtime.
        </p>
        <div className="mt-4">
          <LiveFeed />
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  )
}
