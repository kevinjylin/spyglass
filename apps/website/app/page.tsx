import { fetchSiteStats } from "@/lib/data"
import { StatCard } from "@/components/StatCard"
import { VerdictDonut } from "@/components/VerdictDonut"
import { ActivityChart } from "@/components/ActivityChart"
import { ClaimsBreakdown } from "@/components/ClaimsBreakdown"
import { RecentFeed } from "@/components/RecentFeed"

export const dynamic = "force-dynamic"

function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <h2 className="mb-6 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        {title}
      </h2>
      {children}
    </div>
  )
}

export default async function HomePage() {
  const stats = await fetchSiteStats()

  return (
    <div className="space-y-14">
      {/* Hero */}
      <section className="space-y-4 pt-2 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Live fact-checking
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Real-time fact-checking for X
        </h1>
        <p className="mx-auto max-w-xl text-base text-slate-500 sm:text-lg">
          SpyGlass analyzes tweets inline as you browse — neutralizing bias,
          extracting claims, and verifying each one against live web sources.
        </p>
      </section>

      {/* Stats row */}
      {stats ? (
        <>
          <section>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Tweets checked" value={stats.total_tweets.toLocaleString()} />
              <StatCard label="Checked last 24h" value={stats.last_24h.toLocaleString()} />
              <StatCard
                label="False or misleading"
                value={(stats.by_verdict.false + stats.by_verdict.misleading).toLocaleString()}
                sub={
                  stats.total_tweets > 0
                    ? `${Math.round(((stats.by_verdict.false + stats.by_verdict.misleading) / stats.total_tweets) * 100)}% of total`
                    : undefined
                }
              />
              <StatCard label="Claims analyzed" value={stats.total_claims.toLocaleString()} />
            </div>
          </section>

          {/* Charts */}
          <section className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Verdict breakdown (all-time)">
              <VerdictDonut data={stats.by_verdict} total={stats.total_tweets} />
            </SectionCard>
            <SectionCard title="Activity — last 30 days">
              <ActivityChart data={stats.activity} />
            </SectionCard>
          </section>

          {/* Claims breakdown */}
          <section>
            <SectionCard title="Claims breakdown">
              <ClaimsBreakdown
                factClaims={stats.fact_claims}
                opinionClaims={stats.opinion_claims}
                total={stats.total_claims}
              />
            </SectionCard>
          </section>
        </>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Configure <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to load analytics.
        </p>
      )}

      {/* Live feed */}
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Live feed</h2>
            <p className="mt-1 text-sm text-slate-500">
              New checks appear here in real time.
            </p>
          </div>
        </div>
        <RecentFeed />
      </section>
    </div>
  )
}
