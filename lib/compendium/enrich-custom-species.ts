import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import { FEAT_MODIFIER_CATALOG } from "@/lib/compendium/enrich-srd-feats"
import { enrichFeatureWithMechanicalDetection } from "@/lib/compendium/enrich-feature-mechanical-detection"
import { syncModifierRefs, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import { isSrdSource } from "@/lib/srd/source"
import type { FeatureActivation, Trait, UsesConfig } from "@/lib/types"

/**
 * Modifier presets for non-SRD species entered in the compendium (PHB, Eberron, etc.).
 * No stat text is bundled in the public repo — create species rows locally with trait
 * names matching the keys below (`SpeciesName::TraitName`); linked modifiers apply on load.
 */

const CHECK_ROLL_MODIFIER_CATALOG_ID = "cat_fx_check_roll_modifier"
const REST_REPLACEMENT_CATALOG_ID = "cat_char_rest_replacement"
const MAGICAL_SLEEP_IMMUNITY_CATALOG_ID = "cat_char_magical_sleep_immunity"
const CREATURE_SIZE_CATALOG_ID = "cat_char_creature_size"
const SAVING_THROW_TRIGGER_CATALOG_ID = "cat_char_saving_throw_trigger"
const ON_HIT_TRIGGER_CATALOG_ID = "cat_char_on_hit_trigger"
const EXTRA_DAMAGE_ON_HIT_CATALOG_ID = "cat_fx_extra_damage_on_hit"
const FORCE_SAVE_CATALOG_ID = "cat_fx_force_save_control"
const HEALING_DICE_POOL_CATALOG_ID = "cat_char_healing_dice_pool"
const AURA_CATALOG_ID = "cat_char_aura"
const TURN_START_TRIGGER_CATALOG_ID = "cat_char_turn_start_trigger"
const AC_CATALOG_ID = "cat_char_ac"

function modId(key: string): string {
  return `mod_${key}`
}

function charInstance(
  instanceId: string,
  catalogRefId: string,
  characteristics: CharacteristicModifier[],
): LinkedModifierInstance {
  return { instanceId, catalogRefId, characteristics }
}

function fxInstance(
  instanceId: string,
  catalogRefId: string,
  activation: FeatureActivation,
): LinkedModifierInstance {
  return { instanceId, catalogRefId, activation }
}

function vision(rangeFeet: number, visionType: "darkvision" | "tremorsense" = "darkvision", label?: string) {
  return charInstance(`modinst_${label ?? visionType}_${rangeFeet}`, FEAT_MODIFIER_CATALOG.vision, [
    {
      id: modId(`${visionType}_${rangeFeet}`),
      type: "vision",
      visionType,
      rangeFeet,
      label,
    },
  ])
}

function damageResistance(types: string[], label?: string) {
  return charInstance(`modinst_res_${types.join("_")}`, FEAT_MODIFIER_CATALOG.damageResistance, [
    {
      id: modId(`res_${types.join("_")}`),
      type: "damage_resistance",
      damageTypes: types,
      label,
    },
  ])
}

function usesPool(uses: UsesConfig, label?: string) {
  return charInstance(`modinst_uses_${label ?? "pool"}`, FEAT_MODIFIER_CATALOG.uses, [
    {
      id: modId(`uses_${label ?? "pool"}`),
      type: "uses",
      uses,
      label,
    },
  ])
}

function checkAdvantageSave(instanceKey: string, options: { ability?: string; conditions?: string[] }) {
  return fxInstance(`modinst_${instanceKey}`, CHECK_ROLL_MODIFIER_CATALOG_ID, {
    effects: [
      {
        id: modId(instanceKey),
        kind: "check_roll_modifier",
        checkRollMode: "advantage",
        checkCategory: "save",
        checkAbility: options.ability ?? null,
        checkConditionTypes: options.conditions ?? [],
      },
    ],
  })
}

function checkAdvantageAbility(instanceKey: string, ability: string, label?: string) {
  return fxInstance(`modinst_${instanceKey}`, CHECK_ROLL_MODIFIER_CATALOG_ID, {
    effects: [
      {
        id: modId(instanceKey),
        kind: "check_roll_modifier",
        checkRollMode: "advantage",
        checkCategory: "ability",
        checkAbility: ability,
        label,
      },
    ],
  })
}

function skillPoolChoice(skills: string[], count: number, label?: string) {
  return charInstance(`modinst_skills_${skills.join("_")}_${count}`, FEAT_MODIFIER_CATALOG.skills, [
    {
      id: modId(`skills_${skills.join("_")}_${count}`),
      type: "skills",
      entries: skills.map((skill) => ({ skill, expertise: false })),
      choiceCount: count,
      label,
    },
  ])
}

function skillChoice(count: number, label?: string) {
  return charInstance(`modinst_skills_any_${count}`, FEAT_MODIFIER_CATALOG.skills, [
    {
      id: modId(`skills_any_${count}`),
      type: "skills",
      entries: [],
      allowAnySkill: true,
      choiceCount: count,
      label,
    },
  ])
}

function toolChoice(count: number, label?: string) {
  return charInstance(`modinst_tools_${count}`, FEAT_MODIFIER_CATALOG.toolProficiencies, [
    {
      id: modId(`tools_${count}`),
      type: "tool_proficiencies",
      values: [],
      choiceCount: count,
      label,
    },
  ])
}

function skillOrToolChoice(groupId: string, count: number, label?: string) {
  return [
    charInstance(`modinst_${groupId}_skill`, FEAT_MODIFIER_CATALOG.skills, [
      {
        id: modId(`${groupId}_skill`),
        type: "skills",
        entries: [],
        allowAnySkill: true,
        choiceCount: 0,
        sharedChoiceGroup: groupId,
        sharedChoiceCount: count,
        label,
      },
    ]),
    charInstance(`modinst_${groupId}_tool`, FEAT_MODIFIER_CATALOG.toolProficiencies, [
      {
        id: modId(`${groupId}_tool`),
        type: "tool_proficiencies",
        values: [],
        choiceCount: 0,
        sharedChoiceGroup: groupId,
        sharedChoiceCount: count,
        label,
      },
    ]),
  ]
}

function spellsKnownCantrip(spellId: string, options?: { castingAbility?: string; spellListClassOptions?: string[] }) {
  return charInstance(`modinst_spell_${spellId}`, FEAT_MODIFIER_CATALOG.spellsKnown, [
    {
      id: modId(`spell_${spellId}`),
      type: "spells_known",
      spells: [{ spellId, prepared: true }],
      castingAbility: (options?.castingAbility as "intelligence" | "wisdom" | "charisma") ?? undefined,
      spellListClassOptions: options?.spellListClassOptions,
      ...(options?.spellListClassOptions?.length ? { playerPicksSpellList: true } : {}),
      label: `${spellId} cantrip`,
    },
  ])
}

function restReplacement(restHours: number, label?: string, description?: string) {
  return charInstance(`modinst_rest_${restHours}`, REST_REPLACEMENT_CATALOG_ID, [
    {
      id: modId(`rest_${restHours}`),
      type: "rest_replacement",
      restHours,
      replacesLongRest: true,
      description: description ?? "",
      label,
    },
  ])
}

function magicalSleepNoSleep(label: string, immuneToNamedSpells?: string[]) {
  return charInstance(`modinst_${label}`, MAGICAL_SLEEP_IMMUNITY_CATALOG_ID, [
    {
      id: modId(label),
      type: "magical_sleep_immunity",
      noSleepRequired: true,
      immuneToNamedSpells: immuneToNamedSpells ?? [],
      label,
    },
  ])
}

function flatAcBonus(amount: number, label?: string) {
  return charInstance(`modinst_ac_${amount}`, AC_CATALOG_ID, [
    {
      id: modId(`ac_${amount}`),
      type: "ac",
      mode: "flat_bonus",
      flatBonus: amount,
      label,
    },
  ])
}

function exhaustionSourceImmunity(sources: string[], label?: string) {
  return charInstance(`modinst_exhaustion_${sources.join("_")}`, "cat_char_condition_immunity", [
    {
      id: modId(`exhaustion_${sources.join("_")}`),
      type: "condition_immunity",
      conditions: ["Exhaustion"],
      exhaustionSourceExclusions: sources,
      label,
    },
  ])
}

function telepathyPerLevel(feetPerLevel: number, label?: string) {
  return charInstance(`modinst_telepathy_${feetPerLevel}pl`, FEAT_MODIFIER_CATALOG.telepathy, [
    {
      id: modId(`telepathy_${feetPerLevel}pl`),
      type: "telepathy",
      rangeFeet: 0,
      rangeFeetPerLevel: feetPerLevel,
      canInitiate: true,
      label: label ?? `Telepathy ${feetPerLevel} ft. × level`,
    },
  ])
}

function speedFlyEqualWalk(label?: string) {
  return charInstance(`modinst_fly_equal_walk`, FEAT_MODIFIER_CATALOG.speed, [
    {
      id: modId("fly_equal_walk"),
      type: "speed",
      speedType: "fly",
      mode: "equal_to_walk",
      value: 0,
      label: label ?? "Fly speed equal to Speed",
    },
  ])
}

function speedAddWhileShifted(feet: number, label?: string) {
  return charInstance(`modinst_speed_add_${feet}`, FEAT_MODIFIER_CATALOG.speed, [
    {
      id: modId(`speed_add_${feet}`),
      type: "speed",
      speedType: "walk",
      mode: "add",
      value: feet,
      label: label ?? `+${feet} ft. Speed while shifted`,
    },
  ])
}

function unarmedStrike(die: string, damageType: string, label?: string) {
  return charInstance(`modinst_unarmed_${die}`, FEAT_MODIFIER_CATALOG.unarmedStrikeDamage, [
    {
      id: modId(`unarmed_${die}`),
      type: "unarmed_strike_damage",
      die: die as "1d6",
      damageType,
      ability: "strength",
      label,
    },
  ])
}

function standardLanguages(): LinkedModifierInstance {
  return charInstance("modinst_species_languages", "cat_char_languages", [
    {
      id: modId("species_languages"),
      type: "languages",
      values: ["Common"],
      choiceCount: 2,
      choicePool: "standard",
      label: "Languages (Common + two of your choice)",
    },
  ])
}

function replaceFailedSaveOnCondition(
  instanceKey: string,
  conditions: string[],
  label: string,
): LinkedModifierInstance[] {
  return [
    usesPool({ type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] }, label),
    charInstance(`modinst_${instanceKey}`, SAVING_THROW_TRIGGER_CATALOG_ID, [
      {
        id: modId(instanceKey),
        type: "saving_throw_trigger",
        triggerOn: "fail",
        targetScope: "self",
        saveConditionFilter: conditions,
        effect: {
          catalogRefId: CHECK_ROLL_MODIFIER_CATALOG_ID,
          activation: {
            effects: [
              {
                id: modId(`${instanceKey}_fx`),
                kind: "check_roll_modifier",
                checkRollMode: "replace_failure",
                label: "Treat failed save as success",
              },
            ],
          },
        },
        label,
      },
    ]),
  ]
}

