import { collectActiveFeatureEffects } from "@/lib/character/collect-limited-feature-effects"
import type { LimitationEvaluationContext } from "@/lib/compendium/modifier-limitations"
import { CONDITION_ROLL_EFFECTS } from "@/lib/srd/condition-roll-effects"
import type { Feature } from "@/lib/types"

export type IncomingAttackNote = {
  label: string
  detail: string
}

export type IncomingAttackNotesInput = {
  activeConditions: string[]
  classFeatures?: Feature[]
  limitationContext?: LimitationEvaluationContext
}

/** Notes for attacks against this character (shown near AC — does not change this sheet's rolls). */
export function buildIncomingAttackNotes(input: IncomingAttackNotesInput): IncomingAttackNote[] {
  const { activeConditions, classFeatures = [], limitationContext = {} } = input
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

  for (const { featureName, effect } of collectActiveFeatureEffects(
    classFeatures,
    limitationContext,
    (entry) => !!entry.incomingAttackMode,
  )) {
    const scope =
      effect.checkConditionTypes?.length ? ` (${effect.checkConditionTypes.join(", ")})` : ""
    if (effect.incomingAttackMode === "advantage") {
      advantageSources.push(`${featureName}${scope}`)
    } else if (effect.incomingAttackMode === "disadvantage") {
      disadvantageSources.push(`${featureName}${scope}`)
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
      label: "Attacks against you",
      detail: `Disadvantage (${[...new Set(disadvantageSources)].join(", ")})`,
    })
  }
  return notes
}
