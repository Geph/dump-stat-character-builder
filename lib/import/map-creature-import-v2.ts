import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import {
  type CompanionAbilityRow,
  type CompanionNamedBlock,
  type CompanionScaledValue,
  type CompanionStatBlockTemplate,
} from "@/lib/character/companion-stat-block"
import { parseCreatureScaledStat } from "@/lib/character/parse-creature-stat-block"
import type {
  CreatureAbilityEntry,
  CreatureImportV2,
  CreatureImportLegacy,
  CreatureImportRow,
} from "@/lib/import/creature-import-v2-schema"
import { isCreatureImportV2 } from "@/lib/import/creature-import-v2-schema"
import { parseCreatureImportV2 } from "@/lib/import/load-creature-import-v2"
import { parseCreatureStatBlock } from "@/lib/character/parse-creature-stat-block"

const ABILITY_KEY_MAP = {
  str: "strength",
  dex: "dexterity",
  con: "constitution",
  int: "intelligence",
  wis: "wisdom",
  cha: "charisma",
} as const satisfies Record<string, AbilityScoreKey>

/**
 * Parse a signed modifier / formula into a CompanionScaledValue.
 * Examples: "+2", "-4", "+2 plus PB", "+3 plus PB".
 */
export function parseSignedScaledStat(raw: string): CompanionScaledValue {
  const label = raw.replace(/\s+/g, " ").trim()
  const plusPb = label.match(/^([+-]?\d+)\s*(?:\+|plus)\s*PB\b/i)
  if (plusPb) {
    return {
      parts: [
        { type: "fixed", value: parseInt(plusPb[1], 10) },
        { type: "scale", ref: { kind: "proficiency_bonus" } },
      ],
      label,
    }
  }
  const plain = label.match(/^([+-]?\d+)\s*$/)
  if (plain) {
    return { parts: [{ type: "fixed", value: parseInt(plain[1], 10) }], label }
  }
  // Fallback: try leading number, keep label for display.
  const leading = label.match(/^([+-]?\d+)/)
  if (leading) {
    return { parts: [{ type: "fixed", value: parseInt(leading[1], 10) }], label }
  }
  return { parts: [{ type: "fixed", value: 0 }], label }
}

function formatSpeed(speed: CreatureImportV2["speed"]): string {
  const parts: string[] = []
  if (speed.walk != null) parts.push(`${speed.walk} ft.`)
  if (speed.fly != null) parts.push(`fly ${speed.fly} ft.`)
  if (speed.swim != null) parts.push(`swim ${speed.swim} ft.`)
  if (speed.climb != null) parts.push(`climb ${speed.climb} ft.`)
  if (speed.burrow != null) parts.push(`burrow ${speed.burrow} ft.`)
  let text = parts.join(", ") || "—"
  if (speed.notes?.trim()) text += ` ${speed.notes.trim()}`
  return text
}

function formatSenses(senses: CreatureImportV2["senses"]): string | null {
  const parts: string[] = []
  if (senses.darkvision != null) parts.push(`Darkvision ${senses.darkvision} ft.`)
  if (senses.blindsight != null) parts.push(`Blindsight ${senses.blindsight} ft.`)
  if (senses.tremorsense != null) parts.push(`Tremorsense ${senses.tremorsense} ft.`)
  if (senses.truesight != null) parts.push(`Truesight ${senses.truesight} ft.`)
  if (senses.passive_perception != null) {
    parts.push(`Passive Perception ${senses.passive_perception}`)
  }
  return parts.length ? parts.join("; ") : null
}

function mapAbilityEntry(entry: CreatureAbilityEntry): CompanionNamedBlock {
  return {
    name: entry.name,
    description: entry.text,
    unlockLevel: entry.unlock_level_number,
    unlockLevelLabel: entry.unlock_level_label,
    tag: entry.tag,
  }
}

function mapAbilityEntries(
  entries: CreatureAbilityEntry[] | null | undefined,
): CompanionNamedBlock[] {
  return (entries ?? []).map(mapAbilityEntry)
}

function mapAbilityScores(
  scores: CreatureImportV2["ability_scores"],
): Partial<Record<AbilityScoreKey, CompanionAbilityRow>> {
  const result: Partial<Record<AbilityScoreKey, CompanionAbilityRow>> = {}
  for (const [short, key] of Object.entries(ABILITY_KEY_MAP) as [
    keyof typeof ABILITY_KEY_MAP,
    AbilityScoreKey,
  ][]) {
    const row = scores[short]
    const modFormula = parseSignedScaledStat(row.mod)
    const saveFormula = parseSignedScaledStat(row.save)
    const modifier =
      modFormula.parts[0]?.type === "fixed" ? modFormula.parts[0].value : 0
    const saveFixed =
      saveFormula.parts[0]?.type === "fixed" ? saveFormula.parts[0].value : modifier
    const hasScale = saveFormula.parts.some((p) => p.type === "scale")
    result[key] = {
      score: row.score,
      modifier,
      save: saveFixed,
      saveFormula: hasScale ? saveFormula : null,
      modLabel: row.mod,
      saveLabel: row.save,
    }
  }
  return result
}

