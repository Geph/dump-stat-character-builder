import type { CompendiumContentType } from "@/lib/compendium/content-types"
import {
  compendiumUsesPortraitCardArt,
  normalizeCardImageUrl,
} from "@/lib/compendium/card-image"
import { isMagicItem } from "@/lib/compendium/equipment-attunement"
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
  detail?: string
  /** Compendium tab used for aspect / crop hints in the review UI. */
  compendiumTab: CompendiumContentType
  initialUrl: string | null
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

function rowInitialUrl(row: { card_image_url?: string | null }): string | null {
  return normalizeCardImageUrl(row.card_image_url)
}

function pushTargets<T extends { name: string; card_image_url?: string | null }>(
  targets: ImportCardArtTarget[],
  section: ImportCardArtSection,
  rows: T[] | undefined,
  options?: {
    detail?: (row: T) => string | undefined
    include?: (row: T) => boolean
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
      detail: options?.detail?.(row),
      compendiumTab,
      initialUrl: rowInitialUrl(row),
    })
  })
}

/** Collect compendium rows eligible for optional card art during import review. */
export function collectImportCardArtTargets(content: ImportContent): ImportCardArtTarget[] {
  const targets: ImportCardArtTarget[] = []

  pushTargets(targets, "classes", content.classes)
  pushTargets(targets, "subclasses", content.subclasses, {
    detail: (row) => (row.class_name ? row.class_name : undefined),
  })
  pushTargets(targets, "species", content.species)
  pushTargets(targets, "backgrounds", content.backgrounds)
  pushTargets(targets, "spells", content.spells)
  pushTargets(targets, "equipment", content.equipment, {
    include: (row) => isMagicItem(row as Equipment),
    detail: (row) => {
      const item = row as Equipment
      return item.magic_item_category?.trim() || item.rarity?.trim() || undefined
    },
  })

  const abilities = (content as ImportContentWithAbilities).abilities
  pushTargets(targets, "abilities", abilities)

  return targets
}

export function buildInitialImportCardArtUrlMap(content: ImportContent): ImportCardArtUrlMap {
  const map: ImportCardArtUrlMap = {}
  for (const target of collectImportCardArtTargets(content)) {
    map[target.key] = target.initialUrl ?? ""
  }
  return map
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

export function countImportCardArtUrls(urlMap: ImportCardArtUrlMap): number {
  return Object.values(urlMap).filter((value) => normalizeCardImageUrl(value)).length
}
