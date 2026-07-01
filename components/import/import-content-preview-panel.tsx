"use client"

import { useMemo, useState } from "react"
import type { ImportContent } from "@/lib/import/content-schema"
import {
  collectImportContentPreview,
  importContentPreviewLimit,
  type ImportContentPreviewSection,
} from "@/lib/import/import-content-preview"
import { BookOpen, Package, ScrollText, Users } from "lucide-react"

type ImportContentPreviewPanelProps = {
  content: ImportContent
  previewSummary?: string
  showModifierReviewHint?: boolean
}

const SECTION_ICONS: Record<string, typeof BookOpen> = {
  spells: ScrollText,
  equipment: Package,
  feats: BookOpen,
  species: Users,
  backgrounds: BookOpen,
}

function PreviewSection({ section }: { section: ImportContentPreviewSection }) {
  const limit = importContentPreviewLimit()
  const [expanded, setExpanded] = useState(false)
  const visibleItems = expanded ? section.items : section.items.slice(0, limit)
  const hiddenCount = section.items.length - visibleItems.length
  const Icon = SECTION_ICONS[section.key] ?? BookOpen

  return (
    <section className="rounded-lg border border-border/70 bg-background/80 p-3">
      <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        {section.label}
        <span className="text-xs font-normal text-muted-foreground">({section.items.length})</span>
      </div>
      <ul className="space-y-2">
        {visibleItems.map((item) => (
          <li key={item.id} className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">{item.name}</span>
              {item.badges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary"
                >
                  {badge}
                </span>
              ))}
            </div>
            {item.details.length > 0 ? (
              <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                {item.details.map((detail) => (
                  <div key={`${item.id}-${detail.label}`} className="contents">
                    <dt className="text-muted-foreground">{detail.label}</dt>
                    <dd className="text-foreground">{detail.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {item.descriptionSnippet ? (
              <p className="mt-1.5 text-xs text-muted-foreground line-clamp-3">{item.descriptionSnippet}</p>
            ) : null}
          </li>
        ))}
      </ul>
      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 text-xs font-semibold text-primary hover:underline"
        >
          {expanded ? "Show fewer" : `Show ${hiddenCount} more`}
        </button>
      ) : null}
    </section>
  )
}

export function ImportContentPreviewPanel({
  content,
  previewSummary,
  showModifierReviewHint = false,
}: ImportContentPreviewPanelProps) {
  const sections = useMemo(() => collectImportContentPreview(content), [content])

  if (!sections.length && !previewSummary && !showModifierReviewHint) return null

  return (
    <section className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
      <div>
        <p className="font-semibold text-foreground">Review before import</p>
        {previewSummary ? (
          <p className="mt-1 text-muted-foreground">{previewSummary}</p>
        ) : null}
        {sections.length > 0 ? (
          <p className="mt-1 text-muted-foreground">
            Check parsed spells, equipment, and other content below before confirming.
          </p>
        ) : null}
        {showModifierReviewHint ? (
          <p className="mt-1 text-muted-foreground">
            Review auto-wired modifiers in the next section, then confirm to write everything to the
            compendium.
          </p>
        ) : null}
      </div>

      {sections.length > 0 ? (
        <div className="space-y-3">
          {sections.map((section) => (
            <PreviewSection key={section.key} section={section} />
          ))}
        </div>
      ) : null}
    </section>
  )
}