function splitList(value: string | string[] | null | undefined): string[] | undefined {
  // LLM extracts sometimes emit string[]; coerce so immunities are not silently dropped.
  if (Array.isArray(value)) {
    const parts = value.map((s) => String(s).trim()).filter(Boolean)
    return parts.length ? parts : undefined
  }
  if (!value?.trim()) return undefined
  return value
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Map a schema v2 creature record onto the CompanionStatBlockTemplate used by the
 * sheet Companions tab. Formula fields (AC/HP/saves) stay as CompanionScaledValue
 * and resolve against the owner at read time — never baked in at import.
 */
export function mapCreatureImportV2ToTemplate(
  creature: CreatureImportV2,
): CompanionStatBlockTemplate {
  const initiative =
    creature.initiative_modifier != null
      ? creature.initiative_passive != null
        ? `${creature.initiative_modifier} (${creature.initiative_passive})`
        : creature.initiative_modifier
      : null

  return {
    name: creature.name,
    sizeTypeAlignment: `${creature.size} ${creature.creature_type}, ${creature.alignment}`,
    ac: parseCreatureScaledStat(creature.ac),
    acNote: creature.ac_note,
    hp: parseCreatureScaledStat(creature.hp),
    hitDiceNote: creature.hit_dice,
    initiative,
    speed: formatSpeed(creature.speed),
    abilityScores: mapAbilityScores(creature.ability_scores),
    resistances: splitList(creature.resistances),
    vulnerabilities: splitList(creature.vulnerabilities),
    damageImmunities: splitList(creature.damage_immunities),
    conditionImmunities: splitList(creature.condition_immunities),
    senses: formatSenses(creature.senses),
    languages: creature.languages,
    skills: creature.skills,
    proficiencies: creature.proficiencies,
    gear: creature.gear,
    cr: creature.category === "companion" ? null : creature.cr,
    category: creature.category,
    scaling: creature.scaling,
    xp: creature.xp,
    proficiencyBonusLabel: creature.proficiency_bonus,
    traits: mapAbilityEntries(creature.traits),
    actions: mapAbilityEntries(creature.actions),
    bonusActions: creature.bonus_actions?.length
      ? mapAbilityEntries(creature.bonus_actions)
      : undefined,
    reactions: creature.reactions?.length ? mapAbilityEntries(creature.reactions) : undefined,
    legendaryActions: creature.legendary_actions?.length
      ? mapAbilityEntries(creature.legendary_actions)
      : undefined,
  }
}

export type CreaturePersistRow = {
  name: string
  description: string | null
  creature_type: string | null
  size: string | null
  alignment: string | null
  cr: string | null
  category: "creature" | "companion"
  xp: number | null
  scaling: { scales_with: string; notes: string } | null
  import_payload: CreatureImportV2 | null
  stat_block: CompanionStatBlockTemplate
  prerequisite_rules: CreatureImportV2["prerequisite_rules"] | null
  source: string
}

function legacyToPersistRow(creature: CreatureImportLegacy, source: string): CreaturePersistRow {
  const prose = (typeof creature.description === "string" && creature.description.trim()) || ""
  const parsed = prose ? parseCreatureStatBlock(prose, creature.name) : null
  const structured =
    creature.stat_block &&
    typeof creature.stat_block === "object" &&
    "ac" in creature.stat_block &&
    "hp" in creature.stat_block
      ? (creature.stat_block as CompanionStatBlockTemplate)
      : null

  const template: CompanionStatBlockTemplate =
    structured ??
    parsed?.template ?? {
      name: creature.name,
      ac: { parts: [{ type: "fixed", value: 10 }] },
      hp: { parts: [{ type: "fixed", value: 1 }] },
      traits: [],
      actions: [],
      category: "creature",
    }

  const category =
    creature.category === "companion" || template.category === "companion"
      ? "companion"
      : "creature"

  return {
    name: creature.name,
    description: prose || null,
    creature_type: creature.creature_type ?? parsed?.creatureType ?? null,
    size: creature.size ?? parsed?.size ?? null,
    alignment: creature.alignment ?? parsed?.alignment ?? null,
    cr: category === "companion" ? null : (creature.cr ?? parsed?.cr ?? null),
    category,
    xp: null,
    scaling: creature.scaling ?? template.scaling ?? null,
    import_payload: null,
    stat_block: { ...template, name: creature.name, category: template.category ?? category },
    prerequisite_rules: creature.prerequisite_rules ?? null,
    source: creature.source?.trim() || source,
  }
}

function v2ToPersistRow(creature: CreatureImportV2, source: string): CreaturePersistRow {
  const template = mapCreatureImportV2ToTemplate(creature)
  return {
    name: creature.name,
    description: creature.description || null,
    creature_type: creature.creature_type,
    size: creature.size,
    alignment: creature.alignment,
    cr: creature.category === "companion" ? null : creature.cr,
    category: creature.category,
    xp: creature.xp,
    scaling: creature.scaling,
    import_payload: creature,
    stat_block: template,
    prerequisite_rules: creature.prerequisite_rules ?? null,
    source: creature.source?.trim() || source,
  }
}

/**
 * Map import creatures[] rows (v2 structured or legacy prose) onto the creatures
 * table shape. Companion formulas are preserved as scaled parts — not resolved here.
 */
export function buildCreaturePersistRows(
  creatures: CreatureImportRow[],
  source: string,
): CreaturePersistRow[] {
  return creatures.map((creature) =>
    isCreatureImportV2(creature)
      ? v2ToPersistRow(parseCreatureImportV2(creature), source)
      : legacyToPersistRow(creature, source),
  )
}
