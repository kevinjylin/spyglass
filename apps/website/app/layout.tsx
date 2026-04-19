import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "SpyGlass — Fact-check analytics",
  description: "Real-time analytics for the SpyGlass fact-checking Chrome extension.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <a href="/" className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <circle cx="10.5" cy="10.5" r="6" />
                  <path d="m20 20-4.5-4.5" />
                </svg>
              </span>
              <span className="text-base font-semibold tracking-tight text-slate-900">
                SpyGlass
              </span>
            </a>
            <a
              href="https://chrome.google.com/webstore"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Add to Chrome
            </a>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-12">{children}</main>
        <footer className="mt-20 border-t border-slate-200/70">
          <div className="mx-auto max-w-6xl px-6 py-8 text-center text-xs text-slate-400">
            SpyGlass · real-time fact-checking for X / Twitter
          </div>
        </footer>
      </body>
    </html>
  )
}
