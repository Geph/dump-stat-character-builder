"use client"

import { ArrowUp } from "lucide-react"

export type SheetSectionLink = {
  id: string
  label: string
}

export function SheetTabSectionNav({
  sections,
  className,
}: {
  sections: SheetSectionLink[]
  className?: string
}) {
  if (!sections.length) return null

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div className={`mb-3 flex flex-wrap items-center gap-1.5 md:hidden ${className ?? ""}`}>
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => jump(section.id)}
          className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground"
        >
          {section.label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary"
      >
        <ArrowUp className="h-3 w-3" />
        Top
      </button>
    </div>
  )
}
