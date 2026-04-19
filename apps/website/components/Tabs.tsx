"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState, type ReactNode } from "react"

export interface TabDef {
  id: string
  label: string
}

interface Props {
  tabs: TabDef[]
  /** Children must be rendered in the same order as `tabs`. Each child is one panel. */
  children: ReactNode[]
  /** Query-param key used to persist tab selection. */
  paramKey?: string
}

export function Tabs({ tabs, children, paramKey = "tab" }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Initial tab: URL param if valid, else first tab.
  const initial = (() => {
    const fromUrl = searchParams.get(paramKey)
    return tabs.some((t) => t.id === fromUrl) ? (fromUrl as string) : tabs[0].id
  })()

  const [active, setActive] = useState<string>(initial)

  // Keep local state in sync if the user hits Back/Forward.
  useEffect(() => {
    const fromUrl = searchParams.get(paramKey)
    if (fromUrl && tabs.some((t) => t.id === fromUrl) && fromUrl !== active) {
      setActive(fromUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, paramKey])

  const onSelect = useCallback(
    (id: string) => {
      if (id === active) return
      setActive(id)
      const p = new URLSearchParams(searchParams.toString())
      p.set(paramKey, id)
      router.replace(`${pathname}?${p.toString()}`, { scroll: false })
    },
    [active, pathname, router, searchParams, paramKey]
  )

  return (
    <div className="space-y-8">
      <div
        role="tablist"
        aria-label="Sections"
        className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      >
        {tabs.map((t) => {
          const selected = t.id === active
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`panel-${t.id}`}
              id={`tab-${t.id}`}
              onClick={() => onSelect(t.id)}
              className={
                "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors " +
                (selected
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900")
              }
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Panels: keep all mounted so client state (e.g. realtime subscriptions) persists across tab switches. */}
      {tabs.map((t, i) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`panel-${t.id}`}
          aria-labelledby={`tab-${t.id}`}
          hidden={t.id !== active}
        >
          {children[i]}
        </div>
      ))}
    </div>
  )
}
