import {
  ACTION_EFFECT_GROUPS,
  ACTION_EFFECT_OPTIONS,
  EXCLUDED_ACTION_CATALOG_KINDS,
  EXCLUDED_PASSIVE_CATALOG_TYPES,
} from "@/lib/compendium/class-feature-metadata"
import {
  CHARACTERISTIC_MODIFIER_TYPE_OPTIONS,
  createCharacteristicModifier,
  normalizeCharacteristics,
  type CharacteristicModifier,
  type CharacteristicModifierType,
} from "@/lib/compendium/characteristic-modifiers"
import type { FeatureActivation } from "@/lib/types"
import {
  GRANT_FEAT_CATALOG_ID,
  LEGACY_GRANT_FEAT_CATALOG_IDS,
} from "@/lib/compendium/grant-feat-catalog"
import {
  buildWeaponMasteryCatalogEntry,
  WEAPON_MASTERY_CATALOG_ID,
} from "@/lib/compendium/weapon-mastery-catalog"
import { buildCustomSkillCatalogEntry } from "@/lib/compendium/custom-skill-catalog"
import { getSystemCatalogDefaultIcon } from "@/lib/compendium/system-option-catalogs"

/** Fixed id for the system-owned common modifiers custom ability. */
export const COMMON_MODIFIERS_CATALOG_ID = "00000000-0000-4000-8000-000000000001"

/** Fixed UUIDs for system-owned modifier option catalogs (see system-option-catalogs.ts). */
export const SYSTEM_MODIFIER_CATALOG_IDS = [
  COMMON_MODIFIERS_CATALOG_ID,
  "00000000-0000-4000-8000-000000000002",
  "00000000-0000-4000-8000-000000000003",
  "00000000-0000-4000-8000-000000000004",
] as const

/** Catalog entry id for the shared Special Attack passive template. */
export const SPECIAL_ATTACK_CATALOG_ID = "cat_char_special_attack"

export { WEAPON_MASTERY_CATALOG_ID } from "@/lib/compendium/weapon-mastery-catalog"

export const COMMON_MODIFIERS_CATALOG_NAME = "Common Modifier Effects"

export const MODIFIER_CATALOG_INFO =
  "This system entry defines reusable mechanical effect templates shared across class features, subclasses, feats, species traits, and backgrounds. Set the possible choices for each effect here; compendium editors link these entries and configure specifics inline (e.g. damage types, check categories)."

