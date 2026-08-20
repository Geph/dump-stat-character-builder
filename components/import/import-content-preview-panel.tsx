"use client"

import { useEffect, useMemo, useState } from "react"
import type { ImportContent } from "@/lib/import/content-schema"
import {
  collectImportContentPreview,
  groupImportContentPreviewBySource,
  importContentPreviewLimit,
  importPreviewItemSkipKey,
  omitPreviewItemsBySkipKeys,
  type ImportContentPreviewItem,
  type ImportContentPreviewNameKind,
  type ImportContentPreviewSection,
} from "@/lib/import/import-content-preview"
import {
  importCardArtUsesPortraitArt,
  type ImportCardArtUrlMap,
} from "@/lib/import/import-card-art"
import { ImportCardArtControls } from "@/components/import/import-card-art-panel"
import {
  ImportSourceBulkActions,
  type ImportSourceBulkAction,
  type ImportSourceBulkTarget,
} from "@/components/import/import-source-bulk-actions"
import { BookOpen, ChevronLeft, ChevronRight, Package, ScrollText, Users } from "lucide-react"

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
  /** Optional card-art URLs for rows that expose `cardArtKey` (e.g. classes/subclasses). */
  cardArtUrls?: ImportCardArtUrlMap
  onCardArtChange?: (map: ImportCardArtUrlMap) => void
  /** Commit a class/subclass name edit (applied on blur). */
  onRenameItem?: (kind: ImportContentPreviewNameKind, sourceIndex: number, nextName: string) => void
  /** Soft-skip keys (`section:index`) — independent of collision skip. */
  skippedKeys?: ReadonlySet<string>
  /** Collision skips from the name-conflict step — hide these rows entirely. */
  hiddenKeys?: ReadonlySet<string>
  onSkippedKeysChange?: (next: Set<string>) => void
  /** Source used for rows without their own source label. */
  defaultSource?: string
  /** Apply one import decision to every entry in the active source group. */
  onSourceBulkAction?: (
    source: string,
    targets: ImportSourceBulkTarget[],
    action: ImportSourceBulkAction,
  ) => void
  /**
   * Shown in the source Previous/Next row only on the last source page
   * (replaces the disabled Next control).
   */
  continueReview?: {
    label: string
    onClick: () => void
    disabled?: boolean
  }
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

function PreviewItem({
  item,
  bare,
  cardArtUrl,
  onCardArtUrlChange,
  onRename,
  skipped,
  onToggleSkip,
}: {
  item: ImportContentPreviewItem
  bare?: boolean
  cardArtUrl?: string
  onCardArtUrlChange?: (next: string) => void
  onRename?: (nextName: string) => void
  skipped?: boolean
  onToggleSkip?: () => void
}) {
  const showCardArt = Boolean(item.cardArtKey && onCardArtUrlChange) && !skipped
  const canRename = Boolean(item.nameKind != null && onRename) && !skipped
  const [draftName, setDraftName] = useState(item.name)

  useEffect(() => {
    setDraftName(item.name)
  }, [item.name, item.id])

  const commitName = () => {
    if (!onRename) return
    const trimmed = draftName.trim()
    if (!trimmed || trimmed === item.name) {
      setDraftName(item.name)
      return
    }
    onRename(trimmed)
  }

  return (
    <li
      className={
        bare
          ? "rounded-lg border border-border/60 bg-muted/15 px-3 py-2"
          : "rounded-md border border-border/60 bg-muted/20 px-3 py-2"
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        {canRename ? (
          <input
            type="text"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onBlur={commitName}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur()
              }
            }}
            aria-label={`${item.nameKind === "subclass" ? "Subclass" : "Class"} name`}
            className="min-w-0 flex-1 rounded-md border border-border/70 bg-background px-2 py-1 text-sm font-medium text-foreground"
          />
        ) : (
          <span
            className={
              skipped
                ? "min-w-0 flex-1 font-medium text-muted-foreground line-through"
                : "min-w-0 flex-1 font-medium text-foreground"
            }
          >
            {item.name}
          </span>
        )}
        {item.badges.map((badge) => (
          <span
            key={badge}
            className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary"
          >
            {badge}
          </span>
        ))}
        {onToggleSkip ? (
          <button
            type="button"
            onClick={onToggleSkip}
            className={
              skipped
                ? "ml-auto shrink-0 rounded-md border border-border/70 bg-background px-2 py-1 text-xs font-semibold text-foreground hover:bg-muted/40"
                : "ml-auto shrink-0 rounded-md border border-border/70 px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            }
          >
            {skipped ? "Undo skip" : "Skip import"}
          </button>
        ) : null}
      </div>
      {skipped ? (
        <p className="mt-1.5 text-xs text-muted-foreground">Won&apos;t be imported.</p>
      ) : (
        <>
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
          {showCardArt && item.cardArtKey ? (
            <div className="mt-3 border-t border-border/50 pt-3">
              <ImportCardArtControls
                rowKey={item.cardArtKey}
                name={item.name}
                portrait={importCardArtUsesPortraitArt(item.cardArtTab ?? "subclasses")}
                url={cardArtUrl ?? ""}
                onUrlChange={onCardArtUrlChange!}
              />
            </div>
          ) : null}
        </>
      )}
    </li>
  )
}

