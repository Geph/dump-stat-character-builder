"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ImageIcon, Search } from "lucide-react"
import type { ImportContent } from "@/lib/import/content-schema"
import {
  CLASS_CARD_ASPECT_CLASS,
  WIDE_CARD_ASPECT_CLASS,
} from "@/lib/compendium/card-image"
import {
  collectImportCardArtTargets,
  countImportCardArtUrls,
  importCardArtUsesPortraitArt,
  type ImportCardArtUrlMap,
} from "@/lib/import/import-card-art"
import { normalizeCardImageUrl } from "@/lib/compendium/card-image"
import { cn } from "@/lib/utils"

type ImportCardArtPanelProps = {
  content: ImportContent
  value: ImportCardArtUrlMap
  onChange: (map: ImportCardArtUrlMap) => void
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
  const preview = normalizeCardImageUrl(url)
  const aspectClass = portrait ? CLASS_CARD_ASPECT_CLASS : WIDE_CARD_ASPECT_CLASS
  const previewCropClass = portrait
    ? "h-full w-full object-cover object-top"
    : "h-full w-full object-cover object-center"

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border/70 bg-background/80 p-3 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="font-medium text-foreground">{name}</p>
          {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
        </div>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor={`card-art-${rowKey}`}>
            Image URL for {name}
          </label>
          <input
            id={`card-art-${rowKey}`}
            type="url"
            value={url}
            onChange={(event) => onUrlChange(event.target.value)}
            placeholder="https://… (optional)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
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
    </li>
  )
}

export function ImportCardArtPanel({ content, value, onChange }: ImportCardArtPanelProps) {
  const targets = useMemo(() => collectImportCardArtTargets(content), [content])
  const [expanded, setExpanded] = useState(targets.length <= 6)
  const [query, setQuery] = useState("")

  if (!targets.length) return null

  const filledCount = countImportCardArtUrls(value)
  const normalizedQuery = query.trim().toLowerCase()
  const filteredTargets = normalizedQuery
    ? targets.filter(
        (target) =>
          target.name.toLowerCase().includes(normalizedQuery) ||
          target.sectionLabel.toLowerCase().includes(normalizedQuery) ||
          target.detail?.toLowerCase().includes(normalizedQuery),
      )
    : targets

  const grouped = filteredTargets.reduce<Record<string, typeof filteredTargets>>((acc, target) => {
    const group = acc[target.sectionLabel] ?? []
    group.push(target)
    acc[target.sectionLabel] = group
    return acc
  }, {})

  const updateUrl = (key: string, next: string) => {
    onChange({ ...value, [key]: next })
  }

  return (
    <section className="rounded-xl border-2 border-border bg-card overflow-hidden">
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
            Paste image URLs for compendium browse cards and detail overlays. Skip any row to import
            without custom art.
            {filledCount > 0 ? (
              <span className="text-foreground/80"> · {filledCount} URL{filledCount === 1 ? "" : "s"} set</span>
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

      {expanded ? (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
          {targets.length > 8 ? (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter by name or type…"
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
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
