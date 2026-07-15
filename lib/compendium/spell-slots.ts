import type { CharacterClassDetail } from "@/lib/character/character-classes"
import type { DndClass } from "@/lib/types"
import { usesPointPoolSpellcasting } from "@/lib/character/point-pool-spellcasting"
import { ABILITY_SCORE_KEYS, type AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"

/**
 * A class row's effective spellcasting config: the class's own spellcasting, or (when the class
 * itself doesn't cast) its subclass's granted spellcasting — e.g. Fighter has none, but Eldritch
 * Knight (subclass) grants third-caster spell slots.
 */
export function resolveEffectiveClassSpellcasting(
  entry: Pick<CharacterClassDetail, "class" | "subclass">,
): DndClass["spellcasting"] | null {
  return entry.class?.spellcasting ?? entry.subclass?.spellcasting ?? null
}

/** Map SRD spellcasting ability labels (including "Dexterity and Wisdom") to a score key. */
export function resolveSpellcastingAbilityKey(
  abilityLabel: string | null | undefined,
): AbilityScoreKey | null {
  if (!abilityLabel?.trim()) return null

  const normalized = abilityLabel.toLowerCase().trim()
  if ((ABILITY_SCORE_KEYS as readonly string[]).includes(normalized)) {
    return normalized as AbilityScoreKey
  }

  if (normalized.includes(" and ")) {
    const parts = normalized.split(" and ").map((p) => p.trim())
    const mental: AbilityScoreKey[] = ["charisma", "wisdom", "intelligence"]
    for (const key of mental) {
      if (parts.includes(key)) return key
    }
    const last = parts[parts.length - 1]
    if ((ABILITY_SCORE_KEYS as readonly string[]).includes(last)) {
      return last as AbilityScoreKey
    }
  }

  for (const key of ABILITY_SCORE_KEYS) {
    if (normalized.startsWith(key.slice(0, 3))) return key
  }

  return null
}

/** SRD full-caster spell slots by character level (index = level, slots[0] = 1st level slots). */
const FULL_CASTER_SLOTS: number[][] = [
  [],
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
]

/** Warlock pact magic: slot count and unified slot level by class level. */
const WARLOCK_PACT: Record<number, { count: number; slotLevel: number }> = {
  1: { count: 1, slotLevel: 1 },
  2: { count: 2, slotLevel: 1 },
  3: { count: 2, slotLevel: 2 },
  4: { count: 2, slotLevel: 2 },
  5: { count: 2, slotLevel: 3 },
  6: { count: 2, slotLevel: 3 },
  7: { count: 2, slotLevel: 4 },
  8: { count: 2, slotLevel: 4 },
  9: { count: 2, slotLevel: 5 },
  10: { count: 2, slotLevel: 5 },
  11: { count: 3, slotLevel: 5 },
  12: { count: 3, slotLevel: 5 },
  13: { count: 3, slotLevel: 5 },
  14: { count: 3, slotLevel: 5 },
  15: { count: 3, slotLevel: 5 },
  16: { count: 3, slotLevel: 5 },
  17: { count: 4, slotLevel: 5 },
  18: { count: 4, slotLevel: 5 },
  19: { count: 4, slotLevel: 5 },
  20: { count: 4, slotLevel: 5 },
}

export type CasterSlotType = "full" | "half" | "third" | "pact"

export type SpellSlotTable = {
  type: CasterSlotType
  /** Slots per spell level (1–9). Index 0 = 1st-level slots. */
  slotsByLevel: number[]
  /** Warlock pact: all slots share this level. */
  pactSlotLevel?: number
  className: string
  classLevel: number
}

export function spellSlotTableKey(table: SpellSlotTable): string {
  return `${table.className}-${table.type}-${table.classLevel}`
}

const HALF_CASTERS = new Set(["Paladin", "Ranger"])

export function getCasterSlotType(
  className: string,
  spellcasting: DndClass["spellcasting"] | null | undefined,
): CasterSlotType | null {
  if (!spellcasting) return null
  // An explicit caster_progression authored on the class always wins.
  const explicit = (spellcasting as { caster_progression?: CasterSlotType | null })
    .caster_progression
  if (explicit) return explicit
  if (spellcasting.type === "pact" || spellcasting.pact_magic || className === "Warlock") {
    return "pact"
  }
  if (HALF_CASTERS.has(className)) return "half"
  return "full"
}

function fullCasterSlotsAtLevel(level: number): number[] {
  const clamped = Math.max(1, Math.min(20, level))
  return [...FULL_CASTER_SLOTS[clamped]]
}

export function getSpellSlotTable(
  className: string,
  classLevel: number,
  spellcasting: DndClass["spellcasting"] | null | undefined,
): SpellSlotTable | null {
  if (usesPointPoolSpellcasting(spellcasting)) return null

  const type = getCasterSlotType(className, spellcasting)
  if (!type) return null

  const level = Math.max(1, Math.min(20, classLevel))

  const explicitProgression = spellcasting?.explicit_slot_progression
  if (explicitProgression?.length) {
    const sorted = [...explicitProgression].sort((a, b) => a.level - b.level)
    let row = sorted[0]
    for (const entry of sorted) {
      if (level >= entry.level) row = entry
    }
    const slotsByLevel = [...row.slots]
    while (slotsByLevel.length < 9) slotsByLevel.push(0)
    return {
      type: type ?? "half",
      slotsByLevel: slotsByLevel.slice(0, 9),
      className,
      classLevel: level,
    }
  }

  if (type === "pact") {
    const entry = WARLOCK_PACT[level] ?? WARLOCK_PACT[20]
    const slotsByLevel = Array(9).fill(0)
    slotsByLevel[entry.slotLevel - 1] = entry.count
    return {
      type: "pact",
      slotsByLevel,
      pactSlotLevel: entry.slotLevel,
      className,
      classLevel: level,
    }
  }

  if (type === "half") {
    if (level < 2) {
      return { type: "half", slotsByLevel: [], className, classLevel: level }
    }
    const effectiveLevel = Math.ceil(level / 2)
    return {
      type: "half",
      slotsByLevel: fullCasterSlotsAtLevel(effectiveLevel),
      className,
      classLevel: level,
    }
  }

  if (type === "third") {
    // 1/3 casters (Eldritch Knight, Arcane Trickster) gain slots starting at class level 3.
    if (level < 3) {
      return { type: "third", slotsByLevel: [], className, classLevel: level }
    }
    const effectiveLevel = Math.ceil(level / 3)
    return {
      type: "third",
      slotsByLevel: fullCasterSlotsAtLevel(effectiveLevel),
      className,
      classLevel: level,
    }
  }

  return {
    type: "full",
    slotsByLevel: fullCasterSlotsAtLevel(level),
    className,
    classLevel: level,
  }
}

/** Spell slot tables for each spellcasting class on a multiclass character. */
export function getMulticlassSpellSlotTables(
  entries: { className: string; classLevel: number; spellcasting: DndClass["spellcasting"] | null | undefined }[],
): SpellSlotTable[] {
  return entries
    .map((entry) => getSpellSlotTable(entry.className, entry.classLevel, entry.spellcasting))
    .filter((table): table is SpellSlotTable => table != null)
}

/** Representative SRD class name for a caster progression type. */
function casterTypeClassName(casterType: CasterSlotType): string {
  if (casterType === "pact") return "Warlock"
  if (casterType === "half") return "Paladin"
  if (casterType === "third") return "Arcane Trickster"
  return "Wizard"
}

/** Minimal spellcasting shape so getCasterSlotType resolves the right progression. */
function casterTypeSpellcasting(casterType: CasterSlotType): DndClass["spellcasting"] {
  return {
    type: casterType === "pact" ? "pact" : "spellcasting",
    caster_progression: casterType,
  } as DndClass["spellcasting"]
}

/** Spell slot table for a caster progression type at a character level (no class row needed). */
export function spellSlotTableForCasterType(
  casterType: CasterSlotType,
  classLevel: number,
): SpellSlotTable | null {
  return getSpellSlotTable(
    casterTypeClassName(casterType),
    classLevel,
    casterTypeSpellcasting(casterType),
  )
}

/** Total spell slots (summed across spell levels) for a caster type at a level. */
export function totalSpellSlotsForCasterType(
  casterType: CasterSlotType,
  classLevel: number,
): number {
  const table = spellSlotTableForCasterType(casterType, classLevel)
  return table?.slotsByLevel.reduce((sum, count) => sum + count, 0) ?? 0
}

/**
 * Build the class-resource uses config for spell slot pools. Spell slots are
 * represented by caster type (full / half / pact) and the per spell-level
 * breakdown is derived from the canonical SRD tables, rather than collapsed into
 * a single total per character level.
 */
export function spellSlotResourceUsesForCasterType(
  casterType: CasterSlotType,
): import("@/lib/types").UsesConfig {
  return {
    type: "spell_slots",
    casterType,
    recharges: casterType === "pact" ? [{ rest: "short_rest" }, { rest: "long_rest" }] : [{ rest: "long_rest" }],
  }
}

export function formatSpellSlotLevel(level: number): string {
  if (level === 1) return "1st"
  if (level === 2) return "2nd"
  if (level === 3) return "3rd"
  return `${level}th`
}

export function formatSpellListGroupLabel(level: number): string {
  if (level === 0) return "Cantrips"
  return `${formatSpellSlotLevel(level)} Level`
}

export function spellRequiresAttack(description: string | null | undefined): boolean {
  return /spell attack/i.test(description ?? "")
}

export function concentrationConditionName(spellName: string): string {
  return `Concentration: ${spellName}`
}

export function isConcentrationCondition(name: string): boolean {
  return name.startsWith("Concentration:")
}

export function getActiveConcentration(conditions: string[]): string | null {
  return conditions.find(isConcentrationCondition) ?? null
}

export function concentrationSpellName(condition: string): string {
  return condition.replace(/^Concentration:\s*/, "")
}

export function willReplaceConcentration(
  activeConcentration: string | null,
  nextSpellName: string,
): boolean {
  if (!activeConcentration) return false
  return activeConcentration !== concentrationConditionName(nextSpellName)
}