function PreviewSection({
  section,
  bare,
  cardArtUrls,
  onCardArtChange,
  onRenameItem,
  skippedKeys,
  onToggleSkip,
}: {
  section: ImportContentPreviewSection
  bare?: boolean
  cardArtUrls?: ImportCardArtUrlMap
  onCardArtChange?: (map: ImportCardArtUrlMap) => void
  onRenameItem?: (kind: ImportContentPreviewNameKind, sourceIndex: number, nextName: string) => void
  skippedKeys?: ReadonlySet<string>
  onToggleSkip?: (item: ImportContentPreviewItem) => void
}) {
  const limit = importContentPreviewLimit()
  const [expanded, setExpanded] = useState(false)
  const visibleItems = expanded ? section.items : section.items.slice(0, limit)
  const hiddenCount = section.items.length - visibleItems.length
  const Icon = SECTION_ICONS[section.key] ?? BookOpen

  const list = (
    <>
      <ul className="space-y-2">
        {visibleItems.map((item) => {
          const skipKey = importPreviewItemSkipKey(item)
          const skipped = skippedKeys?.has(skipKey) ?? false
          return (
            <PreviewItem
              key={item.id}
              item={item}
              bare={bare}
              skipped={skipped}
              onToggleSkip={onToggleSkip ? () => onToggleSkip(item) : undefined}
              cardArtUrl={item.cardArtKey ? cardArtUrls?.[item.cardArtKey] : undefined}
              onCardArtUrlChange={
                item.cardArtKey && onCardArtChange
                  ? (next) => onCardArtChange({ ...cardArtUrls, [item.cardArtKey!]: next })
                  : undefined
              }
              onRename={
                item.nameKind != null && onRenameItem
                  ? (nextName) => onRenameItem(item.nameKind!, item.sourceIndex, nextName)
                  : undefined
              }
            />
          )
        })}
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
  cardArtUrls,
  onCardArtChange,
  onRenameItem,
  skippedKeys,
  hiddenKeys,
  onSkippedKeysChange,
  defaultSource,
  onSourceBulkAction,
  continueReview,
}: ImportContentPreviewPanelProps) {
  const collectedSections = useMemo(
    () => collectImportContentPreview(content, sectionKeys ? { sectionKeys } : undefined),
    [content, sectionKeys],
  )
  const sections = useMemo(
    () =>
      hiddenKeys?.size ? omitPreviewItemsBySkipKeys(collectedSections, hiddenKeys) : collectedSections,
    [collectedSections, hiddenKeys],
  )
  const sourceGroups = useMemo(
    () => groupImportContentPreviewBySource(sections, defaultSource),
    [defaultSource, sections],
  )
  const multipleSources = sourceGroups.length > 1
  const [sourcePageIndex, setSourcePageIndex] = useState(0)

  useEffect(() => {
    setSourcePageIndex((current) =>
      sourceGroups.length === 0 ? 0 : Math.min(current, sourceGroups.length - 1),
    )
  }, [sourceGroups.length])

  const activeSourceGroup = multipleSources ? sourceGroups[sourcePageIndex] ?? null : null
  const onLastSource = multipleSources && sourcePageIndex >= sourceGroups.length - 1
  const showSourceContinue = Boolean(continueReview && onLastSource)
  const activeSourceTargets = useMemo(
    () =>
      activeSourceGroup?.sections.flatMap((section) =>
        section.items.map((item) => ({
          sectionKey: item.sectionKey,
          sourceIndex: item.sourceIndex,
          name: item.name,
        })),
      ) ?? [],
    [activeSourceGroup],
  )

  const handleToggleSkip = (item: ImportContentPreviewItem) => {
    if (!onSkippedKeysChange) return
    const key = importPreviewItemSkipKey(item)
    const next = new Set(skippedKeys ?? [])
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onSkippedKeysChange(next)
  }

  const visibleSummary = hideSummary ? undefined : previewSummary
  const allHiddenByConflicts = collectedSections.length > 0 && sections.length === 0
  if (!sections.length && !visibleSummary && !showModifierReviewHint && !allHiddenByConflicts) {
    return null
  }

  const singleSection = sections.length === 1
  const renderSections = (
    visibleSections: ImportContentPreviewSection[],
    keyPrefix = "",
    forceBare = false,
  ) =>
    visibleSections.map((section) => (
      <PreviewSection
        key={`${keyPrefix}${section.key}`}
        section={section}
        bare={forceBare || (embedded && visibleSections.length === 1)}
        cardArtUrls={cardArtUrls}
        onCardArtChange={onCardArtChange}
        onRenameItem={onRenameItem}
        skippedKeys={skippedKeys}
        onToggleSkip={onSkippedKeysChange ? handleToggleSkip : undefined}
      />
    ))
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
          ) : allHiddenByConflicts ? (
            <p className="mt-1 text-muted-foreground">
              Skipped name conflicts are hidden from this step.
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
          {onCardArtChange
            ? showModifierReviewHint
              ? "Edit names and optional card art below, then continue to modifier wiring."
              : "Edit names and optional card art below before confirming."
            : showModifierReviewHint
              ? "Review content below, then continue through the remaining review steps."
              : "Review content below before continuing."}
        </p>
      ) : allHiddenByConflicts ? (
        <p className="text-xs text-muted-foreground">
          Skipped name conflicts are hidden from this step.
        </p>
      ) : null}

      {sections.length > 0 ? (
        <div className={embedded ? "space-y-2" : "space-y-3"}>
          {multipleSources && activeSourceGroup ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {sourcePageIndex + 1} of {sourceGroups.length}
                  </span>
                  <span className="mx-1.5">·</span>
                  Reviewing sources one at a time
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={sourcePageIndex <= 0}
                    onClick={() => setSourcePageIndex((index) => Math.max(0, index - 1))}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                    Previous
                  </button>
                  {showSourceContinue && continueReview ? (
                    <button
                      type="button"
                      disabled={continueReview.disabled}
                      onClick={continueReview.onClick}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-40"
                    >
                      {continueReview.label}
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={sourcePageIndex >= sourceGroups.length - 1}
                      onClick={() =>
                        setSourcePageIndex((index) => Math.min(sourceGroups.length - 1, index + 1))
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                    >
                      Next
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  )}
                </div>
              </div>

              <div
                className="flex flex-wrap gap-1.5"
                role="tablist"
                aria-label="Import sources"
              >
                {sourceGroups.map((group, index) => {
                  const active = index === sourcePageIndex
                  return (
                    <button
                      key={group.source}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      title={`${group.source} (${group.itemCount})`}
                      onClick={() => setSourcePageIndex(index)}
                      className={`max-w-[14rem] truncate rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      }`}
                    >
                      {group.source}
                      <span className={active ? "opacity-80" : "opacity-70"}>
                        {" "}
                        · {group.itemCount}
                      </span>
                    </button>
                  )
                })}
              </div>

              <section
                key={activeSourceGroup.source}
                className="space-y-3 rounded-xl border border-primary/25 bg-primary/[0.03] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-foreground">{activeSourceGroup.source}</h3>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="text-xs text-muted-foreground">
                      {activeSourceGroup.itemCount} item
                      {activeSourceGroup.itemCount === 1 ? "" : "s"}
                    </span>
                    <ImportSourceBulkActions
                      source={activeSourceGroup.source}
                      targets={activeSourceTargets}
                      onAction={onSourceBulkAction}
                      actions={["skip"]}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  {renderSections(
                    activeSourceGroup.sections,
                    `${activeSourceGroup.source}:`,
                    embedded && activeSourceGroup.sections.length === 1,
                  )}
                </div>
              </section>
            </div>
          ) : (
            sections.map((section) => (
              <PreviewSection
                key={section.key}
                section={section}
                bare={embedded && singleSection}
                cardArtUrls={cardArtUrls}
                onCardArtChange={onCardArtChange}
                onRenameItem={onRenameItem}
                skippedKeys={skippedKeys}
                onToggleSkip={onSkippedKeysChange ? handleToggleSkip : undefined}
              />
            ))
          )}
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