type TraitPreset = { linkedModifiers?: LinkedModifierInstance[] }

const SPECIES_TRAIT_PRESETS: Record<string, TraitPreset> = {
  // —— Aasimar (PHB) ——
  "Aasimar::Celestial Resistance": {
    linkedModifiers: [damageResistance(["Necrotic", "Radiant"], "Necrotic and Radiant resistance")],
  },
  "Aasimar::Darkvision": { linkedModifiers: [vision(60, "darkvision", "Darkvision 60 ft.")] },
  "Aasimar::Healing Hands": {
    linkedModifiers: [
      charInstance("modinst_healing_hands", HEALING_DICE_POOL_CATALOG_ID, [
        {
          id: modId("healing_hands"),
          type: "healing_dice_pool",
          dieType: "d4",
          dicePerUseSource: "proficiency",
          activation: "magic_action",
          recharges: [{ rest: "long_rest" }],
          label: "Healing Hands (PB d4s, 1/long rest)",
        },
      ]),
    ],
  },
  "Aasimar::Light Bearer": {
    linkedModifiers: [
      charInstance("modinst_light_bearer", FEAT_MODIFIER_CATALOG.spellsKnown, [
        {
          id: modId("light_bearer"),
          type: "spells_known",
          spells: [{ spellId: "Light", prepared: true }],
          castingAbility: "charisma",
          label: "Light cantrip (Charisma)",
        },
      ]),
    ],
  },
  "Aasimar::Celestial Revelation": {
    linkedModifiers: [
      usesPool({ type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] }, "Celestial Revelation"),
      charInstance("modinst_celestial_revelation_rider", ON_HIT_TRIGGER_CATALOG_ID, [
        {
          id: modId("celestial_revelation_rider"),
          type: "on_hit_trigger",
          oncePerTurn: true,
          appliesTo: "attack_or_spell_damage",
          label: "Once per turn: +PB damage while transformed",
          effect: {
            catalogRefId: EXTRA_DAMAGE_ON_HIT_CATALOG_ID,
            activation: {
              effects: [
                {
                  id: modId("celestial_revelation_rider_fx"),
                  kind: "extra_damage_on_hit",
                  bonusConfig: { mode: "proficiency" },
                },
              ],
            },
          },
        },
      ]),
    ],
  },

  // —— Changeling ——
  "Changeling::Changeling Instincts": {
    linkedModifiers: [
      skillPoolChoice(
        ["Deception", "Insight", "Intimidation", "Performance", "Persuasion"],
        2,
        "Changeling Instincts (pick 2)",
      ),
    ],
  },
  "Changeling::Shape-Shifter": {
    linkedModifiers: [
      charInstance("modinst_shape_shifter_size", CREATURE_SIZE_CATALOG_ID, [
        {
          id: modId("shape_shifter_size"),
          type: "creature_size",
          size: "Medium",
          mode: "activatable",
          label: "Toggle size Small or Medium while shape-shifted",
        },
      ]),
      checkAdvantageAbility(
        "shape_shifter_cha",
        "Charisma",
        "Advantage on Charisma checks while shape-shifted",
      ),
    ],
  },

  // —— Kalashtar ——
  "Kalashtar::Dual Mind": {
    linkedModifiers: [
      checkAdvantageSave("kalashtar_wis_save", { ability: "Wisdom" }),
      checkAdvantageSave("kalashtar_cha_save", { ability: "Charisma" }),
    ],
  },
  "Kalashtar::Mental Discipline": {
    linkedModifiers: [damageResistance(["Psychic"], "Psychic resistance")],
  },
  "Kalashtar::Mind Link": {
    linkedModifiers: [
      telepathyPerLevel(10, "Telepathy 10 ft. × character level"),
      fxInstance("modinst_mind_link_grant", FEAT_MODIFIER_CATALOG.movementOption, {
        action: true,
        effects: [
          {
            id: modId("mind_link_grant"),
            kind: "movement_option",
            label: "Magic Action: grant reciprocal telepathy for 1 hour",
          },
        ],
      }),
    ],
  },
  "Kalashtar::Severed from Dreams": {
    linkedModifiers: [
      magicalSleepNoSleep("kalashtar_dream_immune", ["Dream"]),
      skillChoice(1, "Skill proficiency until next long rest (replace each rest)"),
    ],
  },

  // —— Khoravar ——
  "Khoravar::Darkvision": { linkedModifiers: [vision(60, "darkvision", "Darkvision 60 ft.")] },
  "Khoravar::Fey Ancestry": {
    linkedModifiers: [checkAdvantageSave("khoravar_fey_ancestry", { conditions: ["Charmed"] })],
  },
  "Khoravar::Fey Gift": {
    linkedModifiers: [
      spellsKnownCantrip("Friends", {
        spellListClassOptions: ["Cleric", "Druid", "Wizard"],
      }),
    ],
  },
  "Khoravar::Lethargy Resilience": {
    linkedModifiers: replaceFailedSaveOnCondition(
      "lethargy_resilience",
      ["Unconscious"],
      "Lethargy Resilience (1/long rest; recharge 1d4 long rests)",
    ),
  },
  "Khoravar::Skill Versatility": {
    linkedModifiers: skillOrToolChoice("khoravar_versatility", 1, "Skill or tool (replace each long rest)"),
  },

  // —— Shifter ——
  "Shifter::Bestial Instincts": {
    linkedModifiers: [
      skillPoolChoice(["Acrobatics", "Athletics", "Intimidation", "Survival"], 1, "Bestial Instincts"),
    ],
  },
  "Shifter::Darkvision": { linkedModifiers: [vision(60, "darkvision", "Darkvision 60 ft.")] },
  "Shifter::Shifting": {
    linkedModifiers: [
      usesPool({ type: "proficiency", recharges: [{ rest: "long_rest" }] }, "Shifting"),
      fxInstance("modinst_shifting_thp", FEAT_MODIFIER_CATALOG.grantTempHp, {
        bonusAction: true,
        effects: [
          {
            id: modId("shifting_thp"),
            kind: "grant_temp_hp",
            healMode: "proficiency",
            healProficiencyMultiplier: 2,
            tempHpTrigger: "bonus_action",
            label: "2 × Proficiency Bonus temporary HP when you shift",
          },
        ],
      }),
    ],
  },

  // —— Warforged ——
  "Warforged::Construct Resilience": {
    linkedModifiers: [
      damageResistance(["Poison"], "Poison resistance"),
      checkAdvantageSave("warforged_poisoned", { conditions: ["Poisoned"] }),
    ],
  },
  "Warforged::Integrated Protection": {
    linkedModifiers: [flatAcBonus(1, "Integrated Protection +1 AC")],
  },
  "Warforged::Sentry's Rest": {
    linkedModifiers: [
      restReplacement(
        6,
        "Sentry's Rest — 6-hour long rest",
        "Finish a long rest in 6 hours while inert but conscious.",
      ),
      magicalSleepNoSleep("warforged_sentry_rest"),
    ],
  },
  "Warforged::Specialized Design": {
    linkedModifiers: [skillChoice(1, "Specialized Design — skill"), toolChoice(1, "Specialized Design — tool")],
  },
  "Warforged::Tireless": {
    linkedModifiers: [
      exhaustionSourceImmunity(
        ["dehydration", "malnutrition", "suffocation"],
        "No Exhaustion from dehydration, malnutrition, or suffocation",
      ),
    ],
  },
}

