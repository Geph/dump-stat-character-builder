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
  /** When set, only these preview section keys are shown (staged review). */
  sectionKeys?: readonly string[]
  /** Hide the global preview summary (useful when reviewing one stage at a time). */
  hideSummary?: boolean
  /**
   * Nested inside Staged import — drop the outer titled box so entries sit
   * directly under the stage header without another bordered panel.
   */
  embedded?: boolean
}

const SECTION_ICONS: Record<string, typeof BookOpen> = {
  classes: BookOpen,
  subclasses: Users,
  spells: ScrollText,
  equipment: Package,
  feats: BookOpen,
  species: Users,
  backgrounds: BookOpen,
}

function PreviewSection({
  section,
  bare,
}: {
  section: ImportContentPreviewSection
  bare?: boolean
}) {
  const limit = importContentPreviewLimit()
  const [expanded, setExpanded] = useState(false)
  const visibleItems = expanded ? section.items : section.items.slice(0, limit)
  const hiddenCount = section.items.length - visibleItems.length
  const Icon = SECTION_ICONS[section.key] ?? BookOpen

  const list = (
    <>
      <ul className="space-y-2">
        {visibleItems.map((item) => (
          <li
            key={item.id}
            className={
              bare
                ? "rounded-lg border border-border/60 bg-muted/15 px-3 py-2"
                : "rounded-md border border-border/60 bg-muted/20 px-3 py-2"
            }
          >
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
    </>
  )

  if (bare) return list

  return (
    <section className="rounded-lg border border-border/70 bg-background/80 p-3">
      <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        {section.label}
        <span className="text-xs font-normal text-muted-foreground">({section.items.length})</span>
      </div>
      {list}
    </section>
  )
}

export function ImportContentPreviewPanel({
  content,
  previewSummary,
  showModifierReviewHint = false,
  sectionKeys,
  hideSummary = false,
  embedded = false,
}: ImportContentPreviewPanelProps) {
  const sections = useMemo(
    () => collectImportContentPreview(content, sectionKeys ? { sectionKeys } : undefined),
    [content, sectionKeys],
  )

  const visibleSummary = hideSummary ? undefined : previewSummary
  if (!sections.length && !visibleSummary && !showModifierReviewHint) return null

  const singleSection = sections.length === 1
  const body = (
    <>
      {!embedded ? (
        <div>
          <p className="font-semibold text-foreground">Review before import</p>
          {visibleSummary ? (
            <p className="mt-1 text-muted-foreground">{visibleSummary}</p>
          ) : null}
          {sections.length > 0 ? (
            <p className="mt-1 text-muted-foreground">
              {sectionKeys
                ? "Check the parsed entries for this stage before continuing."
                : "Check parsed content below before confirming."}
            </p>
          ) : null}
          {showModifierReviewHint ? (
            <p className="mt-1 text-muted-foreground">
              Review auto-wired modifiers in the next section, then confirm to write everything to the
              compendium.
            </p>
          ) : null}
        </div>
      ) : sections.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {showModifierReviewHint
            ? "Check the parsed entries below, then continue to modifier wiring."
            : "Check the parsed entries below before confirming."}
        </p>
      ) : null}

      {sections.length > 0 ? (
        <div className={embedded ? "space-y-2" : "space-y-3"}>
          {sections.map((section) => (
            <PreviewSection
              key={section.key}
              section={section}
              bare={embedded && singleSection}
            />
          ))}
        </div>
      ) : null}
    </>
  )

  if (embedded) {
    return <div className="space-y-3 text-sm">{body}</div>
  }

  return (
    <section className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
      {body}
    </section>
  )
}
