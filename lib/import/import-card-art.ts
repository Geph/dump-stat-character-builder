import { filterAvailableDefaultCardImageUrl } from "@/lib/compendium/available-card-art"
import type { CompendiumContentType } from "@/lib/compendium/content-types"
import {
  compendiumUsesPortraitCardArt,
  isHostedDumpstatCardImageUrl,
  normalizeCardImageUrl,
} from "@/lib/compendium/card-image"
import { isCardArtOnlyImport } from "@/lib/import/apply-card-art-import"
import { defaultBackgroundCardImageUrl } from "@/lib/compendium/background-card-images-defaults"
import { defaultClassCardImageUrl } from "@/lib/compendium/class-card-images-defaults"
import { defaultSpeciesCardImageUrl } from "@/lib/compendium/species-card-images-defaults"
import { defaultSpellCardImageUrl } from "@/lib/compendium/spell-card-images-defaults"
import { defaultSubclassCardImageUrl } from "@/lib/compendium/subclass-card-images-defaults"
import { isMagicItem } from "@/lib/compendium/equipment-attunement"
import { shouldAssignBundledCardArt } from "@/lib/site-settings/app-presentation-mode"
import type { Equipment } from "@/lib/types"
import type { ImportContent, ImportContentWithAbilities } from "@/lib/import/content-schema"

/** Import content array keys that may receive card_image_url on persist. */
export type ImportCardArtSection =
  | "classes"
  | "subclasses"
  | "species"
  | "backgrounds"
  | "spells"
  | "equipment"
  | "abilities"

export type ImportCardArtTarget = {
  key: string
  section: ImportCardArtSection
  sectionLabel: string
  name: string
  source: string
  detail?: string
  /** Compendium tab used for aspect / crop hints in the review UI. */
  compendiumTab: CompendiumContentType
  initialUrl: string | null
  /** Mapped or stamped `/images/compendium/…` path to try when the file exists locally. */
  localCandidateUrl: string | null
}

export type ImportCardArtUrlMap = Record<string, string>

const SECTION_LABELS: Record<ImportCardArtSection, string> = {
  classes: "Classes",
  subclasses: "Subclasses",
  species: "Species",
  backgrounds: "Backgrounds",
  spells: "Spells",
  equipment: "Magic items",
  abilities: "Abilities",
}

const SECTION_COMPENDIUM_TAB: Record<ImportCardArtSection, CompendiumContentType> = {
  classes: "classes",
  subclasses: "subclasses",
  species: "species",
  backgrounds: "backgrounds",
  spells: "spells",
  equipment: "magic_items",
  abilities: "abilities",
}

export function importCardArtTargetKey(section: ImportCardArtSection, index: number): string {
  return `${section}:${index}`
}

export function isLocalCompendiumCardArtUrl(url: string): boolean {
  return /\/images\/compendium\//i.test(url)
}

/** Keep remote / data URLs; keep local `/images/compendium/…` only when the file is present. */
export function usableImportCardArtUrl(url: string | null | undefined): string | null {
  const existing = normalizeCardImageUrl(url)
  if (!existing) return null
  if (!isLocalCompendiumCardArtUrl(existing)) return existing
  return filterAvailableDefaultCardImageUrl(existing)
}

/** Bundled / hosted card defaults keyed by item name (when the import row has no URL). */
export function defaultImportCardArtUrl(
  section: ImportCardArtSection,
  name: string,
  options?: { className?: string | null; requireAvailable?: boolean },
): string | null {
  if (!shouldAssignBundledCardArt()) return null
  const trimmed = name.trim()
  if (!trimmed) return null
  const availability = { requireAvailable: options?.requireAvailable !== false }
  switch (section) {
    case "classes":
      return defaultClassCardImageUrl(trimmed, availability)
    case "subclasses":
      return defaultSubclassCardImageUrl(trimmed, options?.className, availability)
    case "species":
      return defaultSpeciesCardImageUrl(trimmed, availability)
    case "backgrounds":
      return defaultBackgroundCardImageUrl(trimmed, availability)
    case "spells":
      return defaultSpellCardImageUrl(trimmed)
    case "equipment":
    case "abilities":
      return null
  }
}

function mappedLocalImportCardArtUrl(
  section: ImportCardArtSection,
  row: { name: string; card_image_url?: string | null; class_name?: string | null },
): string | null {
  const existing = normalizeCardImageUrl(row.card_image_url)
  if (existing && isLocalCompendiumCardArtUrl(existing)) return existing
  const mapped = defaultImportCardArtUrl(section, row.name, {
    className: row.class_name,
    requireAvailable: false,
  })
  return mapped && isLocalCompendiumCardArtUrl(mapped) ? mapped : null
}

