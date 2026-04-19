import { fetchSiteStats } from "@/lib/data"
import { StatCard } from "@/components/StatCard"
import { VerdictDonut } from "@/components/VerdictDonut"
import { ActivityChart } from "@/components/ActivityChart"
import { ClaimsBreakdown } from "@/components/ClaimsBreakdown"
import { RecentFeed } from "@/components/RecentFeed"
import { DossierTabs } from "@/components/DossierTabs"

export const dynamic = "force-dynamic"

function today(): string {
  const d = new Date()
  const day = String(d.getUTCDate()).padStart(2, "0")
  const mon = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase()
  const year = d.getUTCFullYear()
  const hh = String(d.getUTCHours()).padStart(2, "0")
  const mm = String(d.getUTCMinutes()).padStart(2, "0")
  return `${day} ${mon} ${year} · ${hh}:${mm}Z`
}

function footerDate(): string {
  const d = new Date()
  const day = String(d.getUTCDate()).padStart(2, "0")
  const mon = String(d.getUTCMonth() + 1).padStart(2, "0")
  const year = String(d.getUTCFullYear()).slice(2)
  return `${day}/${mon}/${year}`
}

export default async function HomePage() {
  const stats = await fetchSiteStats()

  const intelligencePanel = stats ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
      <section>
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          }}
        >
          <StatCard
            caseId="001"
            label="Intercepts · total"
            value={stats.total_tweets.toLocaleString()}
          />
          <StatCard
            caseId="002"
            label="Last 24h"
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
            label="Claims analyzed"
            value={stats.total_claims.toLocaleString()}
          />
        </div>
      </section>

      <section
        style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))" }}
      >
        <div className="folio">
          <div className="folio-head">
            <div>
              <div className="folio-title">◇ Verdict Wheel · All-time</div>
            </div>
            <div className="folio-ref">REF-VW-01</div>
          </div>
          <VerdictDonut data={stats.by_verdict} total={stats.total_tweets} />
        </div>

        <div className="folio">
          <div className="folio-head">
            <div>
              <div className="folio-title">◇ Transmission Log · 30d</div>
            </div>
            <div className="folio-ref">REF-TX-02</div>
          </div>
          <ActivityChart data={stats.activity} />
        </div>
      </section>

      <section>
        <div className="folio">
          <div className="folio-head">
            <div>
              <div className="folio-title">◇ Claims Breakdown · Fact vs Opinion</div>
              <div className="folio-sub">
                Split of every claim intercepted. Facts are sent to verification; opinions logged
                but not graded.
              </div>
            </div>
            <div className="folio-ref">REF-CB-03</div>
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
    <div
      className="folio"
      style={{ borderColor: "var(--accent)", background: "#fff8d6" }}
    >
      <div className="folio-head">
        <div>
          <div className="folio-title" style={{ color: "var(--stamp)" }}>
            ⚠ Configuration Required
          </div>
          <div className="folio-sub">
            Configure <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to load analytics.
          </div>
        </div>
        <div className="folio-ref">REF-CFG-00</div>
      </div>
    </div>
  )

  const interceptsPanel = (
    <div className="folio">
      <div className="folio-head">
        <div>
          <div className="folio-title">◇ Intercepts · Live Feed</div>
          <div className="folio-sub">
            Verified tweets as they land. Subscriptions stay live while this panel is mounted.
          </div>
        </div>
        <div className="folio-ref">REF-IX-05</div>
      </div>
      <RecentFeed />
    </div>
  )

  return (
    <div
      style={{
        position: "relative",
        zIndex: 1,
        maxWidth: 1440,
        margin: "0 auto",
        padding: "28px 40px 80px",
      }}
    >
      {/* Top dossier bar */}
      <div className="dossier-bar">
        <div className="group">
          <span>
            <span className="dot"></span>File · SG-04/WEB/HP
          </span>
          <span>Clearance · Level 3</span>
          <span>Revision · v2</span>
        </div>
        <div className="group">
          <span>{today()}</span>
          <span>Agent · Desk 7</span>
        </div>
      </div>

      {/* File tab */}
      <div className="file-tab">CASE FILE · OPERATION SPYGLASS</div>

      {/* Doc header */}
      <div
        style={{
          background: "var(--paper)",
          border: "1.5px solid var(--ink)",
          padding: "22px 28px",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 32,
          alignItems: "end",
          position: "relative",
        }}
      >
        <div>
          <h1
            className="font-type"
            style={{
              fontSize: 30,
              letterSpacing: ".01em",
              color: "var(--ink)",
              margin: 0,
              lineHeight: 1.05,
            }}
          >
            Dashboard — Public Intake
          </h1>
          <div
            className="font-mono-ds"
            style={{
              marginTop: 8,
              fontSize: 11,
              letterSpacing: ".2em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              fontWeight: 500,
            }}
          >
            Live fact-check ops · route /
          </div>
        </div>
        <div
          className="font-mono-ds"
          style={{
            display: "grid",
            gridTemplateColumns: "auto auto",
            gap: "4px 18px",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "var(--ink-2)",
            whiteSpace: "nowrap",
          }}
        >
          <span>Subject ·</span>
          <b style={{ color: "var(--ink)" }}>Fact-Check Intelligence</b>
          <span>Surface ·</span>
          <b style={{ color: "var(--ink)" }}>apps/website</b>
          <span>Audience ·</span>
          <b style={{ color: "var(--ink)" }}>Public · Press</b>
          <span>Status ·</span>
          <b style={{ color: "var(--ink)" }}>Active</b>
        </div>
      </div>

      {/* Canvas */}
      <div className="canvas-shell" style={{ marginTop: 18 }}>
        {/* Site header */}
        <div className="site-header-ds">
          <a
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              textDecoration: "none",
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
            <div>
              <div className="logo-text">SPYGLASS</div>
              <span className="logo-sub">Field Surveillance Unit</span>
            </div>
          </a>
          <a
            href="https://chrome.google.com/webstore"
            className="cta-btn"
            target="_blank"
            rel="noreferrer"
          >
            Download Extension →
          </a>
        </div>

        {/* Site main */}
        <div className="site-main-ds">
          <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
            {/* Hero */}
            <section
              style={{
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 18,
                position: "relative",
              }}
            >
              <div className="hero-crest">
                <span className="line"></span>
                <span className="label">▼ Briefing ▼</span>
                <span className="line"></span>
              </div>
              <div className="live-chip">
                <span className="pulse"></span>
                Surveillance · Active
              </div>
              <h2
                className="font-type"
                style={{
                  fontSize: 42,
                  lineHeight: 1.05,
                  margin: 0,
                  maxWidth: 720,
                  color: "var(--ink)",
                }}
              >
                Fact-check X in real time.
              </h2>
              <p
                style={{
                  maxWidth: 600,
                  margin: 0,
                  fontSize: 17,
                  lineHeight: 1.7,
                  color: "var(--ink-2)",
                }}
              >
                SpyGlass analyzes tweets inline as you browse — neutralizing bias,
                extracting claims, and verifying each one against live web sources.
              </p>
            </section>

            {/* Tabs + panels */}
            <DossierTabs
              intelligence={intelligencePanel}
              intercepts={interceptsPanel}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="site-footer-ds">
          <span>SpyGlass · Field Surveillance Unit · ⟐ Classified</span>
          <span className="font-mono-ds" aria-hidden>
            · · ·
          </span>
          <span>SG-04-WEB-HP · {footerDate()}</span>
        </div>
      </div>
    </div>
  )
}
