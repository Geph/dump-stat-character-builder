"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight, ImageIcon, X } from "lucide-react"
import type { ImportContent } from "@/lib/import/content-schema"
import {
  CLASS_CARD_ASPECT_CLASS,
  WIDE_CARD_ASPECT_CLASS,
} from "@/lib/compendium/card-image"
import {
  collectImportCardArtTargets,
  countImportCardArtUrls,
  fillBlankImportCardArtUrls,
  importCardArtUsesPortraitArt,
  type ImportCardArtSection,
  type ImportCardArtUrlMap,
} from "@/lib/import/import-card-art"
import { normalizeCardImageUrl } from "@/lib/compendium/card-image"
import { cn } from "@/lib/utils"
import { SearchBox } from "@/components/search/search-box"
import { rankSearchResults, searchItems } from "@/lib/search/ranked-search"
import {
  ImportSourceBulkActions,
  type ImportSourceBulkAction,
  type ImportSourceBulkTarget,
} from "@/components/import/import-source-bulk-actions"

type ImportCardArtPanelProps = {
  content: ImportContent
  value: ImportCardArtUrlMap
  onChange: (map: ImportCardArtUrlMap) => void
  /** When set, only these card-art sections are shown (staged review). */
  sections?: readonly ImportCardArtSection[]
  /** Hide targets for these sections (e.g. subclasses inlined in content preview). */
  excludeSections?: readonly ImportCardArtSection[]
  /** Source used for targets without their own source label. */
  defaultSource?: string
  /** Render directly inside the staged review phase. */
  embedded?: boolean
  /** Soft-skip keys from content preview — hide matching card-art rows. */
  skippedKeys?: ReadonlySet<string>
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

export function ImportCardArtControls({
  rowKey,
  name,
  portrait,
  url,
  onUrlChange,
}: {
  rowKey: string
  name: string
  portrait: boolean
  url: string
  onUrlChange: (next: string) => void
}) {
  const preview = normalizeCardImageUrl(url)
  const aspectClass = portrait ? CLASS_CARD_ASPECT_CLASS : WIDE_CARD_ASPECT_CLASS
  const previewCropClass = portrait
    ? "h-full w-full object-cover object-top"
    : "h-full w-full object-cover object-center"

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1">
        <label className="sr-only" htmlFor={`card-art-${rowKey}`}>
          Image URL for {name}
        </label>
        <div className="relative">
          <input
            id={`card-art-${rowKey}`}
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={url}
            onChange={(event) => onUrlChange(event.target.value)}
            placeholder="https://… or /images/… (optional card art)"
            className={cn(
              "w-full rounded-lg border border-border bg-background py-2 pl-3 text-sm text-foreground placeholder:text-muted-foreground",
              url.trim() ? "pr-9" : "pr-3",
            )}
          />
          {url.trim() ? (
            <button
              type="button"
              onClick={() => onUrlChange("")}
              aria-label={`Clear image URL for ${name}`}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-md border border-border/70 bg-muted/30",
          portrait ? "w-20" : "w-32",
          aspectClass,
        )}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className={previewCropClass} />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
            <ImageIcon className="h-5 w-5 opacity-50" />
            <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">Preview</span>
          </div>
        )}
      </div>
    </div>
  )
}

function CardArtRow({
  rowKey,
  name,
  detail,
  portrait,
  url,
  onUrlChange,
}: {
  rowKey: string
  name: string
  detail?: string
  portrait: boolean
  url: string
  onUrlChange: (next: string) => void
}) {
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border/70 bg-background/80 p-3">
      <div>
        <p className="font-medium text-foreground">{name}</p>
        {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
      </div>
      <ImportCardArtControls
        rowKey={rowKey}
        name={name}
        portrait={portrait}
        url={url}
        onUrlChange={onUrlChange}
      />
    </li>
  )
}