const SPECIES_CHOICE_OPTION_PRESETS: Record<string, TraitPreset> = {
  "Aasimar::Celestial Revelation::Heavenly Wings": {
    linkedModifiers: [speedFlyEqualWalk("Heavenly Wings — fly speed equal to Speed")],
  },
  "Aasimar::Celestial Revelation::Inner Radiance": {
    linkedModifiers: [
      charInstance("modinst_inner_radiance_aura", AURA_CATALOG_ID, [
        {
          id: modId("inner_radiance_aura"),
          type: "aura",
          radiusFeet: 10,
          affectsSelf: true,
          affectsAllies: false,
          label: "Bright Light 10 ft., Dim Light 10 ft. beyond",
        },
      ]),
      charInstance("modinst_inner_radiance_damage", TURN_START_TRIGGER_CATALOG_ID, [
        {
          id: modId("inner_radiance_damage"),
          type: "turn_start_trigger",
          effect: {
            catalogRefId: EXTRA_DAMAGE_ON_HIT_CATALOG_ID,
            activation: {
              effects: [
                {
                  id: modId("inner_radiance_damage_fx"),
                  kind: "extra_damage_on_hit",
                  bonusConfig: { mode: "proficiency" },
                  effectDamageTypes: ["Radiant"],
                },
              ],
            },
          },
          label: "End of turn: Radiant damage equal to PB in 10 ft.",
        },
      ]),
    ],
  },
  "Aasimar::Celestial Revelation::Necrotic Shroud": {
    linkedModifiers: [
      fxInstance("modinst_necrotic_shroud", FORCE_SAVE_CATALOG_ID, {
        bonusAction: true,
        effects: [
          {
            id: modId("necrotic_shroud"),
            kind: "force_save_control",
            attackProfile: "force_save",
            saveAbility: "Charisma",
            saveDCBase: 8,
            saveDCConfig: { mode: "proficiency", ability: "charisma" },
            effectConditionTypes: ["Frightened"],
            label: "Non-allies within 10 ft.: CHA save or Frightened",
          },
        ],
      }),
    ],
  },

  "Shifter::Shifting::Beasthide": {
    linkedModifiers: [
      fxInstance("modinst_beasthide_thp", FEAT_MODIFIER_CATALOG.grantTempHp, {
        bonusAction: true,
        effects: [
          {
            id: modId("beasthide_thp"),
            kind: "grant_temp_hp",
            healMode: "dice",
            healDiceCount: 1,
            healDieType: "d6",
            tempHpTrigger: "bonus_action",
            label: "+1d6 temporary HP when you shift",
          },
        ],
      }),
      flatAcBonus(1, "+1 AC while shifted"),
    ],
  },
  "Shifter::Shifting::Longtooth": {
    linkedModifiers: [
      unarmedStrike("1d6", "Piercing", "Longtooth unarmed strike: 1d6 + STR Piercing while shifted"),
    ],
  },
  "Shifter::Shifting::Swiftstride": {
    linkedModifiers: [speedAddWhileShifted(10, "+10 ft. Speed while shifted")],
  },
  "Shifter::Shifting::Wildhunt": {
    linkedModifiers: [
      checkAdvantageAbility("wildhunt_wis", "Wisdom", "Advantage on Wisdom checks while shifted"),
      charInstance("modinst_wildhunt_aura", AURA_CATALOG_ID, [
        {
          id: modId("wildhunt_aura"),
          type: "aura",
          radiusFeet: 30,
          affectsSelf: true,
          affectsAllies: false,
          reactionGrantResistance: false,
          label: "Attackers within 30 ft. can't have Advantage unless you're Incapacitated",
        },
      ]),
    ],
  },
}

