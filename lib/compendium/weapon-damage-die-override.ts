import type { UnarmedStrikeDie } from "@/lib/compendium/characteristic-modifiers"

/** Replace die sides in expressions like "1d8" / "2d6+1" → same count, new sides. */
export function replaceDamageDiceSides(dice: string, newSides: number): string {
  if (!Number.isFinite(newSides) || newSides < 1) return dice
  return dice.replace(/(\d+)d(\d+)/gi, (_match, count) => `${count}d${newSides}`)
}

export function unarmedDieToSides(die: UnarmedStrikeDie | string): number | null {
  const match = String(die).trim().match(/^(?:\d+)?d(\d+)$/i)
  if (match) {
    const sides = parseInt(match[1], 10)
    return Number.isFinite(sides) ? sides : null
  }
  if (String(die).trim() === "1") return 1
  return null
}

export function sidesToUnarmedDie(sides: number): UnarmedStrikeDie | null {
  const map: Record<number, UnarmedStrikeDie> = {
    1: "1",
    4: "1d4",
    6: "1d6",
    8: "1d8",
    10: "1d10",
    12: "1d12",
  }
  return map[sides] ?? null
}