export const MODIFIER_CATALOG_GROUPS = [
  "Ability scores & checks",
  "Skills & saving throws",
  "Proficiencies",
  "Armor & hit points",
  "Movement & senses",
  "Attack & damage",
  "Special attacks",
  "Damage mitigation",
  "Spells & casting",
  "Active abilities",
  "Resources & uses",
  "Feats & choices",
  "Equipment & items",
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
  skill_check_alternate_ability: "Skills & saving throws",
  saving_throw_alternate_ability: "Skills & saving throws",
  forced_save_ability_remap: "Skills & saving throws",
  custom_skill: "Skills & saving throws",
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
  weapon_reach_modifier: "Attack & damage",
  attack_roll_modifiers: "Attack & damage",
  damage_roll_modifiers: "Attack & damage",
  weapon_ability_override: "Attack & damage",
  unarmed_strike_damage: "Special attacks",
  special_attack: "Special attacks",
  damage_resistance: "Damage mitigation",
  damage_immunity: "Damage mitigation",
  condition_immunity: "Damage mitigation",
  damage_reduction: "Damage mitigation",
  spells: "Spells & casting",
  spells_known: "Spells & casting",
  spell_list_access: "Spells & casting",
  spellcasting_ability: "Spells & casting",
  uses: "Resources & uses",
  attunement_slots: "Resources & uses",
  aura: "Movement & senses",
  bonus_damage_riders: "Attack & damage",
  saving_throw_trigger: "Skills & saving throws",
  on_hit_trigger: "Active abilities",
  failed_roll_trigger: "Active abilities",
  d20_test_reaction: "Active abilities",
  damage_halving_reaction: "Damage mitigation",
  healing_dice_pool: "Resources & uses",
  on_creature_death_trigger: "Active abilities",
  turn_start_trigger: "Active abilities",
  telepathy: "Movement & senses",
  on_cast_spell_trigger: "Spells & casting",
  spell_healing_modifier: "Spells & casting",
  resource_ability_menu: "Resources & uses",
  extra_turn: "Active abilities",
  grant_feat: "Feats & choices",
  grant_creature: "Feats & choices",
  equipment_and_magic_items: "Equipment & items",
  catalog_option: "Feats & choices",
  craftable_items: "Equipment & items",
  held_items_cap: "Equipment & items",
  rest_replacement: "Resources & uses",
  creature_size: "Movement & senses",
  magical_sleep_immunity: "Damage mitigation",
  movement_effects: "Movement & senses",
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
    if (EXCLUDED_PASSIVE_CATALOG_TYPES.has(option.value)) continue
    const mod = createCharacteristicModifier(option.value)
    const entry: ModifierCatalogEntry = {
      id: catalogId("char", option.value),
      name:
        option.value === "grant_feat"
          ? "Gain a Feat"
          : option.value === "grant_creature"
            ? "Grant Creature / Companion"
          : option.value === "attack_roll_modifiers"
            ? "Attack Roll and Crit Modifiers"
            : option.value === "damage_roll_modifiers"
              ? "Weapon Damage Modifiers"
              : option.label,
      group: CHARACTERISTIC_GROUP[option.value],
      summary:
        option.value === "grant_feat"
          ? "Passive: choose a feat — set allowed categories below"
          : option.value === "grant_creature"
            ? "Passive: grant a creature/companion from the Creatures & Companions compendium (by name)"
          : option.value === "languages"
            ? "Passive: grant known languages and/or player picks from the Languages compendium (Standard or Rare pool)"
          : option.value === "ability_scores"
            ? "Passive: fixed ability bonuses or ASI-style player choice"
            : option.value === "special_attack"
              ? "Passive: configurable special attack (breath weapon, horns, etc.)"
              : option.value === "attack_roll_modifiers"
                ? "Passive: bonus to hit and expanded critical range (optional by level)"
                : option.value === "damage_roll_modifiers"
                  ? "Passive: weapon damage riders (extra dice, ability mod when missing)"
                  : `Passive: ${option.label}`,
      characteristics: [mod],
    }
    if (option.value === "special_attack") {
      entry.description =
        "<p>Template defaults for species traits and features that grant a special attack. Linked instances inherit these fields and override specifics inline.</p>"
      const sa = entry.characteristics![0] as import("@/lib/compendium/characteristic-modifiers").SpecialAttackCharacteristic
      sa.attackName = "Special Attack"
      sa.attackProfile = "force_save"
      sa.areaShape = "cone_or_line"
      sa.areaLengthFeet = 15
      sa.alternateAreaLengthFeet = 30
      sa.damageTypes = []
      sa.properties = []
    }
    entries.push(entry)
  }

  for (const option of ACTION_EFFECT_OPTIONS) {
    if (EXCLUDED_ACTION_CATALOG_KINDS.has(option.value)) continue
    const groupMeta = ACTION_EFFECT_GROUPS.find((g) => g.id === option.group)
    entries.push({
      id: catalogId("fx", option.value),
      name: option.label,
      group: ACTION_EFFECT_GROUP[option.group] ?? "Active abilities",
      summary: groupMeta ? `${groupMeta.label} — ${option.label}` : option.label,
      activation: {
        effects: [{ id: `fx_${option.value}`, kind: option.value }],
      },
    })
  }

  entries.push({
    id: catalogId("other", "gain_inspiration"),
    name: "Gain Inspiration",
    group: "Other",
    summary: "Passive: gain Heroic Inspiration",
    description:
      "<p>The character gains Heroic Inspiration. Configure when inspiration is granted in the linked feature or trait description (e.g. after a long rest, or when rolling a natural 1 on a d20).</p>",
  })

  entries.push(buildWeaponMasteryCatalogEntry())
  entries.push(buildCustomSkillCatalogEntry())

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
      name: typeof entry.name === "string" ? entry.name : "Untitled",
      group: typeof entry.group === "string" && entry.group.trim() ? entry.group : "Other",
      characteristics: normalizeCharacteristics(entry.characteristics, null),
      activation: entry.activation ?? null,
    }))
}