const SPECIES_SIZE_OPTIONS: Record<string, string[]> = {
  Aasimar: ["Small", "Medium"],
  Changeling: ["Small", "Medium"],
  Khoravar: ["Small", "Medium"],
  Shifter: ["Small", "Medium"],
  Warforged: ["Small", "Medium"],
}

/** Species that receive the SRD-style Common + 2 language choice when not already granted. */
const SPECIES_WITH_STANDARD_LANGUAGES = new Set(["Aasimar"])

export function speciesHasTraitPresetRegistry(speciesName: string): boolean {
  const prefix = `${speciesName}::`
  return (
    Object.keys(SPECIES_TRAIT_PRESETS).some((key) => key.startsWith(prefix)) ||
    Object.keys(SPECIES_CHOICE_OPTION_PRESETS).some((key) => key.startsWith(prefix))
  )
}

function traitHasModifierConfig(trait: Trait): boolean {
  return Boolean(trait.linkedModifiers?.length || trait.modifierRefs?.length)
}

function optionHasModifierConfig(option: {
  linkedModifiers?: LinkedModifierInstance[]
  modifierRefs?: string[]
}): boolean {
  return Boolean(option.linkedModifiers?.length || option.modifierRefs?.length)
}

function applyPresetToTrait(speciesName: string, trait: Trait): Trait {
  const key = `${speciesName}::${trait.name}`
  const preset = SPECIES_TRAIT_PRESETS[key]
  let next = { ...trait }

  if (preset?.linkedModifiers?.length && !traitHasModifierConfig(trait)) {
    const synced = syncModifierRefs({ linkedModifiers: preset.linkedModifiers })
    next = {
      ...next,
      linkedModifiers: synced.linkedModifiers,
      modifierRefs: synced.modifierRefs,
    }
  }

  if (trait.isChoice && trait.choices?.options?.length) {
    next = {
      ...next,
      choices: {
        ...trait.choices,
        options: trait.choices.options.map((option) => {
          const optionKey = `${speciesName}::${trait.name}::${option.name}`
          const optionPreset = SPECIES_CHOICE_OPTION_PRESETS[optionKey]
          if (!optionPreset?.linkedModifiers?.length || optionHasModifierConfig(option)) {
            return option
          }
          const synced = syncModifierRefs({ linkedModifiers: optionPreset.linkedModifiers })
          return {
            ...option,
            linkedModifiers: synced.linkedModifiers,
            modifierRefs: synced.modifierRefs,
          }
        }),
      },
    }
  }

  return enrichFeatureWithMechanicalDetection(next, {
    contentKind: "species_trait",
    sourceName: speciesName,
    featureName: trait.name,
    level: trait.level,
  })
}

