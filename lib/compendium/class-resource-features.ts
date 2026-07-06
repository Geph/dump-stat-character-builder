import { syncModifierRefs, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import { requiresActiveToggleLimitation } from "@/lib/compendium/modifier-limitations"
import { defaultRollBonusConfig } from "@/lib/compendium/roll-bonus-config"
import type { Feature, FeatureActivation, FeatureEffect, UsesConfig } from "@/lib/types"

/** Catalog entry ids from buildDefaultModifierCatalog (cat_fx_*). */
export const CLASS_RESOURCE_FX_CATALOG = {
  healSelf: "cat_fx_heal_self",
  healFromPool: "cat_fx_heal_from_pool",
  damageReduction: "cat_fx_damage_reduction",
  bonusDamageByLevel: "cat_fx_bonus_damage_by_level",
  checkAdvantage: "cat_fx_check_roll_modifier",
  buffAllyRoll: "cat_fx_modify_creature",
  debuffEnemyRoll: "cat_fx_modify_creature",
  extraAttack: "cat_fx_extra_attack",
  transform: "cat_fx_transform",
  extraAction: "cat_fx_extra_action",
  checkBonus: "cat_fx_check_roll_modifier",
  forceSaveControl: "cat_fx_force_save_control",
  selfBuffCaster: "cat_fx_self_buff_caster",
  classResource: "cat_fx_class_resource",
  reactionAttack: "cat_fx_reaction_attack",
  imposeDisadvantage: "cat_fx_impose_disadvantage",
} as const

function modInstance(
  instanceId: string,
  catalogRefId: string,
  effects: FeatureEffect[],
): LinkedModifierInstance {
  return {
    instanceId,
    catalogRefId,
    activation: { effects },
  }
}

function fx(id: string, partial: Omit<FeatureEffect, "id">): FeatureEffect {
  return { id, ...partial }
}

type ResourceFeaturePreset = {
  featureName: string
  resourceKey?: string
  activation?: FeatureActivation | null
  linkedModifiers: LinkedModifierInstance[]
}

function extraAttackPreset(featureName: string, count: number): ResourceFeaturePreset {
  return {
    featureName,
    activation: { action: true },
    linkedModifiers: [
      modInstance(`modinst_${featureName.toLowerCase().replace(/\s+/g, "_")}`, CLASS_RESOURCE_FX_CATALOG.extraAttack, [
        fx(`fx_${featureName.toLowerCase().replace(/\s+/g, "_")}`, {
          kind: "extra_attack",
          extraAttackCount: count,
        }),
      ]),
    ],
  }
}

const RAGE_WHILE_ACTIVE = [requiresActiveToggleLimitation("while_raging")]

const INNATE_SORCERY_WHILE_ACTIVE = [requiresActiveToggleLimitation("while_innate_sorcery_active")]

const INNATE_SORCERY_MODIFIERS: LinkedModifierInstance[] = [
  modInstance("modinst_innate_sorcery_spell_attack", CLASS_RESOURCE_FX_CATALOG.checkAdvantage, [
    fx("fx_innate_sorcery_spell_attack", {
      kind: "check_roll_modifier",
      checkRollMode: "advantage",
      checkCategory: "spell_attack",
      limitations: INNATE_SORCERY_WHILE_ACTIVE,
    }),
  ]),
  modInstance("modinst_innate_sorcery_spell_save_dc", CLASS_RESOURCE_FX_CATALOG.checkBonus, [
    fx("fx_innate_sorcery_spell_save_dc", {
      kind: "check_roll_modifier",
      checkRollMode: "bonus",
      checkCategory: "spell_save_dc",
      bonusConfig: { mode: "fixed", fixed: 1 },
      limitations: INNATE_SORCERY_WHILE_ACTIVE,
    }),
  ]),
]

const RAGE_MODIFIERS: LinkedModifierInstance[] = [
  modInstance("modinst_rage_resist", CLASS_RESOURCE_FX_CATALOG.damageReduction, [
    fx("fx_rage_resist", {
      kind: "damage_reduction",
      mitigation: "resistance",
      damageTypes: ["Bludgeoning", "Piercing", "Slashing"],
      limitations: RAGE_WHILE_ACTIVE,
    }),
  ]),
  modInstance("modinst_rage_damage", CLASS_RESOURCE_FX_CATALOG.bonusDamageByLevel, [
    fx("fx_rage_damage", {
      kind: "bonus_damage_by_level",
      bonusByLevel: [
        { level: 1, mode: "fixed", bonus: "+2" },
        { level: 9, mode: "fixed", bonus: "+3" },
        { level: 16, mode: "fixed", bonus: "+4" },
      ],
      limitations: RAGE_WHILE_ACTIVE,
    }),
  ]),
  modInstance("modinst_rage_str_checks", CLASS_RESOURCE_FX_CATALOG.checkAdvantage, [
    fx("fx_rage_str_checks", {
      kind: "check_roll_modifier",
      checkRollMode: "advantage",
      checkCategory: "ability",
      checkAbility: "Strength",
      limitations: RAGE_WHILE_ACTIVE,
    }),
  ]),
  modInstance("modinst_rage_str_saves", CLASS_RESOURCE_FX_CATALOG.checkAdvantage, [
    fx("fx_rage_str_saves", {
      kind: "check_roll_modifier",
      checkRollMode: "advantage",
      checkCategory: "save",
      checkAbility: "Strength",
      limitations: RAGE_WHILE_ACTIVE,
    }),
  ]),
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
        modInstance("modinst_bardic_inspiration", CLASS_RESOURCE_FX_CATALOG.buffAllyRoll, [
          fx("fx_bardic_inspiration", {
            kind: "modify_creature",
            creatureModifyMode: "roll",
            rollTarget: "ally",
            buffMode: "bonus",
            buffBonus: {
              mode: "die",
              dieScaling: "class_resource",
              classResourceKey: "bardic_inspiration",
            },
          }),
        ]),
      ],
    },
    {
      featureName: "Cutting Words",
      resourceKey: "bardic_inspiration",
      activation: { reaction: true },
      linkedModifiers: [
        modInstance("modinst_cutting_words", CLASS_RESOURCE_FX_CATALOG.debuffEnemyRoll, [
          fx("fx_cutting_words", {
            kind: "modify_creature",
            creatureModifyMode: "roll",
            rollTarget: "enemy",
            buffMode: "bonus",
            buffBonus: {
              mode: "die",
              dieScaling: "class_resource",
              classResourceKey: "bardic_inspiration",
            },
          }),
        ]),
      ],
    },
  ],
  Cleric: [
    {
      featureName: "Channel Divinity",
      resourceKey: "channel_divinity",
      activation: { action: true },
      linkedModifiers: [
        modInstance("modinst_cleric_channel", CLASS_RESOURCE_FX_CATALOG.forceSaveControl, [
          fx("fx_cleric_channel", { kind: "force_save_control" }),
        ]),
      ],
    },
  ],
  Druid: [
    {
      featureName: "Wild Shape",
      resourceKey: "wild_shape",
      activation: { bonusAction: true },
      linkedModifiers: [
        modInstance("modinst_wild_shape", CLASS_RESOURCE_FX_CATALOG.transform, [
          fx("fx_wild_shape", { kind: "transform" }),
        ]),
      ],
    },
  ],
  Fighter: [
    {
      featureName: "Second Wind",
      resourceKey: "second_wind",
      activation: { bonusAction: true },
      linkedModifiers: [
        modInstance("modinst_second_wind", CLASS_RESOURCE_FX_CATALOG.healSelf, [
          fx("fx_second_wind", {
            kind: "heal_self",
            healMode: "dice",
            healDiceCount: 1,
            healDieType: "d10",
            healFlatBonus: 0,
          }),
        ]),
      ],
    },
    {
      featureName: "Action Surge",
      resourceKey: "action_surge",
      activation: { action: true },
      linkedModifiers: [
        modInstance("modinst_action_surge", CLASS_RESOURCE_FX_CATALOG.extraAction, [
          fx("fx_action_surge", { kind: "extra_action" }),
        ]),
      ],
    },
    {
      featureName: "Indomitable",
      resourceKey: "indomitable",
      activation: { reaction: true },
      linkedModifiers: [
        modInstance("modinst_indomitable", CLASS_RESOURCE_FX_CATALOG.checkBonus, [
          fx("fx_indomitable", {
            kind: "check_roll_modifier",
            checkCategory: "save",
            checkRollMode: "replace_failure",
            label: "When you fail a saving throw, you can choose to succeed instead",
          }),
        ]),
      ],
    },
    extraAttackPreset("Extra Attack", 2),
    extraAttackPreset("Two Extra Attacks", 3),
    extraAttackPreset("Three Extra Attacks", 4),
  ],
  Monk: [
    {
      featureName: "Monk's Focus",
      resourceKey: "focus_points",
      activation: { bonusAction: true },
      linkedModifiers: [
        modInstance("modinst_monks_focus", CLASS_RESOURCE_FX_CATALOG.classResource, [
          fx("fx_monks_focus_spend", {
            kind: "class_resource",
            classResourceKey: "focus_points",
            classResourceChange: "reduce",
            classResourceAmount: 1,
          }),
        ]),
      ],
    },
    {
      featureName: "Deflect Attacks",
      activation: { reaction: true },
      linkedModifiers: [
        modInstance("modinst_deflect_attacks", CLASS_RESOURCE_FX_CATALOG.damageReduction, [
          fx("fx_deflect_attacks", { kind: "damage_reduction", mitigation: "reduction" }),
        ]),
      ],
    },
    {
      featureName: "Slow Fall",
      activation: { reaction: true },
      linkedModifiers: [
        modInstance("modinst_slow_fall", CLASS_RESOURCE_FX_CATALOG.damageReduction, [
          fx("fx_slow_fall", { kind: "damage_reduction", mitigation: "reduction" }),
        ]),
      ],
    },
    extraAttackPreset("Extra Attack", 2),
  ],
  Paladin: [
    {
      featureName: "Lay On Hands",
      resourceKey: "lay_on_hands",
      activation: { action: true },
      linkedModifiers: [
        modInstance("modinst_lay_on_hands", CLASS_RESOURCE_FX_CATALOG.healFromPool, [
          fx("fx_lay_on_hands", {
            kind: "heal_from_pool",
            classResourceKey: "lay_on_hands",
            classResourceChange: "reduce",
            classResourceAmount: 1,
          }),
        ]),
      ],
    },
    {
      featureName: "Channel Divinity",
      resourceKey: "channel_divinity",
      activation: { action: true },
      linkedModifiers: [
        modInstance("modinst_paladin_channel", CLASS_RESOURCE_FX_CATALOG.forceSaveControl, [
          fx("fx_paladin_channel", { kind: "force_save_control" }),
        ]),
      ],
    },
    extraAttackPreset("Extra Attack", 2),
  ],
  Ranger: [extraAttackPreset("Extra Attack", 2)],
  Sorcerer: [
    {
      featureName: "Innate Sorcery",
      resourceKey: "innate_sorcery",
      activation: { bonusAction: true },
      linkedModifiers: [
        modInstance("modinst_innate_sorcery", CLASS_RESOURCE_FX_CATALOG.selfBuffCaster, [
          fx("fx_innate_sorcery", { kind: "self_buff_caster" }),
        ]),
        ...INNATE_SORCERY_MODIFIERS,
      ],
    },
    {
      featureName: "Metamagic",
      resourceKey: "sorcery_points",
      linkedModifiers: [
        modInstance("modinst_metamagic", CLASS_RESOURCE_FX_CATALOG.classResource, [
          fx("fx_metamagic_spend", {
            kind: "class_resource",
            classResourceKey: "sorcery_points",
            classResourceChange: "reduce",
            classResourceAmount: 1,
          }),
        ]),
      ],
    },
  ],
  Rogue: [
    {
      featureName: "Uncanny Dodge",
      activation: { reaction: true },
      linkedModifiers: [
        modInstance("modinst_uncanny_dodge", CLASS_RESOURCE_FX_CATALOG.imposeDisadvantage, [
          fx("fx_uncanny_dodge", { kind: "impose_disadvantage" }),
        ]),
      ],
    },
  ],
}

