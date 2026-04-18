import type { Metadata } from "next"
import Link from "next/link"
import "./globals.css"

export const metadata: Metadata = {
  title: "precitrus",
  description: "Live fact-check dashboard for X / Twitter posts.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b bg-white">
          <nav className="mx-auto max-w-5xl px-6 py-3 flex items-center gap-6">
            <Link href="/" className="font-semibold text-slate-900">
              precitrus
            </Link>
            <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
              dashboard
            </Link>
            <Link href="/check" className="text-sm text-slate-600 hover:text-slate-900">
              check a tweet
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </body>
    </html>
  )
}
