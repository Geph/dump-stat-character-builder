import { charInstance, modId } from "@/lib/compendium/modifier-instance-builders"
import { createModifierInstanceId } from "@/lib/compendium/linked-modifiers"
import { characteristicCatalogRefId } from "@/lib/compendium/modifier-catalog-refs"
import type { ImportContent } from "@/lib/import/content-schema"
import type { Feature, RechargeRule } from "@/lib/types"
import { INFLUENCE_POINTS_KEY, IN_COMBAT_TOGGLE } from "@/lib/character/influence-points"

const DEFERRED_MECHANICS_NOTE =
  "Mechanic not fully modeled on sheet — see feature description (Rampage Die, Dark Lurker check reduction)."

function enrichFeature(feature: Feature, patch: Partial<Feature>): Feature {
  return { ...feature, ...patch }
}

function realTimeCooldown(minutes: number, scope?: "per_target"): RechargeRule {
  return {
    kind: "real_time",
    mode: "cooldown",
    minutes,
    scope: scope ?? "global",
    period: "rolling",
  }
}

function realTimeDecay(minutes: number): RechargeRule {
  return { kind: "real_time", mode: "decay", minutes }
}

function calendarDayCooldown(): RechargeRule {
  return {
    kind: "real_time",
    mode: "cooldown",
    minutes: 0,
    period: "calendar_day",
  }
}

function climacticMomentModifier() {
  return charInstance(createModifierInstanceId(), characteristicCatalogRefId("turn_start_trigger"), [
    {
      id: modId("climactic_moment_influence"),
      type: "turn_start_trigger",
      label: "Gain 1 Influence point",
      accrueResourceKey: INFLUENCE_POINTS_KEY,
      accrueResourceAmount: 1,
      accrueResourceMaxAbility: "intelligence",
      accrueDecayMinutes: 1,
      requiresSheetToggle: IN_COMBAT_TOGGLE,
    },
  ])
}

type ImportSubclassFeature = NonNullable<
  NonNullable<ImportContent["subclasses"]>[number]["features"]
>[number]

function patchImportFeature(
  feature: ImportSubclassFeature,
  patch: Partial<Feature>,
): ImportSubclassFeature {
  return enrichFeature(feature as unknown as Feature, patch) as unknown as ImportSubclassFeature
}

function enrichSubclassFeatures(
  subclass: NonNullable<ImportContent["subclasses"]>[number],
): NonNullable<ImportContent["subclasses"]>[number] {
  const features = (subclass.features ?? []).map((feature) => {
    const name = feature.name.trim()

    if (name === "Climactic Moment") {
      return patchImportFeature(feature, {
        limitedUses: {
          type: "special",
          specialDescription: "Influence points (INT mod cap, 1 min decay)",
          recharges: [realTimeDecay(1)],
        },
        linkedModifiers: [
          ...((feature as unknown as Feature).linkedModifiers ?? []),
          climacticMomentModifier(),
        ],
      })
    }

    if (name === "Shattered Husks") {
      return patchImportFeature(feature, {
        limitedUses: {
          type: "fixed",
          fixedAmount: 1,
          recharges: [realTimeCooldown(60, "per_target")],
        },
      })
    }

    if (name === "Planeswalker") {
      return patchImportFeature(feature, {
        limitedUses: {
          type: "fixed",
          fixedAmount: 1,
          recharges: [calendarDayCooldown()],
        },
      })
    }

    if (name === "Balance of Power") {
      return patchImportFeature(feature, {
        limitedUses: {
          type: "special",
          specialDescription: "Banked healing as bonus damage (1 min expiry)",
          recharges: [realTimeDecay(1)],
        },
      })
    }

    if (name === "Practiced Prescience") {
      return patchImportFeature(feature, {
        description: `${feature.description ?? ""}\n\nRemoves concentration requirement from Precognition's Prescience (display only if concentration not modeled on discipline passive).`.trim(),
      })
    }

    if (/rampage die/i.test(name)) {
      return patchImportFeature(feature, {
        description: `${feature.description ?? ""}\n\n${DEFERRED_MECHANICS_NOTE}`.trim(),
      })
    }

    if (name === "Dark Lurker") {
      return patchImportFeature(feature, {
        description: `${feature.description ?? ""}\n\n${DEFERRED_MECHANICS_NOTE}`.trim(),
      })
    }

    if (name === "Curious Mind") {
      const choices = feature.choices ?? {
        category: "Skills",
        count: 2,
        options: [],
        swappableOnRest: true,
        swapRestType: "long",
      }
      return patchImportFeature(feature, {
        isChoice: true,
        choices: {
          ...choices,
          swappableOnRest: true,
          swapRestType: "long",
        },
        description: `${feature.description ?? ""}\n\nHalf proficiency bonus (rounded down) on chosen skills until next long rest.`.trim(),
      })
    }

    return feature
  })

  return { ...subclass, features }
}

/** Wire Psionic Archetype mechanics that need structured recharge/toggle data. */
export function enrichPsionArchetypeFeatures(content: ImportContent): ImportContent {
  if (!content.subclasses?.length) return content

  const subclasses = content.subclasses.map((subclass) => {
    if (subclass.class_name && !/psion/i.test(subclass.class_name)) return subclass
    return enrichSubclassFeatures(subclass)
  })

  return { ...content, subclasses }
}
