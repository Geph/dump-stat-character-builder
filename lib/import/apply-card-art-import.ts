import type { ImportContent } from "@/lib/import/content-schema"
import { normalizeCardImageUrl } from "@/lib/compendium/card-image"
import type { PersistImportResult } from "@/lib/import/persist-import-types"
import type { CompendiumTable } from "@/lib/db/tables"

export const CARD_ART_CONTENT_TYPES = [
  "class",
  "subclass",
  "species",
  "background",
  "spell",
  "equipment",
  "ability",
] as const

export type CardArtContentType = (typeof CARD_ART_CONTENT_TYPES)[number]

export type CardArtImportEntry = {
  content_type: CardArtContentType
  name: string
  card_image_url: string
  /** Required when content_type is subclass and multiple subclasses share a name. */
  class_name?: string | null
}

const STORE_BY_TYPE: Record<CardArtContentType, CompendiumTable> = {
  class: "classes",
  subclass: "subclasses",
  species: "species",
  background: "backgrounds",
  spell: "spells",
  equipment: "equipment",
  ability: "custom_abilities",
}

/** True when this paste is an images/card-art map (not a full content extract). */
export function isCardArtOnlyImport(content: ImportContent): boolean {
  if (!content.card_art?.length) return false
  if (content.class_resources?.length) return false
  if (content.feats?.length) return false
  if (content.creatures?.length) return false
  if (content.abilities?.length) return false
  if (content.import_proposals?.custom_abilities?.length) return false
  if (content.import_proposals?.class_resources?.length) return false
  return true
}

/**
 * Expand card_art[] into lightweight review stubs so collision + card-art panels work.
 * Does not invent class rules — stubs only carry name + card_image_url (+ class_name for subclasses).
 */
export function expandCardArtIntoReviewStubs(content: ImportContent): ImportContent {
  if (!content.card_art?.length) return content

  const classes = [...(content.classes ?? [])]
  const subclasses = [...(content.subclasses ?? [])]
  const species = [...(content.species ?? [])]
  const backgrounds = [...(content.backgrounds ?? [])]
  const spells = [...(content.spells ?? [])]
  const equipment = [...(content.equipment ?? [])]
  const abilities = [...(content.abilities ?? [])]

  for (const entry of content.card_art) {
    const url = normalizeCardImageUrl(entry.card_image_url) ?? entry.card_image_url.trim()
    const name = entry.name.trim()
    if (!name || !url) continue
    switch (entry.content_type) {
      case "class":
        if (!classes.some((row) => row.name.trim().toLowerCase() === name.toLowerCase())) {
          classes.push({
            name,
            description: null,
            hit_die: 8,
            primary_ability: [],
            features: [],
            card_image_url: url,
          })
        }
        break
      case "subclass":
        if (
          !subclasses.some(
            (row) =>
              row.name.trim().toLowerCase() === name.toLowerCase() &&
              (!entry.class_name ||
                row.class_name.trim().toLowerCase() === entry.class_name.trim().toLowerCase()),
          )
        ) {
          subclasses.push({
            name,
            class_name: entry.class_name?.trim() || "Unknown",
            description: null,
            features: [],
            card_image_url: url,
          })
        }
        break
      case "species":
        if (!species.some((row) => row.name.trim().toLowerCase() === name.toLowerCase())) {
          species.push({
            name,
            description: null,
            speed: null,
            size: null,
            traits: [],
            card_image_url: url,
          })
        }
        break
      case "background":
        if (!backgrounds.some((row) => row.name.trim().toLowerCase() === name.toLowerCase())) {
          backgrounds.push({
            name,
            description: null,
            skill_proficiencies: null,
            feat_granted: null,
            ability_bonuses: null,
            card_image_url: url,
          })
        }
        break
      case "spell":
        if (!spells.some((row) => row.name.trim().toLowerCase() === name.toLowerCase())) {
          spells.push({
            name,
            level: 0,
            school: "Unknown",
            casting_time: null,
            range: null,
            components: null,
            duration: null,
            concentration: false,
            description: null,
            classes: null,
            card_image_url: url,
          })
        }
        break
      case "equipment":
        if (!equipment.some((row) => row.name.trim().toLowerCase() === name.toLowerCase())) {
          equipment.push({
            name,
            category: "Other",
            subcategory: null,
            description: null,
            card_image_url: url,
          })
        }
        break
      case "ability":
        if (!abilities.some((row) => row.name.trim().toLowerCase() === name.toLowerCase())) {
          abilities.push({
            name,
            description: "",
            source_type: null,
            source_name: null,
            level_requirement: null,
            card_image_url: url,
          })
        }
        break
    }
  }

  return {
    ...content,
    classes: classes.length ? classes : content.classes,
    subclasses: subclasses.length ? subclasses : content.subclasses,
    species: species.length ? species : content.species,
    backgrounds: backgrounds.length ? backgrounds : content.backgrounds,
    spells: spells.length ? spells : content.spells,
    equipment: equipment.length ? equipment : content.equipment,
    abilities: abilities.length ? abilities : content.abilities,
  }
}