function rowInitialUrl(
  section: ImportCardArtSection,
  row: { name: string; card_image_url?: string | null; class_name?: string | null },
  options?: { keepExistingUrl?: boolean },
): string | null {
  const existing = normalizeCardImageUrl(row.card_image_url)
  const usableExisting = usableImportCardArtUrl(existing)
  if (options?.keepExistingUrl && usableExisting) return usableExisting
  const bundled = defaultImportCardArtUrl(section, row.name, {
    className: row.class_name,
  })
  // Prefer bundled defaults over leftover WotC dumpstat hosts (same rule as applyBundledCardImage).
  if (existing && isHostedDumpstatCardImageUrl(existing)) {
    return bundled
  }
  return usableExisting ?? bundled
}

function pushTargets<T extends { name: string; card_image_url?: string | null }>(
  targets: ImportCardArtTarget[],
  section: ImportCardArtSection,
  rows: T[] | undefined,
  options?: {
    detail?: (row: T) => string | undefined
    include?: (row: T) => boolean
    keepExistingUrl?: boolean
    source?: (row: T) => string | null | undefined
  },
): void {
  if (!rows?.length) return
  const sectionLabel = SECTION_LABELS[section]
  const compendiumTab = SECTION_COMPENDIUM_TAB[section]

  rows.forEach((row, index) => {
    if (options?.include && !options.include(row)) return
    const name = String(row.name ?? "").trim()
    if (!name) return
    targets.push({
      key: importCardArtTargetKey(section, index),
      section,
      sectionLabel,
      name,
      source: options?.source?.(row)?.trim() || "Imported content",
      detail: options?.detail?.(row),
      compendiumTab,
      initialUrl: rowInitialUrl(section, row, { keepExistingUrl: options?.keepExistingUrl }),
      localCandidateUrl: mappedLocalImportCardArtUrl(section, row),
    })
  })
}

/** Collect compendium rows eligible for optional card art during import review. */
export function collectImportCardArtTargets(
  content: ImportContent,
  options?: {
    defaultSource?: string
    /** Soft-skip keys from content preview (`section:index`). */
    skippedKeys?: ReadonlySet<string> | readonly string[]
  },
): ImportCardArtTarget[] {
  if (!shouldAssignBundledCardArt()) return []

  const skipped = !options?.skippedKeys
    ? null
    : options.skippedKeys instanceof Set
      ? options.skippedKeys
      : new Set(options.skippedKeys)

  const targets: ImportCardArtTarget[] = []
  const keepExistingUrl = isCardArtOnlyImport(content)
  const defaultSource = options?.defaultSource?.trim() || "Imported content"
  const rowSource = (row: unknown) =>
    (row as { source?: string | null }).source?.trim() || defaultSource
  const classSources = new Map(
    (content.classes ?? []).map((row) => [row.name.trim().toLowerCase(), rowSource(row)]),
  )

  pushTargets(targets, "classes", content.classes, { keepExistingUrl, source: rowSource })
  pushTargets(targets, "subclasses", content.subclasses, {
    keepExistingUrl,
    detail: (row) => (row.class_name ? row.class_name : undefined),
    source: (row) =>
      rowSource(row) !== defaultSource
        ? rowSource(row)
        : classSources.get(row.class_name?.trim().toLowerCase() ?? "") ?? defaultSource,
  })
  pushTargets(targets, "species", content.species, { keepExistingUrl, source: rowSource })
  pushTargets(targets, "backgrounds", content.backgrounds, { keepExistingUrl, source: rowSource })
  pushTargets(targets, "spells", content.spells, { keepExistingUrl, source: rowSource })
  pushTargets(targets, "equipment", content.equipment, {
    keepExistingUrl,
    source: rowSource,
    include: (row) => isMagicItem(row as Equipment),
    detail: (row) => {
      const item = row as Equipment
      return item.magic_item_category?.trim() || item.rarity?.trim() || undefined
    },
  })

  const abilities = (content as ImportContentWithAbilities).abilities
  pushTargets(targets, "abilities", abilities, { keepExistingUrl, source: rowSource })

  if (!skipped?.size) return targets
  return targets.filter((target) => !skipped.has(target.key))
}

