import { CONDITION_ROLL_EFFECTS } from "@/lib/srd/condition-roll-effects"

export type IncomingAttackNote = {
  label: string
  detail: string
}

/** Notes for attacks against this character (shown near AC — does not change this sheet's rolls). */
export function buildIncomingAttackNotes(activeConditions: string[]): IncomingAttackNote[] {
  const advantageSources: string[] = []
  const disadvantageSources: string[] = []

  for (const name of activeConditions) {
    const effect = CONDITION_ROLL_EFFECTS[name]
    if (!effect) continue
    if (effect.incomingAttack === "advantage") advantageSources.push(name)
    if (effect.incomingAttack === "disadvantage") disadvantageSources.push(name)
    if (effect.incomingMeleeAttack === "advantage") {
      advantageSources.push(`${name} (melee)`)
    }
    if (effect.incomingRangedAttack === "disadvantage") {
      disadvantageSources.push(`${name} (ranged)`)
    }
  }

  const notes: IncomingAttackNote[] = []
  if (advantageSources.length) {
    notes.push({
      label: "Attacks against you",
      detail: `Advantage (${[...new Set(advantageSources)].join(", ")})`,
    })
  }
  if (disadvantageSources.length) {
    notes.push({
      label: "Ranged attacks against you",
      detail: `Disadvantage (${[...new Set(disadvantageSources)].join(", ")})`,
    })
  }
  return notes
}