function nameKey(value: string): string {
  return value.trim().toLowerCase()
}

export type CardArtPersistDeps = {
  listRows: (store: CompendiumTable) => Promise<Record<string, unknown>[]>
  upsertByName: (
    store: CompendiumTable,
    rows: Record<string, unknown>[],
  ) => Promise<Record<string, unknown>[]>
}

/** After review/card-art panel edits, prefer stub row URLs over the original card_art list. */
export function syncCardArtEntriesFromContent(content: ImportContent): CardArtImportEntry[] {
  if (!content.card_art?.length) return []
  return content.card_art.map((entry) => {
    const name = entry.name.trim().toLowerCase()
    let stubUrl: string | null | undefined
    switch (entry.content_type) {
      case "class":
        stubUrl = content.classes?.find((row) => row.name.trim().toLowerCase() === name)?.card_image_url
        break
      case "subclass":
        stubUrl = content.subclasses?.find((row) => {
          if (row.name.trim().toLowerCase() !== name) return false
          if (!entry.class_name?.trim()) return true
          return row.class_name.trim().toLowerCase() === entry.class_name.trim().toLowerCase()
        })?.card_image_url
        break
      case "species":
        stubUrl = content.species?.find((row) => row.name.trim().toLowerCase() === name)?.card_image_url
        break
      case "background":
        stubUrl = content.backgrounds?.find((row) => row.name.trim().toLowerCase() === name)?.card_image_url
        break
      case "spell":
        stubUrl = content.spells?.find((row) => row.name.trim().toLowerCase() === name)?.card_image_url
        break
      case "equipment":
        stubUrl = content.equipment?.find((row) => row.name.trim().toLowerCase() === name)?.card_image_url
        break
      case "ability":
        stubUrl = content.abilities?.find((row) => row.name.trim().toLowerCase() === name)?.card_image_url
        break
    }
    const normalized = normalizeCardImageUrl(stubUrl) ?? normalizeCardImageUrl(entry.card_image_url)
    return {
      ...entry,
      card_image_url: normalized ?? entry.card_image_url,
    }
  })
}

/** Merge card_image_url onto existing compendium rows; never replace full records with stubs. */
export async function persistCardArtImport(
  entries: CardArtImportEntry[],
  deps: CardArtPersistDeps,
): Promise<PersistImportResult> {
  const breakdown: Record<string, number> = {}
  const warnings: string[] = []
  let totalImported = 0

  const byStore = new Map<CompendiumTable, CardArtImportEntry[]>()
  for (const entry of entries) {
    const store = STORE_BY_TYPE[entry.content_type]
    const list = byStore.get(store) ?? []
    list.push(entry)
    byStore.set(store, list)
  }

  for (const [store, storeEntries] of byStore) {
    const existing = await deps.listRows(store)
    const patches: Record<string, unknown>[] = []

    for (const entry of storeEntries) {
      const url = normalizeCardImageUrl(entry.card_image_url)
      if (!url) {
        warnings.push(`Skipped "${entry.name}": invalid or empty card_image_url.`)
        continue
      }
      const matches = existing.filter((row) => {
        if (nameKey(String(row.name ?? "")) !== nameKey(entry.name)) return false
        if (entry.content_type !== "subclass" || !entry.class_name?.trim()) return true
        // Subclasses store parent via class_id; class_name may not be on the row.
        // Match by name only when class_name omitted; when provided, prefer rows whose
        // embedded class name matches if present.
        const rowClassName = String(
          (row as { class_name?: string }).class_name ??
            (row as { classes?: { name?: string } }).classes?.name ??
            "",
        )
        if (!rowClassName) return true
        return nameKey(rowClassName) === nameKey(entry.class_name)
      })

      if (!matches.length) {
        warnings.push(
          `No existing ${entry.content_type} named "${entry.name}"${
            entry.class_name ? ` (${entry.class_name})` : ""
          } — skipped.`,
        )
        continue
      }
      if (matches.length > 1 && entry.content_type === "subclass" && !entry.class_name?.trim()) {
        warnings.push(
          `Multiple subclasses named "${entry.name}" — add class_name to disambiguate; skipped.`,
        )
        continue
      }
      if (matches.length > 1) {
        warnings.push(
          `Multiple ${entry.content_type} rows named "${entry.name}" — updating the first match.`,
        )
      }

      const prev = matches[0]!
      patches.push({
        ...prev,
        card_image_url: url,
      })
    }

    if (patches.length) {
      await deps.upsertByName(store, patches)
      breakdown[store] = (breakdown[store] ?? 0) + patches.length
      totalImported += patches.length
    }
  }

  return {
    totalImported,
    breakdown,
    warnings,
  }
}
