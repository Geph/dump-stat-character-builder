import type { Feature, FeatureActivation, FeatureEffect } from "@/lib/types"

function newEffectId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `fx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function normalizeFeatureEffects(activation: FeatureActivation | null | undefined): FeatureEffect[] {
  if (!activation) return []
  if (Array.isArray(activation.effects) && activation.effects.length > 0) {
    return activation.effects.map((effect) => ({
      ...effect,
      id: effect.id || newEffectId(),
    }))
  }
  if (activation.effect) {
    return [{ id: newEffectId(), kind: activation.effect }]
  }
  return []
}

export function normalizeFeatureActivation(
  activation: FeatureActivation | null | undefined,
): FeatureActivation | null {
  if (!activation) return null
  const effects = normalizeFeatureEffects(activation)
  const { effect: _legacy, ...rest } = activation
  if (effects.length === 0) return rest.action || rest.bonusAction || rest.reaction ? rest : null
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

  return next
}