export function mergeDefaultCatalogEntries(existing: ModifierCatalogEntry[]): ModifierCatalogEntry[] {
  const defaults = buildDefaultModifierCatalog()
  const deprecatedGrantFeatIds = new Set(Object.values(LEGACY_GRANT_FEAT_CATALOG_IDS))
  const filteredExisting = existing.filter(
    (entry) => !(deprecatedGrantFeatIds.has(entry.id as (typeof LEGACY_GRANT_FEAT_CATALOG_IDS)[keyof typeof LEGACY_GRANT_FEAT_CATALOG_IDS]) && defaults.some((d) => d.id === GRANT_FEAT_CATALOG_ID)),
  )
  const byId = new Map(filteredExisting.map((entry) => [entry.id, entry]))
  for (const entry of defaults) {
    const existing = byId.get(entry.id)
    if (!existing) {
      byId.set(entry.id, entry)
    } else if (existing.group !== entry.group && entry.id.startsWith("cat_")) {
      byId.set(entry.id, {
        ...existing,
        group: entry.group,
        name: entry.name,
        summary: entry.summary ?? existing.summary,
      })
    }
  }
  return [...byId.values()].sort((a, b) => {
    const groupCmp = String(a.group).localeCompare(String(b.group))
    if (groupCmp !== 0) return groupCmp
    return a.name.localeCompare(b.name)
  })
}

export function catalogEditorSectionId(section: string): string {
  if (section === "Overview") return "catalog-overview"
  return `catalog-${section.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`
}

/** Scroll margin so sticky headers do not cover section titles. */
export const CATALOG_EDITOR_SECTION_CLASS = "scroll-mt-32"

/** Distinct styling for catalog template-choice previews (not live compendium editors). */
export const TEMPLATE_PREVIEW_SECTION_CLASS =
  "rounded-xl border-2 border-dashed border-secondary/50 bg-secondary/5 p-4 space-y-3"

export function groupModifierCatalogEntries(catalog: ModifierCatalogEntry[]): {
  group: string
  entries: ModifierCatalogEntry[]
}[] {
  const grouped: { group: string; entries: ModifierCatalogEntry[] }[] = MODIFIER_CATALOG_GROUPS.map(
    (group) => ({
      group,
      entries: catalog.filter((entry) => entry.group === group),
    }),
  ).filter((section) => section.entries.length > 0)

  const otherEntries = catalog.filter(
    (entry) => !MODIFIER_CATALOG_GROUPS.includes(entry.group as ModifierCatalogGroup),
  )

  if (otherEntries.length > 0) {
    grouped.push({ group: "Other", entries: otherEntries })
  }

  return grouped
}

export function catalogEditorNavSections(catalog: ModifierCatalogEntry[]): { id: string; label: string }[] {
  const sections = [{ id: catalogEditorSectionId("Overview"), label: "Overview" }]
  for (const { group } of groupModifierCatalogEntries(catalog)) {
    sections.push({ id: catalogEditorSectionId(group), label: group })
  }
  return sections
}

export function catalogEntryById(
  catalog: ModifierCatalogEntry[] | undefined | null,
  id: string,
): ModifierCatalogEntry | undefined {
  if (!catalog?.length) return undefined
  const aliases: Record<string, string> = {
    cat_fx_buff_ally_roll: "cat_fx_modify_creature",
    cat_fx_debuff_enemy_roll: "cat_fx_modify_creature",
    cat_fx_modify_creature_roll: "cat_fx_modify_creature",
    cat_fx_check_advantage: "cat_fx_check_roll_modifier",
    cat_fx_check_bonus: "cat_fx_check_roll_modifier",
    cat_fx_check_disadvantage: "cat_fx_check_roll_modifier",
  }
  const grantFeatAliases: Record<string, string> = {
    [LEGACY_GRANT_FEAT_CATALOG_IDS.general]: GRANT_FEAT_CATALOG_ID,
    [LEGACY_GRANT_FEAT_CATALOG_IDS.epicBoon]: GRANT_FEAT_CATALOG_ID,
    [LEGACY_GRANT_FEAT_CATALOG_IDS.fightingStyle]: GRANT_FEAT_CATALOG_ID,
  }
  const resolvedId = aliases[id] ?? grantFeatAliases[id] ?? id
  return catalog.find((entry) => entry.id === resolvedId)
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
  return (
    row.id != null &&
    SYSTEM_MODIFIER_CATALOG_IDS.includes(row.id as (typeof SYSTEM_MODIFIER_CATALOG_IDS)[number])
  )
}

/** Common Modifier Effects catalog — editor-only, never shown on character sheets. */
export function isCommonModifiersCatalogEntry(row: {
  id?: string | null
  name?: string | null
}): boolean {
  if (row.id === COMMON_MODIFIERS_CATALOG_ID) return true
  return row.name?.trim() === COMMON_MODIFIERS_CATALOG_NAME
}

export function buildCommonModifiersCatalogRow(): Record<string, unknown> {
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
    icon: getSystemCatalogDefaultIcon(COMMON_MODIFIERS_CATALOG_ID),
    source: "System",
    creator_url: null,
    enabled: true,
  }
}
