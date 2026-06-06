"use client"

import { useEffect, useState } from "react"
import { List } from "lucide-react"
import { cn } from "@/lib/utils"

export type CatalogEditorNavSection = {
  id: string
  label: string
}

type CatalogEditorFloatingNavProps = {
  sections: CatalogEditorNavSection[]
}

export function CatalogEditorFloatingNav({ sections }: CatalogEditorFloatingNavProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "")
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setActiveId(sections[0]?.id ?? "")
  }, [sections])

  useEffect(() => {
    if (sections.length === 0) return

    const observers = sections.map(({ id }) => {
      const element = document.getElementById(id)
      if (!element) return null

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(id)
        },
        { rootMargin: "-30% 0px -55% 0px", threshold: 0 },
      )
      observer.observe(element)
      return observer
    })

    return () => {
      for (const observer of observers) observer?.disconnect()
    }
  }, [sections])

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
    setActiveId(id)
    setMobileOpen(false)
  }

  if (sections.length <= 1) return null

  const navButtonClass = (id: string, compact = false) =>
    cn(
      "rounded-lg text-left transition-colors",
      compact ? "shrink-0 px-3 py-1.5 text-xs font-semibold" : "block w-full px-3 py-2 text-sm",
      activeId === id
        ? "bg-primary/15 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    )

  return (
    <>
      <nav
        aria-label="Catalog sections"
        className="hidden xl:block fixed right-6 top-32 z-30 w-56 max-h-[calc(100vh-9rem)] overflow-y-auto rounded-2xl border-2 border-border bg-card/95 p-3 shadow-lg backdrop-blur-sm"
      >
        <p className="px-2 pb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Jump to
        </p>
        <ul className="space-y-0.5">
          {sections.map(({ id, label }) => (
            <li key={id}>
              <button type="button" onClick={() => scrollToSection(id)} className={navButtonClass(id)}>
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="xl:hidden fixed bottom-4 left-4 right-4 z-30">
        {mobileOpen ? (
          <div className="rounded-2xl border-2 border-border bg-card/95 p-3 shadow-lg backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Jump to</p>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="text-xs font-semibold text-primary"
              >
                Close
              </button>
            </div>
            <ul className="max-h-48 space-y-0.5 overflow-y-auto">
              {sections.map(({ id, label }) => (
                <li key={id}>
                  <button type="button" onClick={() => scrollToSection(id)} className={navButtonClass(id)}>
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card/95 px-4 py-3 text-sm font-semibold text-foreground shadow-lg backdrop-blur-sm"
          >
            <List className="h-4 w-4" />
            Jump to section
          </button>
        )}
      </div>
    </>
  )
}