export function ImportCardArtPanel({
  content,
  value,
  onChange,
  sections,
  excludeSections,
  defaultSource,
  embedded = false,
  skippedKeys,
  onSourceBulkAction,
  continueReview,
}: ImportCardArtPanelProps) {
  const targets = useMemo(() => {
    const all = collectImportCardArtTargets(content, { defaultSource, skippedKeys })
    const excluded = excludeSections?.length ? new Set(excludeSections) : null
    const allowed = sections ? new Set(sections) : null
    return all.filter((target) => {
      if (excluded?.has(target.section)) return false
      if (allowed && !allowed.has(target.section)) return false
      return true
    })
  }, [content, defaultSource, sections, excludeSections, skippedKeys])
  const targetSeedKey = targets.map((target) => `${target.key}:${target.initialUrl ?? ""}`).join("|")
  useEffect(() => {
    const filled = fillBlankImportCardArtUrls(value, targets)
    if (filled) onChange(filled)
    // Re-seed when the visible target list changes, not on every URL edit (so Clear still works).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- value/onChange intentionally omitted
  }, [targetSeedKey])
  const [expanded, setExpanded] = useState(targets.length <= 6)
  const [query, setQuery] = useState("")
  const sourceGroups = useMemo(() => {
    const groups = new Map<string, typeof targets>()
    for (const target of targets) {
      const group = groups.get(target.source) ?? []
      group.push(target)
      groups.set(target.source, group)
    }
    return [...groups.entries()].map(([source, entries]) => ({ source, targets: entries }))
  }, [targets])
  const [sourcePageIndex, setSourcePageIndex] = useState(0)

  useEffect(() => {
    setSourcePageIndex((current) =>
      sourceGroups.length === 0 ? 0 : Math.min(current, sourceGroups.length - 1),
    )
  }, [sourceGroups.length])

  if (!targets.length) return null

  const filledCount = countImportCardArtUrls(value)
  const activeSourceGroup = sourceGroups[sourcePageIndex] ?? sourceGroups[0]
  const visibleTargets = activeSourceGroup?.targets ?? targets
  const multipleSources = sourceGroups.length > 1
  const onLastSource = multipleSources && sourcePageIndex >= sourceGroups.length - 1
  const showSourceContinue = Boolean(continueReview && onLastSource)
  const filteredTargets = searchItems(visibleTargets, query, {
    name: (target) => target.name,
    fields: [
      { name: "type", value: (target) => target.sectionLabel, weight: 1.3 },
      { name: "detail", value: (target) => target.detail, weight: 1 },
    ],
  })

  const grouped = filteredTargets.reduce<Record<string, typeof filteredTargets>>((acc, target) => {
    const group = acc[target.sectionLabel] ?? []
    group.push(target)
    acc[target.sectionLabel] = group
    return acc
  }, {})

  const updateUrl = (key: string, next: string) => {
    onChange({ ...value, [key]: next })
  }
  const bulkTargets: ImportSourceBulkTarget[] = visibleTargets.map((target) => ({
    sectionKey: target.section,
    sourceIndex: Number(target.key.slice(target.key.lastIndexOf(":") + 1)),
    name: target.name,
  }))
  const showContent = embedded || expanded

  return (
    <section
      className={
        embedded ? "space-y-3" : "overflow-hidden rounded-xl border-2 border-border bg-card"
      }
    >
      {!embedded ? (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
          aria-expanded={expanded}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 shrink-0 text-primary" />
              <h3 className="font-semibold text-foreground">Card art (optional)</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Paste image URLs for compendium browse cards and detail overlays. Skip any row to
              import without custom art.
              {filledCount > 0 ? (
                <span className="text-foreground/80">
                  {" "}
                  · {filledCount} URL{filledCount === 1 ? "" : "s"} set
                </span>
              ) : null}
            </p>
          </div>
          <ChevronDown
            className={cn(
              "mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180",
            )}
          />
        </button>
      ) : (
        <p className="text-xs text-muted-foreground">
          Review optional card art for this stage before continuing.
        </p>
      )}

      {showContent ? (
        <div
          className={
            embedded ? "space-y-4" : "space-y-4 border-t border-border px-4 pb-4 pt-3"
          }
        >
          {multipleSources ? (
            <>
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
              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Card art sources">
                {sourceGroups.map((group, index) => {
                  const active = index === sourcePageIndex
                  return (
                    <button
                      key={group.source}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        setSourcePageIndex(index)
                        setQuery("")
                      }}
                      className={`max-w-[14rem] truncate rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      }`}
                    >
                      {group.source} · {group.targets.length}
                    </button>
                  )
                })}
              </div>
            </>
          ) : null}

          {activeSourceGroup ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/25 bg-primary/[0.03] p-3">
              <h3 className="font-semibold text-foreground">{activeSourceGroup.source}</h3>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className="text-xs text-muted-foreground">
                  {visibleTargets.length} item{visibleTargets.length === 1 ? "" : "s"}
                </span>
                <ImportSourceBulkActions
                  source={activeSourceGroup.source}
                  targets={bulkTargets}
                  onAction={onSourceBulkAction}
                  actions={["skip"]}
                />
              </div>
            </div>
          ) : null}

          {visibleTargets.length > 8 ? (
            <SearchBox
              value={query}
              onChange={setQuery}
              suggestions={rankSearchResults(visibleTargets, query, {
                name: (target) => target.name,
                fields: [
                  { name: "type", value: (target) => target.sectionLabel, weight: 1.3 },
                  { name: "detail", value: (target) => target.detail },
                ],
                limit: 8,
              }).map((match) => ({
                id: match.item.key,
                label: match.item.name,
                detail: [match.item.sectionLabel, match.item.detail].filter(Boolean).join(" · "),
                item: match.item,
                matchKind: match.kind,
              }))}
              onSelect={(suggestion) => setQuery(suggestion.label)}
              scope="import:card-art"
              placeholder="Filter by name or type…"
              ariaLabel="Search card art targets"
              inputClassName="border"
            />
          ) : null}

          {filteredTargets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items match your filter.</p>
          ) : (
            Object.entries(grouped).map(([sectionLabel, sectionTargets]) => (
              <div key={sectionLabel} className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {sectionLabel}
                </h4>
                <ul className="space-y-2">
                  {sectionTargets.map((target) => (
                    <CardArtRow
                      key={target.key}
                      rowKey={target.key}
                      name={target.name}
                      detail={target.detail}
                      portrait={importCardArtUsesPortraitArt(target.compendiumTab)}
                      url={value[target.key] ?? ""}
                      onUrlChange={(next) => updateUrl(target.key, next)}
                    />
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      ) : null}
    </section>
  )
}
