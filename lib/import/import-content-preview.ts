import type { ImportContent } from "@/lib/import/content-schema"
import { formatEquipmentCost } from "@/lib/compendium/equipment-display"
import { isMagicItem } from "@/lib/compendium/equipment-attunement"
import type { Equipment } from "@/lib/types"

export type ImportContentPreviewDetail = {
  label: string
  value: string
}

export type ImportContentPreviewItem = {
  id: string
  name: string
  details: ImportContentPreviewDetail[]
  badges: string[]
  descriptionSnippet?: string
}

export type ImportContentPreviewSection = {
  key: string
  label: string
  items: ImportContentPreviewItem[]
}

const PREVIEW_LIMIT = 16

function snippet(text: string | null | undefined, max = 200): string | undefined {
  if (!text?.trim()) return undefined
  const plain = text
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (!plain) return undefined
  return plain.length <= max ? plain : `${plain.slice(0, max - 1)}…`
}

function spellLevelLabel(level: number): string {
  if (level === 0) return "Cantrip"
  const suffix = level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th"
  return `${level}${suffix}`
}

function previewSpells(content: ImportContent): ImportContentPreviewSection | null {
  const spells = content.spells
  if (!spells?.length) return null

  const items = [...spells]
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
    .map((spell) => {
      const details: ImportContentPreviewDetail[] = [
        { label: "Level", value: spellLevelLabel(spell.level) },
        { label: "School", value: spell.school },
      ]
      if (spell.casting_time) details.push({ label: "Casting time", value: spell.casting_time })
      if (spell.range) details.push({ label: "Range", value: spell.range })
      if (spell.duration) details.push({ label: "Duration", value: spell.duration })
      if (spell.components?.length) {
        details.push({ label: "Components", value: spell.components.join(", ") })
      }
      if (spell.classes?.length) {
        details.push({ label: "Classes", value: spell.classes.join(", ") })
      }

      const augments = spell.psionic_augments as { augments?: unknown[] } | null | undefined
      const badges: string[] = []
      if (spell.concentration) badges.push("Concentration")
      if (augments?.augments?.length) {
        badges.push(`${augments.augments.length} psi augment${augments.augments.length === 1 ? "" : "s"}`)
      }

      return {
        id: `spell:${spell.name}`,
        name: spell.name,
        details,
        badges,
        descriptionSnippet: snippet(spell.description),
      }
    })

  return { key: "spells", label: "Spells", items }
}

function previewEquipment(content: ImportContent): ImportContentPreviewSection | null {
  const equipment = content.equipment
  if (!equipment?.length) return null

  const items = [...equipment]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((row) => {
      const item = row as Equipment & {
        magic_effects?: unknown[]
        linkedModifiers?: unknown[]
      }
      const details: ImportContentPreviewDetail[] = []
      if (item.category) details.push({ label: "Category", value: item.category })
      if (item.subcategory) details.push({ label: "Type", value: item.subcategory })
      if (item.magic_item_category) {
        details.push({ label: "Magic type", value: item.magic_item_category })
      }
      if (item.rarity) details.push({ label: "Rarity", value: item.rarity })
      if (item.requires_attunement != null) {
        details.push({
          label: "Attunement",
          value: item.requires_attunement ? "Required" : "Not required",
        })
      }
      const cost = formatEquipmentCost(item.cost)
      if (cost) details.push({ label: "Cost", value: cost })
      else if (isMagicItem(item)) details.push({ label: "Cost", value: "N/A" })
      if (item.weight != null) details.push({ label: "Weight", value: `${item.weight} lb.` })

      const magicEffectCount =
        (Array.isArray(item.magic_effects) ? item.magic_effects.length : 0) +
        (Array.isArray(item.linkedModifiers) ? item.linkedModifiers.length : 0)
      if (magicEffectCount > 0) {
        details.push({
          label: "Magic effects",
          value: `${magicEffectCount} wired`,
        })
      }

      const badges: string[] = []
      if (isMagicItem(item)) badges.push("Magic item")

      return {
        id: `equipment:${item.name}`,
        name: item.name,
        details,
        badges,
        descriptionSnippet: snippet(item.description),
      }
    })

  return { key: "equipment", label: "Equipment & magic items", items }
}

function previewFeats(content: ImportContent): ImportContentPreviewSection | null {
  const feats = content.feats
  if (!feats?.length) return null

  const items = [...feats]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((feat) => {
      const details: ImportContentPreviewDetail[] = []
      if (feat.category) details.push({ label: "Category", value: feat.category })
      if (feat.prerequisite) details.push({ label: "Prerequisite", value: feat.prerequisite })
      if ((feat.level_requirement ?? 0) > 1) {
        details.push({ label: "Level", value: `${feat.level_requirement}+` })
      }
      const mechanics = feat.mechanics?.length ?? 0
      const linked = (feat as { linkedModifiers?: unknown[] }).linkedModifiers?.length ?? 0
      if (mechanics > 0 || linked > 0) {
        details.push({
          label: "Modifiers",
          value: `${mechanics + linked} linked`,
        })
      }

      return {
        id: `feat:${feat.name}`,
        name: feat.name,
        details,
        badges: [],
        descriptionSnippet: snippet(feat.description),
      }
    })

  return { key: "feats", label: "Feats", items }
}

function previewSpecies(content: ImportContent): ImportContentPreviewSection | null {
  const species = content.species
  if (!species?.length) return null

  const items = species.map((row) => ({
    id: `species:${row.name}`,
    name: row.name,
    details: [
      { label: "Size", value: row.size },
      { label: "Speed", value: `${row.speed} ft.` },
      { label: "Traits", value: String(row.traits?.length ?? 0) },
    ],
    badges: [],
    descriptionSnippet: snippet(row.description),
  }))

  return { key: "species", label: "Species", items: items as ImportContentPreviewItem[] }
}

function previewBackgrounds(content: ImportContent): ImportContentPreviewSection | null {
  const backgrounds = content.backgrounds
  if (!backgrounds?.length) return null

  const items = backgrounds.map((row) => {
    const details: ImportContentPreviewDetail[] = []
    if (row.skill_proficiencies?.length) {
      details.push({ label: "Skills", value: row.skill_proficiencies.join(", ") })
    }
    if (row.feat_granted) details.push({ label: "Feat", value: row.feat_granted })
    return {
      id: `background:${row.name}`,
      name: row.name,
      details,
      badges: [],
      descriptionSnippet: snippet(row.description),
    }
  })

  return { key: "backgrounds", label: "Backgrounds", items }
}

/** Structured preview rows for spells, equipment, feats, and other non-class import content. */
export function collectImportContentPreview(content: ImportContent): ImportContentPreviewSection[] {
  return [
    previewSpells(content),
    previewEquipment(content),
    previewFeats(content),
    previewSpecies(content),
    previewBackgrounds(content),
  ].filter((section): section is ImportContentPreviewSection => section != null)
}

export function importContentPreviewLimit(): number {
  return PREVIEW_LIMIT
}
