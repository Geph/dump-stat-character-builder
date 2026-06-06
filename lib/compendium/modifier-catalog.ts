import {
  ACTION_EFFECT_GROUPS,
  ACTION_EFFECT_OPTIONS,
} from "@/lib/compendium/class-feature-metadata"
import {
  CHARACTERISTIC_MODIFIER_TYPE_OPTIONS,
  createCharacteristicModifier,
  type CharacteristicModifier,
  type CharacteristicModifierType,
} from "@/lib/compendium/characteristic-modifiers"
import type { FeatureActivation } from "@/lib/types"

/** Fixed id for the system-owned common modifiers custom ability. */
export const COMMON_MODIFIERS_CATALOG_ID = "00000000-0000-4000-8000-000000000001"

export const COMMON_MODIFIERS_CATALOG_NAME = "Common Modifier Effects"

export const MODIFIER_CATALOG_INFO =
  "This system entry defines reusable mechanical effects shared across class features, subclasses, feats, species traits, and custom abilities. Edit entries here; other compendium editors pick from this list via searchable dropdowns instead of defining effects inline."

export const MODIFIER_CATALOG_GROUPS = [
  "Ability scores & checks",
  "Skills & saving throws",
  "Proficiencies",
  "Armor & hit points",
  "Movement & senses",
  "Attack & damage",
  "Damage mitigation",
  "Spells & casting",
  "Active abilities",
  "Resources & uses",
] as const

export type ModifierCatalogGroup = (typeof MODIFIER_CATALOG_GROUPS)[number]

export interface ModifierCatalogEntry {
  id: string
  name: string
  group: ModifierCatalogGroup | string
  summary?: string
  description?: string
  characteristics?: CharacteristicModifier[]
  activation?: FeatureActivation | null
}

const CHARACTERISTIC_GROUP: Record<CharacteristicModifierType, ModifierCatalogGroup> = {
  ability_scores: "Ability scores & checks",
  skills: "Skills & saving throws",
  languages: "Proficiencies",
  armor_proficiencies: "Proficiencies",
  weapon_proficiencies: "Proficiencies",
  tool_proficiencies: "Proficiencies",
  saving_throws: "Skills & saving throws",
  ac: "Armor & hit points",
  hit_points: "Armor & hit points",
  initiative: "Ability scores & checks",
  vision: "Movement & senses",
  speed: "Movement & senses",
  attack_roll_modifiers: "Attack & damage",
  damage_roll_modifiers: "Attack & damage",
  unarmed_strike_damage: "Attack & damage",
  damage_resistance: "Damage mitigation",
  damage_immunity: "Damage mitigation",
  damage_reduction: "Damage mitigation",
  spells: "Spells & casting",
  spells_known: "Spells & casting",
  spellcasting_ability: "Spells & casting",
  uses: "Resources & uses",
}

const ACTION_EFFECT_GROUP: Record<string, ModifierCatalogGroup> = {
  healing_temp_hp: "Active abilities",
  bonus_damage: "Attack & damage",
  extra_attacks: "Active abilities",
  defensive: "Damage mitigation",
  checks_rolls: "Ability scores & checks",
  buff_debuff: "Active abilities",
  movement: "Movement & senses",
  resource_casting: "Resources & uses",
}

function catalogId(prefix: string, key: string): string {
  return `cat_${prefix}_${key}`
}

export function createCatalogEntryId(): string {
  return `cat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function buildDefaultModifierCatalog(): ModifierCatalogEntry[] {
  const entries: ModifierCatalogEntry[] = []

  for (const option of CHARACTERISTIC_MODIFIER_TYPE_OPTIONS) {
    const mod = createCharacteristicModifier(option.value)
    entries.push({
      id: catalogId("char", option.value),
      name: option.label,
      group: CHARACTERISTIC_GROUP[option.value],
      summary: `Passive: ${option.label}`,
      characteristics: [mod],
    })
  }

  for (const option of ACTION_EFFECT_OPTIONS) {
    const groupMeta = ACTION_EFFECT_GROUPS.find((g) => g.id === option.group)
    entries.push({
      id: catalogId("fx", option.value),
      name: option.label,
      group: ACTION_EFFECT_GROUP[option.group] ?? "Active abilities",
      summary: groupMeta ? `${groupMeta.label} — ${option.label}` : option.label,
      activation: {
        action: true,
        effects: [{ id: `fx_${option.value}`, kind: option.value }],
      },
    })
  }

  return entries
}

export function normalizeModifierCatalog(raw: unknown): ModifierCatalogEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((entry): entry is ModifierCatalogEntry => {
      return Boolean(entry && typeof entry === "object" && typeof (entry as ModifierCatalogEntry).id === "string")
    })
    .map((entry) => ({
      ...entry,
      characteristics: Array.isArray(entry.characteristics) ? entry.characteristics : [],
      activation: entry.activation ?? null,
    }))
}

export function mergeDefaultCatalogEntries(existing: ModifierCatalogEntry[]): ModifierCatalogEntry[] {
  const defaults = buildDefaultModifierCatalog()
  const byId = new Map(existing.map((entry) => [entry.id, entry]))
  for (const entry of defaults) {
    if (!byId.has(entry.id)) byId.set(entry.id, entry)
  }
  return [...byId.values()].sort((a, b) => {
    const groupCmp = String(a.group).localeCompare(String(b.group))
    if (groupCmp !== 0) return groupCmp
    return a.name.localeCompare(b.name)
  })
}

export function catalogEntryById(
  catalog: ModifierCatalogEntry[],
  id: string,
): ModifierCatalogEntry | undefined {
  return catalog.find((entry) => entry.id === id)
}

export function resolveModifierRefIds(
  refIds: string[] | null | undefined,
  catalog: ModifierCatalogEntry[],
): {
  characteristics: CharacteristicModifier[]
  activations: FeatureActivation[]
} {
  const characteristics: CharacteristicModifier[] = []
  const activations: FeatureActivation[] = []
  if (!refIds?.length) return { characteristics, activations }

  for (const refId of refIds) {
    const entry = catalogEntryById(catalog, refId)
    if (!entry) continue
    if (entry.characteristics?.length) {
      characteristics.push(...entry.characteristics)
    }
    if (entry.activation) {
      activations.push(entry.activation)
    }
  }

  return { characteristics, activations }
}

export function summarizeModifierRefs(
  refIds: string[] | null | undefined,
  catalog: ModifierCatalogEntry[],
): string {
  if (!refIds?.length) return ""
  return refIds
    .map((id) => catalogEntryById(catalog, id)?.name ?? id)
    .join(", ")
}

export function isCommonModifiersCatalogAbility(row: { id?: string; is_system?: boolean | null }): boolean {
  return row.id === COMMON_MODIFIERS_CATALOG_ID || row.is_system === true
}

export function buildCommonModifiersCatalogRow(): Record<string, unknown> {
  const now = new Date().toISOString()
  return {
    id: COMMON_MODIFIERS_CATALOG_ID,
    name: COMMON_MODIFIERS_CATALOG_NAME,
    description: `<p>${MODIFIER_CATALOG_INFO}</p>`,
    characteristics: [],
    modifier_catalog: buildDefaultModifierCatalog(),
    prerequisites: null,
    attached_to_type: null,
    attached_to_id: null,
    uses: null,
    show_in_builder: false,
    is_system: true,
    icon: "sparkles",
    source: "System",
    creator_url: null,
    enabled: true,
    created_at: now,
    updated_at: now,
  }
}
