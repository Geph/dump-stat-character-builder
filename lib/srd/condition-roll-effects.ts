import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import type { D20RollMode } from "@/lib/dice/d20-roll"
import type { RollContext } from "@/lib/character/roll-context"

export type ConditionRollEffect = {
  selfAttack?: D20RollMode
  selfAbilityCheck?: D20RollMode
  selfSave?: D20RollMode | Partial<Record<AbilityScoreKey, D20RollMode>>
  autoFailSaveAbilities?: AbilityScoreKey[]
  incomingAttack?: D20RollMode
  incomingMeleeAttack?: D20RollMode
  incomingRangedAttack?: D20RollMode
  incapacitated?: boolean
}

/** SRD 2024 condition → roll effect mapping (data table, not per-condition code). */
export const CONDITION_ROLL_EFFECTS: Record<string, ConditionRollEffect> = {
  Blinded: {
    selfAttack: "disadvantage",
    incomingAttack: "advantage",
  },
  Charmed: {},
  Frightened: {
    selfAbilityCheck: "disadvantage",
    selfAttack: "disadvantage",
  },
  Grappled: {},
  Incapacitated: {
    incapacitated: true,
  },
  Invisible: {
    selfAttack: "advantage",
    incomingAttack: "disadvantage",
  },
  Paralyzed: {
    autoFailSaveAbilities: ["strength", "dexterity"],
    incomingAttack: "advantage",
    incapacitated: true,
  },
  Petrified: {
    autoFailSaveAbilities: ["strength", "dexterity"],
    incomingAttack: "advantage",
    incapacitated: true,
  },
  Poisoned: {
    selfAttack: "disadvantage",
    selfAbilityCheck: "disadvantage",
  },
  Prone: {
    selfAttack: "disadvantage",
    incomingMeleeAttack: "advantage",
    incomingRangedAttack: "disadvantage",
  },
  Restrained: {
    selfAttack: "disadvantage",
    selfSave: { dexterity: "disadvantage" },
    incomingAttack: "advantage",
  },
  Stunned: {
    autoFailSaveAbilities: ["strength", "dexterity"],
    incomingAttack: "advantage",
    incapacitated: true,
  },
  Unconscious: {
    autoFailSaveAbilities: ["strength", "dexterity"],
    incomingAttack: "advantage",
    incapacitated: true,
  },
}

export function conditionEffectForName(name: string): ConditionRollEffect | null {
  return CONDITION_ROLL_EFFECTS[name] ?? null
}

export function isIncapacitatedByConditions(activeConditions: string[]): boolean {
  return activeConditions.some((name) => CONDITION_ROLL_EFFECTS[name]?.incapacitated)
}

export function collectConditionRollModes(
  context: RollContext,
  activeConditions: string[],
): D20RollMode[] {
  const modes: D20RollMode[] = []

  for (const name of activeConditions) {
    const effect = CONDITION_ROLL_EFFECTS[name]
    if (!effect) continue

    if (effect.autoFailSaveAbilities?.length && context.kind === "save" && context.ability) {
      if (effect.autoFailSaveAbilities.includes(context.ability)) {
        modes.push("auto_fail")
      }
    }

    if (context.kind === "attack" && effect.selfAttack) {
      modes.push(effect.selfAttack)
    }
    if (context.kind === "ability" && effect.selfAbilityCheck) {
      modes.push(effect.selfAbilityCheck)
    }
    if (context.kind === "skill" && effect.selfAbilityCheck) {
      modes.push(effect.selfAbilityCheck)
    }
    if (context.kind === "save" && context.ability) {
      const saveEffect = effect.selfSave
      if (saveEffect === "advantage" || saveEffect === "disadvantage") {
        modes.push(saveEffect)
      } else if (saveEffect && typeof saveEffect === "object") {
        const perAbility = saveEffect[context.ability]
        if (perAbility) modes.push(perAbility)
      }
    }
  }

  return modes
}
