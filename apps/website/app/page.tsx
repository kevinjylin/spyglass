import { fetchSiteStats } from "@/lib/data"
import { StatCard } from "@/components/StatCard"
import { VerdictDonut } from "@/components/VerdictDonut"
import { EngagementScatter } from "@/components/EngagementScatter"
import { ClaimsBreakdown } from "@/components/ClaimsBreakdown"
import { RecentFeed } from "@/components/RecentFeed"
import { DossierTabs } from "@/components/DossierTabs"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const stats = await fetchSiteStats()

  const intelligencePanel = stats ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <section
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        }}
      >
        <StatCard
          caseId="001"
          label="Tweets analyzed"
          value={stats.total_tweets.toLocaleString()}
        />
        <StatCard
          caseId="002"
          label="Last 24 hours"
          value={stats.last_24h.toLocaleString()}
        />
        <StatCard
          caseId="003"
          label="False or misleading"
          value={(stats.by_verdict.false + stats.by_verdict.misleading).toLocaleString()}
          sub={
            stats.total_tweets > 0
              ? `${Math.round(((stats.by_verdict.false + stats.by_verdict.misleading) / stats.total_tweets) * 100)}% of total`
              : "—"
          }
        />
        <StatCard
          caseId="004"
          label="Claims checked"
          value={stats.total_claims.toLocaleString()}
        />
      </section>

      <section
        style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))" }}
      >
        <div className="folio">
          <div className="folio-head">
            <div className="folio-title">Verdict breakdown</div>
          </div>
          <VerdictDonut data={stats.by_verdict} total={stats.total_tweets} />
        </div>

        <div className="folio">
          <div className="folio-head">
            <div>
              <div className="folio-title">Engagement: true vs false</div>
              <div className="folio-sub">
                Each dot is a tweet — retweets on X, likes on Y. Green rings = graded true,
                red fills = graded false.
              </div>
            </div>
          </div>
          <EngagementScatter data={stats.scatter_points} trimOutliers={2} />
        </div>
      </section>

      <section>
        <div className="folio">
          <div className="folio-head">
            <div>
              <div className="folio-title">Claims: fact vs opinion</div>
              <div className="folio-sub">
                Facts are sent through verification; opinions are logged but not graded.
              </div>
            </div>
          </div>
          <ClaimsBreakdown
            factClaims={stats.fact_claims}
            opinionClaims={stats.opinion_claims}
            total={stats.total_claims}
          />
        </div>
      </section>
    </div>
  ) : (
    <div className="folio" style={{ background: "#fff8d6" }}>
      <div className="folio-head">
        <div>
          <div className="folio-title">Analytics unavailable</div>
          <div className="folio-sub">
            Configure <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to load analytics.
          </div>
        </div>
      </div>
    </div>
  )

  const interceptsPanel = (
    <div className="folio">
      <div className="folio-head">
        <div>
          <div className="folio-title">Recent checks</div>
          <div className="folio-sub">Live feed of verified tweets as they land.</div>
        </div>
      </div>
      <RecentFeed />
    </div>
  )

  return (
    <div
      style={{
        position: "relative",
        zIndex: 1,
        maxWidth: 1100,
        margin: "0 auto",
        padding: "32px 32px 80px",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 56,
        }}
      >
        <a
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            textDecoration: "none",
            color: "var(--ink)",
          }}
        >
          <div className="logo-mark" aria-hidden>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: 18, height: 18 }}
            >
              <circle cx="10.5" cy="10.5" r="6" />
              <path d="m20 20-4.5-4.5" />
            </svg>
          </div>
          <div
            className="font-type"
            style={{ fontSize: 20, fontWeight: 700, letterSpacing: ".01em" }}
          >
            SpyGlass
          </div>
        </a>
        <a
          href="https://chrome.google.com/webstore"
          className="cta-btn"
          target="_blank"
          rel="noreferrer"
        >
          Download extension →
        </a>
      </header>

      {/* Hero */}
      <section style={{ textAlign: "center", marginBottom: 56 }}>
        <div className="live-chip" style={{ marginBottom: 20 }}>
          <span className="pulse"></span>
          Live
        </div>
        <h1
          className="font-type"
          style={{
            fontSize: 48,
            lineHeight: 1.08,
            margin: 0,
            color: "var(--ink)",
            maxWidth: 760,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Fact-check X in real time.
        </h1>
        <p
          style={{
            maxWidth: 600,
            margin: "20px auto 0",
            fontSize: 17,
            lineHeight: 1.7,
            color: "var(--ink-2)",
          }}
        >
          SpyGlass analyzes tweets inline as you browse — extracting claims and
          verifying each one against live web sources.
        </p>
      </section>

      {/* Tabs + panels */}
      <DossierTabs
        intelligence={intelligencePanel}
        intercepts={interceptsPanel}
      />

      {/* Footer */}
      <footer
        style={{
          marginTop: 72,
          paddingTop: 20,
          borderTop: "1px solid var(--ink-mute)",
          textAlign: "center",
          fontSize: 13,
          color: "var(--ink-2)",
        }}
      >
        SpyGlass · Real-time fact-checking for X
      </footer>
    </div>
  )
}
