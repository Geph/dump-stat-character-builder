import type { DndClass } from "@/lib/types"

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

export type CasterSlotType = "full" | "half" | "pact"

export type SpellSlotTable = {
  type: CasterSlotType
  /** Slots per spell level (1–9). Index 0 = 1st-level slots. */
  slotsByLevel: number[]
  /** Warlock pact: all slots share this level. */
  pactSlotLevel?: number
  className: string
  classLevel: number
}

const HALF_CASTERS = new Set(["Paladin", "Ranger"])

export function getCasterSlotType(
  className: string,
  spellcasting: DndClass["spellcasting"] | null | undefined,
): CasterSlotType | null {
  if (!spellcasting) return null
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
  const type = getCasterSlotType(className, spellcasting)
  if (!type) return null

  const level = Math.max(1, Math.min(20, classLevel))

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

  return {
    type: "full",
    slotsByLevel: fullCasterSlotsAtLevel(level),
    className,
    classLevel: level,
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