function speciesHasLanguageGrant(row: Record<string, unknown>): boolean {
  const matches = (instances: unknown): boolean =>
    Array.isArray(instances) &&
    instances.some(
      (inst) =>
        inst &&
        typeof inst === "object" &&
        ((inst as LinkedModifierInstance).catalogRefId === "cat_char_languages" ||
          (Array.isArray((inst as LinkedModifierInstance).characteristics) &&
            (inst as LinkedModifierInstance).characteristics!.some((c) => c?.type === "languages"))),
    )

  if (matches(row.linkedModifiers)) return true
  const traits = Array.isArray(row.traits) ? (row.traits as Trait[]) : []
  return traits.some(
    (trait) =>
      matches(trait.linkedModifiers) ||
      (trait.choices?.options ?? []).some((option) => matches(option.linkedModifiers)),
  )
}

/** Apply non-SRD species modifier presets when the species name matches the registry. */
export function enrichCustomSpeciesRow(row: Record<string, unknown>): Record<string, unknown> {
  if (isSrdSource(row.source as string | null | undefined)) return row
  const speciesName = String(row.name ?? "")
  if (!speciesHasTraitPresetRegistry(speciesName)) return row

  const traits = Array.isArray(row.traits) ? (row.traits as Trait[]) : []
  let next = { ...row }

  const sizeOptions = SPECIES_SIZE_OPTIONS[speciesName]
  if (sizeOptions && !Array.isArray(next.size_options)) {
    next = { ...next, size_options: sizeOptions }
  }

  if (SPECIES_WITH_STANDARD_LANGUAGES.has(speciesName) && !speciesHasLanguageGrant(next)) {
    const existing = Array.isArray(next.linkedModifiers)
      ? (next.linkedModifiers as LinkedModifierInstance[])
      : Array.isArray(next.linked_modifiers)
        ? (next.linked_modifiers as LinkedModifierInstance[])
        : []
    const synced = syncModifierRefs({ linkedModifiers: [...existing, standardLanguages()] })
    next = {
      ...next,
      linked_modifiers: synced.linkedModifiers,
      linkedModifiers: synced.linkedModifiers,
      modifier_refs: synced.modifierRefs,
      modifierRefs: synced.modifierRefs,
    }
  }

  if (!traits.length) return next

  const enrichedTraits = traits.map((trait) => applyPresetToTrait(speciesName, trait))
  return { ...next, traits: enrichedTraits }
}

/** @deprecated Use enrichCustomSpeciesRow */
export const enrichPhbSpeciesRow = enrichCustomSpeciesRow
