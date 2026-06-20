import type { Feature, FeatureActivation, FeatureEffect } from "@/lib/types"
import { migrateFeatureFeatChoiceToModifierRefs } from "@/lib/compendium/grant-feat-catalog"

function newEffectId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `fx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function normalizeFeatureEffects(activation: FeatureActivation | null | undefined): FeatureEffect[] {
  if (!activation) return []
  if (Array.isArray(activation.effects) && activation.effects.length > 0) {
    return activation.effects.map((effect) => migrateEffectKind({
      ...effect,
      id: effect.id || newEffectId(),
    }))
  }
  if (activation.effect) {
    return [migrateEffectKind({ id: newEffectId(), kind: activation.effect })]
  }
  return []
}

function migrateEffectKind(effect: FeatureEffect): FeatureEffect {
  let next = { ...effect }
  if (effect.kind === "buff_ally_roll") {
    next = {
      ...next,
      kind: "modify_creature",
      rollTarget: "ally",
      creatureModifyMode: effect.creatureModifyMode ?? "roll",
    }
  } else if (effect.kind === "debuff_enemy_roll") {
    next = {
      ...next,
      kind: "modify_creature",
      rollTarget: "enemy",
      creatureModifyMode: effect.creatureModifyMode ?? "roll",
    }
  } else if (effect.kind === "modify_creature_roll") {
    next = {
      ...next,
      kind: "modify_creature",
      creatureModifyMode: effect.creatureModifyMode ?? "roll",
    }
  }
  if (next.attackStyle && !next.attackProfile) {
    next.attackProfile = next.attackStyle
  }
  return next
}

export function normalizeFeatureActivation(
  activation: FeatureActivation | null | undefined,
): FeatureActivation | null {
  if (!activation) return null
  const effects = normalizeFeatureEffects(activation)
  const { effect: _legacy, ...rest } = activation
  if (effects.length === 0) {
    return rest.action || rest.bonusAction || rest.reaction || rest.onInitiative ? rest : null
  }
  return { ...rest, effects }
}

/** Move legacy feature.resourceId into limitedUses when loading old data. */
export function normalizeFeatureRow(feature: Feature): Feature {
  let next = { ...feature }
  next.activation = normalizeFeatureActivation(feature.activation)

  if (feature.resourceId && feature.limitedUses && feature.limitedUses.type !== "class_resource") {
    next = {
      ...next,
      limitedUses: {
        ...feature.limitedUses,
        type: "class_resource",
        classResourceKey: feature.resourceId,
      },
      resourceId: null,
    }
  } else if (feature.resourceId && !feature.limitedUses) {
    next = {
      ...next,
      limitedUses: {
        type: "class_resource",
        classResourceKey: feature.resourceId,
        recharge: null,
      },
      resourceId: null,
    }
  }

  return migrateFeatureFeatChoiceToModifierRefs(next)
}
