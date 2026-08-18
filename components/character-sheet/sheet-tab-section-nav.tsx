"use client"

import { ArrowUp } from "lucide-react"

export type SheetSectionLink = {
  id: string
  label: string
}

const MAIN_NAV_OFFSET_PX = 64

export function SheetTabSectionNav({
  sections,
  className,
}: {
  sections: SheetSectionLink[]
  className?: string
}) {
  if (!sections.length) return null

  const jump = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const stickyNav = document.getElementById("sheet-tab-section-nav")
    const stickyHeight = stickyNav?.offsetHeight ?? 52
    const top =
      el.getBoundingClientRect().top + window.scrollY - MAIN_NAV_OFFSET_PX - stickyHeight - 8
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" })
  }

  return (
    <div
      id="sheet-tab-section-nav"
      className={`sticky top-16 z-40 -mx-4 mb-3 border-b border-border bg-background/95 px-4 py-2 backdrop-blur-lg md:hidden ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => jump(section.id)}
            className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-3.5 text-sm font-semibold text-foreground"
          >
            {section.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary"
          aria-label="Back to top"
          title="Back to top"
        >
          <ArrowUp className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
