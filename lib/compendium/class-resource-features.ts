import { syncModifierRefs, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { Feature, FeatureActivation, FeatureEffect, UsesConfig } from "@/lib/types"

/** Catalog entry ids from buildDefaultModifierCatalog (cat_fx_*). */
export const CLASS_RESOURCE_FX_CATALOG = {
  healSelf: "cat_fx_heal_self",
  healFromPool: "cat_fx_heal_from_pool",
  damageReduction: "cat_fx_damage_reduction",
  bonusDamageByLevel: "cat_fx_bonus_damage_by_level",
  checkAdvantage: "cat_fx_check_advantage",
  buffAllyRoll: "cat_fx_buff_ally_roll",
  transform: "cat_fx_transform",
  extraAction: "cat_fx_extra_action",
  checkBonus: "cat_fx_check_bonus",
  forceSaveControl: "cat_fx_force_save_control",
  selfBuffCaster: "cat_fx_self_buff_caster",
  classResource: "cat_fx_class_resource",
} as const

function modInstance(
  instanceId: string,
  catalogRefId: string,
  activation?: FeatureActivation | null,
): LinkedModifierInstance {
  return {
    instanceId,
    catalogRefId,
    activation: activation ?? undefined,
  }
}

function fx(id: string, partial: Omit<FeatureEffect, "id">): FeatureEffect {
  return { id, ...partial }
}

function activation(
  timing: Pick<FeatureActivation, "action" | "bonusAction" | "reaction">,
  effects: FeatureEffect[],
): FeatureActivation {
  return { ...timing, effects }
}

type ResourceFeaturePreset = {
  featureName: string
  resourceKey: string
  activation?: FeatureActivation | null
  linkedModifiers: LinkedModifierInstance[]
}

const RAGE_MODIFIERS: LinkedModifierInstance[] = [
  modInstance(
    "modinst_rage_resist",
    CLASS_RESOURCE_FX_CATALOG.damageReduction,
    activation({ bonusAction: true }, [
      fx("fx_rage_resist", {
        kind: "damage_reduction",
        mitigation: "resistance",
        damageTypes: ["Bludgeoning", "Piercing", "Slashing"],
      }),
    ]),
  ),
  modInstance(
    "modinst_rage_damage",
    CLASS_RESOURCE_FX_CATALOG.bonusDamageByLevel,
    activation({ bonusAction: true }, [
      fx("fx_rage_damage", {
        kind: "bonus_damage_by_level",
        bonusByLevel: [
          { level: 1, bonus: "+2" },
          { level: 9, bonus: "+3" },
          { level: 16, bonus: "+4" },
        ],
      }),
    ]),
  ),
  modInstance(
    "modinst_rage_adv_attack",
    CLASS_RESOURCE_FX_CATALOG.checkAdvantage,
    activation({ bonusAction: true }, [
      fx("fx_rage_adv_attack", {
        kind: "check_advantage",
        checkCategory: "attack",
        checkAbility: "Strength",
        grantAdvantage: true,
      }),
    ]),
  ),
  modInstance(
    "modinst_rage_adv_save",
    CLASS_RESOURCE_FX_CATALOG.checkAdvantage,
    activation({ bonusAction: true }, [
      fx("fx_rage_adv_save", {
        kind: "check_advantage",
        checkCategory: "save",
        checkAbility: "Strength",
        grantAdvantage: true,
      }),
    ]),
  ),
]

/** SRD class features that spend a class resource pool, with common modifier presets. */
export const SRD_CLASS_RESOURCE_FEATURE_PRESETS: Record<string, ResourceFeaturePreset[]> = {
  Barbarian: [
    {
      featureName: "Rage",
      resourceKey: "rage",
      activation: { bonusAction: true },
      linkedModifiers: RAGE_MODIFIERS,
    },
  ],
  Bard: [
    {
      featureName: "Bardic Inspiration",
      resourceKey: "bardic_inspiration",
      activation: { bonusAction: true },
      linkedModifiers: [
        modInstance(
          "modinst_bardic_inspiration",
          CLASS_RESOURCE_FX_CATALOG.buffAllyRoll,
          activation({ bonusAction: true }, [
            fx("fx_bardic_inspiration", { kind: "buff_ally_roll" }),
          ]),
        ),
      ],
    },
  ],
  Cleric: [
    {
      featureName: "Channel Divinity",
      resourceKey: "channel_divinity",
      activation: { action: true },
      linkedModifiers: [
        modInstance(
          "modinst_cleric_channel",
          CLASS_RESOURCE_FX_CATALOG.forceSaveControl,
          activation({ action: true }, [
            fx("fx_cleric_channel", { kind: "force_save_control" }),
          ]),
        ),
      ],
    },
  ],
  Druid: [
    {
      featureName: "Wild Shape",
      resourceKey: "wild_shape",
      activation: { bonusAction: true },
      linkedModifiers: [
        modInstance(
          "modinst_wild_shape",
          CLASS_RESOURCE_FX_CATALOG.transform,
          activation({ bonusAction: true }, [fx("fx_wild_shape", { kind: "transform" })]),
        ),
      ],
    },
  ],
  Fighter: [
    {
      featureName: "Second Wind",
      resourceKey: "second_wind",
      activation: { bonusAction: true },
      linkedModifiers: [
        modInstance(
          "modinst_second_wind",
          CLASS_RESOURCE_FX_CATALOG.healSelf,
          activation({ bonusAction: true }, [
            fx("fx_second_wind", {
              kind: "heal_self",
              healMode: "dice",
              healDiceCount: 1,
              healDieType: "d10",
              healFlatBonus: 0,
            }),
          ]),
        ),
      ],
    },
    {
      featureName: "Action Surge",
      resourceKey: "action_surge",
      activation: { action: true },
      linkedModifiers: [
        modInstance(
          "modinst_action_surge",
          CLASS_RESOURCE_FX_CATALOG.extraAction,
          activation({ action: true }, [fx("fx_action_surge", { kind: "extra_action" })]),
        ),
      ],
    },
    {
      featureName: "Indomitable",
      resourceKey: "indomitable",
      linkedModifiers: [
        modInstance(
          "modinst_indomitable",
          CLASS_RESOURCE_FX_CATALOG.checkBonus,
          activation({}, [
            fx("fx_indomitable", {
              kind: "check_bonus",
              checkCategory: "save",
              bonusAmount: null,
            }),
          ]),
        ),
      ],
    },
  ],
  Monk: [
    {
      featureName: "Monk's Focus",
      resourceKey: "focus_points",
      linkedModifiers: [
        modInstance(
          "modinst_monks_focus",
          CLASS_RESOURCE_FX_CATALOG.classResource,
          activation({ bonusAction: true }, [
            fx("fx_monks_focus_spend", {
              kind: "class_resource",
              classResourceKey: "focus_points",
              classResourceChange: "reduce",
              classResourceAmount: 1,
            }),
          ]),
        ),
      ],
    },
  ],
  Paladin: [
    {
      featureName: "Lay On Hands",
      resourceKey: "lay_on_hands",
      activation: { action: true },
      linkedModifiers: [
        modInstance(
          "modinst_lay_on_hands",
          CLASS_RESOURCE_FX_CATALOG.healFromPool,
          activation({ action: true }, [
            fx("fx_lay_on_hands", {
              kind: "heal_from_pool",
              classResourceKey: "lay_on_hands",
              classResourceChange: "reduce",
              classResourceAmount: 1,
            }),
          ]),
        ),
      ],
    },
    {
      featureName: "Channel Divinity",
      resourceKey: "channel_divinity",
      activation: { action: true },
      linkedModifiers: [
        modInstance(
          "modinst_paladin_channel",
          CLASS_RESOURCE_FX_CATALOG.forceSaveControl,
          activation({ action: true }, [
            fx("fx_paladin_channel", { kind: "force_save_control" }),
          ]),
        ),
      ],
    },
  ],
  Sorcerer: [
    {
      featureName: "Innate Sorcery",
      resourceKey: "innate_sorcery",
      activation: { bonusAction: true },
      linkedModifiers: [
        modInstance(
          "modinst_innate_sorcery",
          CLASS_RESOURCE_FX_CATALOG.selfBuffCaster,
          activation({ bonusAction: true }, [
            fx("fx_innate_sorcery", { kind: "self_buff_caster" }),
          ]),
        ),
      ],
    },
    {
      featureName: "Metamagic",
      resourceKey: "sorcery_points",
      linkedModifiers: [
        modInstance(
          "modinst_metamagic",
          CLASS_RESOURCE_FX_CATALOG.classResource,
          activation({}, [
            fx("fx_metamagic_spend", {
              kind: "class_resource",
              classResourceKey: "sorcery_points",
              classResourceChange: "reduce",
              classResourceAmount: 1,
            }),
          ]),
        ),
      ],
    },
  ],
  Warlock: [
    {
      featureName: "Pact Magic",
      resourceKey: "pact_magic_slots",
      linkedModifiers: [
        modInstance(
          "modinst_pact_magic",
          CLASS_RESOURCE_FX_CATALOG.classResource,
          activation({}, [
            fx("fx_pact_magic", {
              kind: "class_resource",
              classResourceKey: "pact_magic_slots",
              classResourceChange: "reduce",
              classResourceAmount: 1,
            }),
          ]),
        ),
      ],
    },
  ],
  Wizard: [
    {
      featureName: "Arcane Recovery",
      resourceKey: "arcane_recovery",
      linkedModifiers: [
        modInstance(
          "modinst_arcane_recovery",
          CLASS_RESOURCE_FX_CATALOG.classResource,
          activation({}, [
            fx("fx_arcane_recovery", {
              kind: "class_resource",
              classResourceKey: "arcane_recovery",
              classResourceChange: "reduce",
              classResourceAmount: 1,
            }),
          ]),
        ),
      ],
    },
  ],
}

/** Subclass features that spend the parent class's Channel Divinity pool (etc.). */
export const SRD_SUBCLASS_RESOURCE_FEATURE_PRESETS: Array<{
  parentClass: string
  featureName: string
  resourceKey: string
  linkedModifiers?: LinkedModifierInstance[]
  activation?: FeatureActivation | null
}> = [
  {
    parentClass: "Cleric",
    featureName: "Preserve Life",
    resourceKey: "channel_divinity",
    activation: { action: true },
    linkedModifiers: [
      modInstance(
        "modinst_preserve_life",
        CLASS_RESOURCE_FX_CATALOG.healFromPool,
        activation({ action: true }, [
          fx("fx_preserve_life", {
            kind: "heal_from_pool",
            classResourceKey: "channel_divinity",
            classResourceChange: "reduce",
            classResourceAmount: 1,
          }),
        ]),
      ),
    ],
  },
  {
    parentClass: "Cleric",
    featureName: "Land's Aid",
    resourceKey: "channel_divinity",
    activation: { action: true },
    linkedModifiers: [
      modInstance(
        "modinst_lands_aid",
        CLASS_RESOURCE_FX_CATALOG.forceSaveControl,
        activation({ action: true }, [
          fx("fx_lands_aid", { kind: "force_save_control" }),
        ]),
      ),
    ],
  },
  {
    parentClass: "Paladin",
    featureName: "Sacred Weapon",
    resourceKey: "channel_divinity",
    activation: { action: true },
    linkedModifiers: [
      modInstance(
        "modinst_sacred_weapon",
        CLASS_RESOURCE_FX_CATALOG.selfBuffCaster,
        activation({ action: true }, [
          fx("fx_sacred_weapon", { kind: "self_buff_caster" }),
        ]),
      ),
    ],
  },
]

function classResourceUses(resourceKey: string): UsesConfig {
  return { type: "class_resource", classResourceKey: resourceKey }
}

function featureHasResourceBinding(feature: Feature): boolean {
  return (
    feature.limitedUses?.type === "class_resource" &&
    Boolean(feature.limitedUses.classResourceKey)
  )
}

function featureHasLinkedModifiers(feature: Feature): boolean {
  return Boolean(feature.linkedModifiers?.length || feature.modifierRefs?.length)
}

function applyResourcePreset(feature: Feature, preset: ResourceFeaturePreset): Feature {
  if (featureHasResourceBinding(feature) && featureHasLinkedModifiers(feature)) {
    return feature
  }

  return syncModifierRefs({
    ...feature,
    limitedUses: featureHasResourceBinding(feature)
      ? feature.limitedUses
      : classResourceUses(preset.resourceKey),
    activation: feature.activation ?? preset.activation ?? null,
    linkedModifiers: featureHasLinkedModifiers(feature)
      ? feature.linkedModifiers
      : preset.linkedModifiers,
  })
}

/** Attach class-resource uses and common modifier presets to matching SRD class features. */
export function enrichClassFeatureWithResource(className: string, feature: Feature): Feature {
  const presets = SRD_CLASS_RESOURCE_FEATURE_PRESETS[className]
  if (!presets?.length) return feature

  const preset = presets.find(
    (entry) => entry.featureName.toLowerCase() === (feature.name ?? "").toLowerCase(),
  )
  if (!preset) return feature

  return applyResourcePreset(feature, preset)
}

/** Attach parent-class resource bindings to matching SRD subclass features. */
export function enrichSubclassFeatureWithResource(
  parentClassName: string,
  feature: Feature,
): Feature {
  const preset = SRD_SUBCLASS_RESOURCE_FEATURE_PRESETS.find(
    (entry) =>
      entry.parentClass === parentClassName &&
      entry.featureName.toLowerCase() === (feature.name ?? "").toLowerCase(),
  )
  if (!preset) return feature

  return applyResourcePreset(feature, preset)
}

export function enrichClassFeaturesWithResources(
  className: string,
  features: unknown,
): Feature[] {
  if (!Array.isArray(features)) return []
  return features.map((raw) => enrichClassFeatureWithResource(className, raw as Feature))
}

export function enrichSubclassFeaturesWithResources(
  parentClassName: string,
  features: unknown,
): Feature[] {
  if (!Array.isArray(features)) return []
  return features.map((raw) =>
    enrichSubclassFeatureWithResource(parentClassName, raw as Feature),
  )
}