/** Subclass features that spend the parent class's resource pool (etc.). */
export const SRD_SUBCLASS_RESOURCE_FEATURE_PRESETS: Array<{
  parentClass: string
  featureName: string
  resourceKey?: string
  linkedModifiers?: LinkedModifierInstance[]
  activation?: FeatureActivation | null
}> = [
  {
    parentClass: "Cleric",
    featureName: "Preserve Life",
    resourceKey: "channel_divinity",
    activation: { action: true },
    linkedModifiers: [
      modInstance("modinst_preserve_life", CLASS_RESOURCE_FX_CATALOG.healFromPool, [
        fx("fx_preserve_life", {
          kind: "heal_from_pool",
          classResourceKey: "channel_divinity",
          classResourceChange: "reduce",
          classResourceAmount: 1,
        }),
      ]),
    ],
  },
  {
    parentClass: "Druid",
    featureName: "Land's Aid",
    resourceKey: "wild_shape",
    activation: { action: true },
    linkedModifiers: [
      modInstance("modinst_lands_aid", CLASS_RESOURCE_FX_CATALOG.forceSaveControl, [
        fx("fx_lands_aid", { kind: "force_save_control" }),
      ]),
    ],
  },
  {
    parentClass: "Druid",
    featureName: "Titan Form",
    resourceKey: "wild_shape",
    activation: { bonusAction: true },
    linkedModifiers: [
      modInstance("modinst_titan_form", CLASS_RESOURCE_FX_CATALOG.transform, [
        fx("fx_titan_form", { kind: "transform", label: "Titan Form" }),
      ]),
    ],
  },
  {
    parentClass: "Sorcerer",
    featureName: "Abyssal Rupture",
    resourceKey: "innate_sorcery",
    activation: { bonusAction: true },
    linkedModifiers: [
      modInstance("modinst_abyssal_rupture", CLASS_RESOURCE_FX_CATALOG.selfBuffCaster, [
        fx("fx_abyssal_rupture", {
          kind: "self_buff_caster",
          casterBuffLabel: "Abyssal Rupture (extends Innate Sorcery)",
        }),
      ]),
    ],
  },
  {
    parentClass: "Paladin",
    featureName: "Sacred Weapon",
    resourceKey: "channel_divinity",
    activation: { action: true },
    linkedModifiers: [
      modInstance("modinst_sacred_weapon", CLASS_RESOURCE_FX_CATALOG.selfBuffCaster, [
        fx("fx_sacred_weapon", { kind: "self_buff_caster" }),
      ]),
    ],
  },
  {
    parentClass: "Bard",
    featureName: "Cutting Words",
    resourceKey: "bardic_inspiration",
    activation: { reaction: true },
    linkedModifiers: [
      modInstance("modinst_lore_cutting_words", CLASS_RESOURCE_FX_CATALOG.debuffEnemyRoll, [
        fx("fx_lore_cutting_words", {
          kind: "debuff_enemy_roll",
          buffMode: "bonus",
          buffBonus: {
            mode: "die",
            dieScaling: "class_resource",
            classResourceKey: "bardic_inspiration",
          },
        }),
      ]),
    ],
  },
  {
    parentClass: "Barbarian",
    featureName: "Retaliation",
    activation: { reaction: true },
    linkedModifiers: [
      modInstance("modinst_berserker_retaliation", CLASS_RESOURCE_FX_CATALOG.reactionAttack, [
        fx("fx_berserker_retaliation", { kind: "reaction_attack" }),
      ]),
    ],
  },
  {
    parentClass: "Ranger",
    featureName: "Superior Hunter's Defense",
    activation: { reaction: true },
    linkedModifiers: [
      modInstance("modinst_superior_hunters_defense", CLASS_RESOURCE_FX_CATALOG.damageReduction, [
        fx("fx_superior_hunters_defense", {
          kind: "damage_reduction",
          mitigation: "resistance",
          label: "Reaction: Resistance to triggering damage type",
        }),
      ]),
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

  const limitedUses =
    preset.resourceKey && !featureHasResourceBinding(feature)
      ? classResourceUses(preset.resourceKey)
      : feature.limitedUses

  return syncModifierRefs({
    ...feature,
    limitedUses: limitedUses ?? null,
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

  return applyResourcePreset(feature, preset as Parameters<typeof applyResourcePreset>[1])
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

  return applyResourcePreset(feature, preset as Parameters<typeof applyResourcePreset>[1])
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