export function buildInitialImportCardArtUrlMap(content: ImportContent): ImportCardArtUrlMap {
  const map: ImportCardArtUrlMap = {}
  for (const target of collectImportCardArtTargets(content)) {
    map[target.key] = target.initialUrl ?? ""
  }
  return map
}

/**
 * Restore bundled / row URLs that the review map is missing or blanked.
 * Used when `type=url` inputs strip relative `/images/compendium/…` paths.
 * Does not restore local paths that are not present on this install.
 */
export function fillBlankImportCardArtUrls(
  value: ImportCardArtUrlMap,
  targets: readonly Pick<ImportCardArtTarget, "key" | "initialUrl">[],
): ImportCardArtUrlMap | null {
  let changed = false
  const next = { ...value }
  for (const target of targets) {
    const initial = usableImportCardArtUrl(target.initialUrl)
    if (!initial) continue
    if ((next[target.key] ?? "").trim()) continue
    next[target.key] = initial
    changed = true
  }
  return changed ? next : null
}

/** Prefer the reviewer's current URL when it is a remote URL or a present local file. */
export function mergeImportCardArtUrlMap(
  initial: ImportCardArtUrlMap,
  current: ImportCardArtUrlMap,
): ImportCardArtUrlMap {
  const next = { ...initial }
  for (const [key, value] of Object.entries(current)) {
    if (!(key in next)) continue
    const kept = usableImportCardArtUrl(value)
    if (kept) next[key] = kept
  }
  return next
}

export function importCardArtUsesPortraitArt(tab: CompendiumContentType): boolean {
  return compendiumUsesPortraitCardArt(tab)
}

function applyCardArtToRows<T extends { card_image_url?: string | null }>(
  rows: T[] | undefined,
  section: ImportCardArtSection,
  urlMap: ImportCardArtUrlMap,
  options?: { includeRow?: (row: T) => boolean },
): T[] | undefined {
  if (!rows?.length) return rows
  return rows.map((row, index) => {
    if (options?.includeRow && !options.includeRow(row)) return row
    const key = importCardArtTargetKey(section, index)
    if (!(key in urlMap)) return row
    const normalized = normalizeCardImageUrl(urlMap[key])
    return { ...row, card_image_url: normalized }
  })
}

/** Merge review-stage card art URLs onto import rows (after renames / proposal selection). */
export function applyImportCardArtUrls(
  content: ImportContent,
  urlMap: ImportCardArtUrlMap,
): ImportContent {
  if (!shouldAssignBundledCardArt()) {
    return stripImportContentCardArt(content)
  }
  if (!Object.keys(urlMap).length) return content

  const withAbilities = content as ImportContentWithAbilities
  const next: ImportContent = {
    ...content,
    classes: applyCardArtToRows(content.classes, "classes", urlMap),
    subclasses: applyCardArtToRows(content.subclasses, "subclasses", urlMap),
    species: applyCardArtToRows(content.species, "species", urlMap),
    backgrounds: applyCardArtToRows(content.backgrounds, "backgrounds", urlMap),
    spells: applyCardArtToRows(content.spells, "spells", urlMap),
    equipment: applyCardArtToRows(content.equipment, "equipment", urlMap, {
      includeRow: (row) => isMagicItem(row as Equipment),
    }),
  }

  if (withAbilities.abilities?.length) {
    ;(next as ImportContentWithAbilities).abilities = applyCardArtToRows(
      withAbilities.abilities,
      "abilities",
      urlMap,
    )
  }

  return next
}

/** Drop all card art from import rows (Compact Only). */
export function stripImportContentCardArt(content: ImportContent): ImportContent {
  const clear = <T extends { card_image_url?: string | null }>(
    rows: T[] | undefined,
  ): T[] | undefined => {
    if (!rows?.length) return rows
    return rows.map((row) => ({ ...row, card_image_url: null }))
  }

  const withAbilities = content as ImportContentWithAbilities
  const next: ImportContent = {
    ...content,
    classes: clear(content.classes),
    subclasses: clear(content.subclasses),
    species: clear(content.species),
    backgrounds: clear(content.backgrounds),
    spells: clear(content.spells),
    equipment: clear(content.equipment),
  }

  if (withAbilities.abilities?.length) {
    ;(next as ImportContentWithAbilities).abilities = clear(withAbilities.abilities)
  }

  return next
}

export function countImportCardArtUrls(urlMap: ImportCardArtUrlMap): number {
  return Object.values(urlMap).filter((value) => normalizeCardImageUrl(value)).length
}
