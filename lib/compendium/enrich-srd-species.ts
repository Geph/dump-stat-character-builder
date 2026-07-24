import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import { applySrdItemIcon, SRD_SPECIES_ICONS_BY_NAME } from "@/lib/compendium/srd-item-icons-defaults"
import { applySrdCardImage } from "@/lib/compendium/card-image"
import { SPECIES_CARD_IMAGES_BY_NAME } from "@/lib/compendium/species-card-images-defaults"
import type { BonusByLevelEntry } from "@/lib/compendium/bonus-by-level"
import { FEAT_MODIFIER_CATALOG } from "@/lib/compendium/enrich-srd-feats"
import { GRANT_FEAT_CATALOG_ID } from "@/lib/compendium/grant-feat-catalog"
import { enrichFeatureWithMechanicalDetection } from "@/lib/compendium/enrich-feature-mechanical-detection"
import { syncModifierRefs, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import { applySrdFlavorDescription } from "@/lib/compendium/srd-flavor-descriptions"
import { isSrdSource } from "@/lib/srd/source"
import type { Feature, FeatureActivation, Trait, UsesConfig } from "@/lib/types"

const GAIN_INSPIRATION_CATALOG_ID = "cat_other_gain_inspiration"
import { SPECIAL_ATTACK_CATALOG_ID } from "@/lib/compendium/modifier-catalog"
const REST_REPLACEMENT_CATALOG_ID = "cat_char_rest_replacement"
const MAGICAL_SLEEP_IMMUNITY_CATALOG_ID = "cat_char_magical_sleep_immunity"
const CREATURE_SIZE_CATALOG_ID = "cat_char_creature_size"
const MOVEMENT_EFFECTS_CATALOG_ID = "cat_char_movement_effects"
const CHECK_ROLL_MODIFIER_CATALOG_ID = "cat_fx_check_roll_modifier"
const FORCE_SAVE_CATALOG_ID = "cat_fx_force_save_control"
const DAMAGE_REDUCTION_CATALOG_ID = "cat_fx_damage_reduction"
const ON_HIT_TRIGGER_CATALOG_ID = "cat_char_on_hit_trigger"
const EXTRA_DAMAGE_ON_HIT_CATALOG_ID = "cat_fx_extra_damage_on_hit"
const MODIFY_CREATURE_CATALOG_ID = "cat_fx_modify_creature"
const HEALING_DICE_POOL_CATALOG_ID = "cat_char_healing_dice_pool"

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
  return charInstance(`modinst_res_${types.join("_") || "pick"}`, FEAT_MODIFIER_CATALOG.damageResistance, [
    {
      id: modId(`res_${types.join("_") || "pick"}`),
      type: "damage_resistance",
      damageTypes: types,
      label,
    },
  ])
}

function hitPointsPerLevel(value: number, label?: string) {
  return charInstance(`modinst_hp_${value}`, "cat_char_hit_points", [
    {
      id: modId(`hp_${value}`),
      type: "hit_points",
      mode: "per_level",
      value,
      label,
    },
  ])
}

function speedAdd(feet: number, label?: string) {
  return charInstance(`modinst_speed_${feet}`, "cat_char_speed", [
    {
      id: modId(`speed_${feet}`),
      type: "speed",
      speedType: "walk",
      mode: "add",
      value: feet,
      label,
    },
  ])
}

function speedTypeAdd(
  speedType: "fly" | "climb" | "swim",
  feet: number,
  label?: string,
) {
  return charInstance(`modinst_speed_${speedType}_${feet}`, "cat_char_speed", [
    {
      id: modId(`speed_${speedType}_${feet}`),
      type: "speed",
      speedType,
      mode: "add",
      value: feet,
      label,
    },
  ])
}

function bonusActionMove(instanceKey: string, feet: number, label: string) {
  return fxInstance(`modinst_${instanceKey}`, FEAT_MODIFIER_CATALOG.movementOption, {
    bonusAction: true,
    effects: [
      {
        id: modId(instanceKey),
        kind: "movement_option",
        moveDistanceMode: "fixed",
        moveDistanceFixed: feet,
        label,
      },
    ],
  })
}

function forceSaveBonusAction(
  instanceKey: string,
  config: {
    saveAbility: string
    effectDamageTypes?: string[]
    effectConditionTypes?: string[]
    label: string
  },
) {
  return fxInstance(`modinst_${instanceKey}`, FORCE_SAVE_CATALOG_ID, {
    bonusAction: true,
    effects: [
      {
        id: modId(instanceKey),
        kind: "force_save_control",
        attackProfile: "force_save",
        saveAbility: config.saveAbility,
        effectDamageTypes: config.effectDamageTypes ?? [],
        effectConditionTypes: config.effectConditionTypes ?? [],
        label: config.label,
      },
    ],
  })
}

function onHitExtraDamage(
  instanceKey: string,
  dice: string,
  damageTypes: string[],
  options?: { oncePerTurn?: boolean; label?: string },
) {
  return charInstance(`modinst_${instanceKey}`, ON_HIT_TRIGGER_CATALOG_ID, [
    {
      id: modId(instanceKey),
      type: "on_hit_trigger",
      oncePerTurn: options?.oncePerTurn ?? false,
      label: options?.label,
      effect: {
        catalogRefId: EXTRA_DAMAGE_ON_HIT_CATALOG_ID,
        activation: {
          effects: [
            {
              id: modId(`${instanceKey}_fx`),
              kind: "extra_damage_on_hit",
              bonusDice: dice,
              effectDamageTypes: damageTypes,
            },
          ],
        },
      },
    },
  ])
}

function onHitApplyCondition(instanceKey: string, condition: string, label?: string) {
  return charInstance(`modinst_${instanceKey}`, ON_HIT_TRIGGER_CATALOG_ID, [
    {
      id: modId(instanceKey),
      type: "on_hit_trigger",
      oncePerTurn: false,
      label,
      effect: {
        catalogRefId: MODIFY_CREATURE_CATALOG_ID,
        activation: {
          effects: [
            {
              id: modId(`${instanceKey}_fx`),
              kind: "modify_creature",
              rollTarget: "enemy",
              creatureModifyMode: "condition" as import("@/lib/types").CreatureModifyMode,
              effectConditionTypes: [condition],
            },
          ],
        },
      },
    },
  ])
}

function damageReductionReaction(instanceKey: string, label: string): LinkedModifierInstance {
  return {
    instanceId: `modinst_${instanceKey}`,
    catalogRefId: DAMAGE_REDUCTION_CATALOG_ID,
    activation: {
      reaction: true,
      effects: [
        {
          id: modId(instanceKey),
          kind: "damage_reduction",
          mitigation: "reduction",
          bonusDice: "1d12",
          healAbility: "CON",
          label,
        },
      ],
    },
  }
}

function dropToOneHp(instanceKey: string, label: string): LinkedModifierInstance {
  return {
    instanceId: `modinst_${instanceKey}`,
    catalogRefId: FEAT_MODIFIER_CATALOG.healSelf,
    activation: {
      onDropToZeroHp: true,
      effects: [
        {
          id: modId(instanceKey),
          kind: "heal_self",
          healMode: "fixed",
          healFixed: 1,
          label,
        },
      ],
    },
  }
}

function skillProficiency(skill: string, label?: string) {
  return charInstance(`modinst_skill_${skill}`, FEAT_MODIFIER_CATALOG.skills, [
    {
      id: modId(`skill_${skill}`),
      type: "skills",
      entries: [{ skill, expertise: false }],
      label,
    },
  ])
}

function skillChoice(count: number, label?: string) {
  return charInstance(`modinst_skills_${count}`, FEAT_MODIFIER_CATALOG.skills, [
    {
      id: modId(`skills_${count}`),
      type: "skills",
      entries: [],
      allowAnySkill: true,
      choiceCount: count,
      label,
    },
  ])
}

function grantOriginFeat(label?: string) {
  return charInstance(`modinst_grant_origin_feat`, GRANT_FEAT_CATALOG_ID, [
    {
      id: modId("grant_origin_feat"),
      type: "grant_feat",
      featCategories: ["Origin"],
      count: 1,
      label,
    },
  ])
}

function gainInspiration(): LinkedModifierInstance {
  return {
    instanceId: "modinst_gain_inspiration",
    catalogRefId: GAIN_INSPIRATION_CATALOG_ID,
    characteristics: [],
  }
}

/**
 * SRD origin languages: every character knows Common plus two languages chosen (or rolled)
 * from the Standard Languages table (SRD pg 20). Surfaced as a species-wide language choice.
 */
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

function checkAdvantageSave(
  instanceKey: string,
  options: { ability?: string; conditions?: string[] },
) {
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

function checkAdvantageAbility(instanceKey: string, conditions: string[]) {
  return fxInstance(`modinst_${instanceKey}`, CHECK_ROLL_MODIFIER_CATALOG_ID, {
    effects: [
      {
        id: modId(instanceKey),
        kind: "check_roll_modifier",
        checkRollMode: "advantage",
        checkCategory: "ability",
        checkConditionTypes: conditions,
      },
    ],
  })
}

function checkRollLuck(instanceKey: string) {
  return fxInstance(`modinst_${instanceKey}`, CHECK_ROLL_MODIFIER_CATALOG_ID, {
    effects: [
      {
        id: modId(instanceKey),
        kind: "check_roll_modifier",
        checkCategory: "other",
        checkRerollOnNaturalOne: true,
      },
    ],
  })
}

function spellsKnownChoice(
  instanceKey: string,
  choiceGrants: { level: number; count: number }[],
  extras?: { label?: string; spellListClassOptions?: string[] },
) {
  return charInstance(`modinst_${instanceKey}`, FEAT_MODIFIER_CATALOG.spellsKnown, [
    {
      id: modId(instanceKey),
      type: "spells_known",
      spells: [],
      choiceGrants,
      label: extras?.label,
      spellListClassOptions: extras?.spellListClassOptions,
      ...(extras?.spellListClassOptions?.length ? { playerPicksSpellList: true } : {}),
    },
  ])
}

/** Fixed always-prepared lineage / trait spells (no player spell picks). */
function spellsKnownFixed(
  instanceKey: string,
  entries: { name: string; unlocksAtLevel?: number }[],
  label?: string,
) {
  return charInstance(`modinst_${instanceKey}`, FEAT_MODIFIER_CATALOG.spellsKnown, [
    {
      id: modId(instanceKey),
      type: "spells_known",
      spells: entries.map((entry) => ({
        spellId: entry.name,
        alwaysPrepared: true,
        prepared: true,
        unlocksAtClassLevel: entry.unlocksAtLevel,
      })),
      alwaysPrepared: true,
      label,
    },
  ])
}

function spellcastingAbilityChoice(instanceKey: string, label?: string) {
  return charInstance(`modinst_${instanceKey}`, FEAT_MODIFIER_CATALOG.spellcastingAbility, [
    {
      id: modId(instanceKey),
      type: "spellcasting_ability",
      ability: "intelligence",
      abilityOptions: ["intelligence", "wisdom", "charisma"],
      label: label ?? "Spellcasting ability (Intelligence, Wisdom, or Charisma)",
    },
  ])
}

function movementDash(instanceKey: string) {
  return fxInstance(`modinst_${instanceKey}`, FEAT_MODIFIER_CATALOG.movementOption, {
    bonusAction: true,
    effects: [{ id: modId(instanceKey), kind: "movement_option", movementDash: true }],
  })
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

function magicalSleepImmunity(label?: string) {
  return charInstance("modinst_magical_sleep_immunity", MAGICAL_SLEEP_IMMUNITY_CATALOG_ID, [
    {
      id: modId("magical_sleep_immunity"),
      type: "magical_sleep_immunity",
      label,
    },
  ])
}

function creatureSize(
  size: "Small" | "Medium" | "Large" | "Huge",
  mode: "passive" | "activatable",
  durationMinutes?: number,
  label?: string,
) {
  return charInstance(`modinst_size_${size}_${mode}`, CREATURE_SIZE_CATALOG_ID, [
    {
      id: modId(`size_${size}_${mode}`),
      type: "creature_size",
      size,
      mode,
      durationMinutes: durationMinutes ?? null,
      label,
    },
  ])
}

function movementEffects(
  flags: {
    movementDash?: boolean
    movementDisengage?: boolean
    movementHide?: boolean
    movementMoveThroughLargerSpaces?: boolean
    movementHideBehindLargerCreatures?: boolean
  },
  label?: string,
) {
  return charInstance(`modinst_movement_effects_${label ?? "passive"}`, MOVEMENT_EFFECTS_CATALOG_ID, [
    {
      id: modId(`movement_effects_${label ?? "passive"}`),
      type: "movement_effects",
      ...flags,
      label,
    },
  ])
}

function specialAttack(
  instanceKey: string,
  config: {
    attackName: string
    attackProfile: "melee" | "ranged" | "emanation" | "force_save"
    damageDieType: "d4" | "d6" | "d8" | "d10" | "d12"
    damageDiceCount?: number
    damageTypes?: string[]
    damageByLevel?: BonusByLevelEntry[]
    saveAbility?: string
    saveDCBase?: number
    areaShape?: "cone" | "line" | "sphere" | "cone_or_line"
    areaLengthFeet?: number
    areaWidthFeet?: number
    alternateAreaLengthFeet?: number
    properties?: string[]
    label?: string
  },
) {
  return charInstance(`modinst_${instanceKey}`, SPECIAL_ATTACK_CATALOG_ID, [
    {
      id: modId(instanceKey),
      type: "special_attack",
      attackName: config.attackName,
      attackProfile: config.attackProfile,
      properties: config.properties ?? [],
      damageTypes: config.damageTypes ?? [],
      damageDiceCount: config.damageDiceCount ?? 1,
      damageDieType: config.damageDieType,
      damageByLevel: config.damageByLevel ?? [],
      saveAbility: config.saveAbility ?? null,
      saveDCBase: config.saveDCBase ?? 8,
      areaShape: config.areaShape ?? null,
      areaLengthFeet: config.areaLengthFeet ?? null,
      areaWidthFeet: config.areaWidthFeet ?? null,
      alternateAreaLengthFeet: config.alternateAreaLengthFeet ?? null,
      label: config.label,
    },
  ])
}

const DRAGON_ANCESTRY_DAMAGE: Record<string, string> = {
  Black: "Acid",
  Copper: "Acid",
  Gold: "Fire",
  Brass: "Fire",
  Red: "Fire",
  Blue: "Lightning",
  Bronze: "Lightning",
  Green: "Poison",
  Silver: "Cold",
  White: "Cold",
}

type TraitPreset = { linkedModifiers?: LinkedModifierInstance[] }

/** `${speciesName}::${traitName}` */
const SRD_SPECIES_TRAIT_PRESETS: Record<string, TraitPreset> = {
  "Dragonborn::Darkvision": { linkedModifiers: [vision(60, "darkvision", "Darkvision 60 ft.")] },
  "Dragonborn::Breath Weapon": {
    linkedModifiers: [
      specialAttack("dragonborn_breath", {
        attackName: "Breath Weapon",
        attackProfile: "force_save",
        saveAbility: "Dexterity",
        saveDCBase: 8,
        damageDieType: "d10",
        damageDiceCount: 1,
        areaShape: "cone_or_line",
        areaLengthFeet: 15,
        alternateAreaLengthFeet: 30,
        areaWidthFeet: 5,
        properties: ["Special"],
        label: "Breath Weapon",
        damageByLevel: [
          { level: 1, mode: "dice", dieCount: 1, dieType: "d10" },
          { level: 5, mode: "dice", dieCount: 2, dieType: "d10" },
          { level: 11, mode: "dice", dieCount: 3, dieType: "d10" },
          { level: 17, mode: "dice", dieCount: 4, dieType: "d10" },
        ],
      }),
      usesPool({ type: "proficiency", recharges: [{ rest: "long_rest" }] }, "Breath Weapon uses"),
    ],
  },
  "Dragonborn::Damage Resistance": {
    linkedModifiers: [damageResistance([], "Damage type from Draconic Ancestry")],
  },
  "Dragonborn::Draconic Flight": {
    linkedModifiers: [
      speedTypeAdd("fly", 0, "Fly speed equal to Speed while active"),
      usesPool({ type: "proficiency", recharges: [{ rest: "long_rest" }] }, "Draconic Flight"),
    ],
  },

  "Dwarf::Darkvision": { linkedModifiers: [vision(120, "darkvision", "Darkvision 120 ft.")] },
  "Dwarf::Dwarven Resilience": {
    linkedModifiers: [
      damageResistance(["Poison"], "Poison resistance"),
      checkAdvantageSave("dwarven_resilience_poisoned", { conditions: ["Poisoned"] }),
    ],
  },
  "Dwarf::Dwarven Toughness": { linkedModifiers: [hitPointsPerLevel(1, "Dwarven Toughness")] },
  "Dwarf::Stonecunning": {
    linkedModifiers: [
      vision(60, "tremorsense", "Stonecunning tremorsense"),
      usesPool({ type: "proficiency", recharges: [{ rest: "long_rest" }] }, "Stonecunning"),
    ],
  },

  "Elf::Darkvision": { linkedModifiers: [vision(60, "darkvision", "Darkvision 60 ft.")] },
  "Elf::Fey Ancestry": {
    linkedModifiers: [checkAdvantageSave("fey_ancestry_charmed", { conditions: ["Charmed"] })],
  },
  "Elf::Trance": {
    linkedModifiers: [
      restReplacement(
        4,
        "Trance — 4-hour long rest",
        "Finish a long rest in 4 hours via trancelike meditation while retaining consciousness.",
      ),
      charInstance("modinst_elf_trance_sleep", MAGICAL_SLEEP_IMMUNITY_CATALOG_ID, [
        {
          id: modId("elf_trance_sleep"),
          type: "magical_sleep_immunity",
          noSleepRequired: true,
          label: "Trance — immune to magical sleep; no sleep required",
        },
      ]),
    ],
  },

  "Gnome::Darkvision": { linkedModifiers: [vision(60, "darkvision", "Darkvision 60 ft.")] },
  "Gnome::Gnomish Cunning": {
    linkedModifiers: [
      checkAdvantageSave("gnomish_cunning_int", { ability: "Intelligence" }),
      checkAdvantageSave("gnomish_cunning_wis", { ability: "Wisdom" }),
      checkAdvantageSave("gnomish_cunning_cha", { ability: "Charisma" }),
    ],
  },

  "Goliath::Powerful Build": {
    linkedModifiers: [checkAdvantageAbility("powerful_build_grappled", ["Grappled"])],
  },
  "Goliath::Large Form": {
    linkedModifiers: [
      creatureSize("Large", "activatable", 10, "Large Form"),
      usesPool({ type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] }, "Large Form"),
    ],
  },

  "Halfling::Brave": {
    linkedModifiers: [checkAdvantageSave("halfling_brave", { conditions: ["Frightened"] })],
  },
  "Halfling::Halfling Nimbleness": {
    linkedModifiers: [
      movementEffects({ movementMoveThroughLargerSpaces: true }, "Halfling Nimbleness"),
    ],
  },
  "Halfling::Naturally Stealthy": {
    linkedModifiers: [
      movementEffects({ movementHideBehindLargerCreatures: true }, "Naturally Stealthy"),
    ],
  },
  "Halfling::Luck": {
    linkedModifiers: [checkRollLuck("halfling_luck")],
  },

  "Human::Resourceful": { linkedModifiers: [gainInspiration()] },
  "Human::Skillful": { linkedModifiers: [skillChoice(1, "Skillful")] },
  "Human::Versatile": { linkedModifiers: [grantOriginFeat("Origin feat")] },

  "Orc::Darkvision": { linkedModifiers: [vision(120, "darkvision", "Darkvision 120 ft.")] },
  "Orc::Adrenaline Rush": {
    linkedModifiers: [
      fxInstance("modinst_orc_adrenaline", FEAT_MODIFIER_CATALOG.movementOption, {
        bonusAction: true,
        effects: [
          { id: modId("orc_adrenaline_dash"), kind: "movement_option", movementDash: true },
          {
            id: modId("orc_adrenaline_thp"),
            kind: "grant_temp_hp",
            healMode: "proficiency",
            tempHpTrigger: "bonus_action",
            label: "Temporary HP equal to Proficiency Bonus",
          },
        ],
      }),
      usesPool(
        { type: "proficiency", recharges: [{ rest: "short_rest" }, { rest: "long_rest" }] },
        "Adrenaline Rush",
      ),
    ],
  },
  "Orc::Relentless Endurance": {
    linkedModifiers: [
      dropToOneHp("relentless_endurance", "Drop to 1 HP instead of 0"),
      usesPool({ type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] }, "Relentless Endurance"),
    ],
  },

  "Tiefling::Darkvision": { linkedModifiers: [vision(60, "darkvision", "Darkvision 60 ft.")] },
  "Tiefling::Otherworldly Presence": {
    linkedModifiers: [
      spellsKnownChoice("tiefling_thaumaturgy", [{ level: 0, count: 1 }], {
        label: "Thaumaturgy cantrip",
      }),
    ],
  },
}

/** `${speciesName}::${traitName}::${optionName}` */
const SRD_SPECIES_CHOICE_OPTION_PRESETS: Record<string, TraitPreset> = {
  ...Object.fromEntries(
    Object.entries(DRAGON_ANCESTRY_DAMAGE).map(([name, type]) => [
      `Dragonborn::Draconic Ancestry::${name}`,
      { linkedModifiers: [damageResistance([type], `${type} resistance`)] },
    ]),
  ),

  "Elf::Elven Lineage::Drow": {
    linkedModifiers: [
      vision(120, "darkvision", "Drow darkvision 120 ft."),
      spellcastingAbilityChoice("drow_lineage_ability"),
      spellsKnownFixed(
        "drow_spells",
        [
          { name: "Dancing Lights", unlocksAtLevel: 1 },
          { name: "Faerie Fire", unlocksAtLevel: 3 },
          { name: "Darkness", unlocksAtLevel: 5 },
        ],
        "Drow lineage spells",
      ),
    ],
  },
  "Elf::Elven Lineage::High Elf": {
    linkedModifiers: [
      spellcastingAbilityChoice("high_elf_lineage_ability"),
      spellsKnownFixed(
        "high_elf_spells",
        [
          { name: "Prestidigitation", unlocksAtLevel: 1 },
          { name: "Detect Magic", unlocksAtLevel: 3 },
          { name: "Misty Step", unlocksAtLevel: 5 },
        ],
        "High Elf lineage spells",
      ),
    ],
  },
  "Elf::Elven Lineage::Wood Elf": {
    linkedModifiers: [
      speedAdd(5, "Wood Elf speed"),
      spellcastingAbilityChoice("wood_elf_lineage_ability"),
      spellsKnownFixed(
        "wood_elf_spells",
        [
          { name: "Druidcraft", unlocksAtLevel: 1 },
          { name: "Longstrider", unlocksAtLevel: 3 },
          { name: "Pass without Trace", unlocksAtLevel: 5 },
        ],
        "Wood Elf lineage spells",
      ),
    ],
  },

  "Gnome::Gnomish Lineage::Forest Gnome": {
    linkedModifiers: [
      spellcastingAbilityChoice("forest_gnome_lineage_ability"),
      spellsKnownFixed(
        "forest_gnome_spells",
        [
          { name: "Minor Illusion", unlocksAtLevel: 1 },
          { name: "Speak with Animals", unlocksAtLevel: 1 },
        ],
        "Forest Gnome lineage spells",
      ),
    ],
  },
  "Gnome::Gnomish Lineage::Rock Gnome": {
    linkedModifiers: [
      spellcastingAbilityChoice("rock_gnome_lineage_ability"),
      spellsKnownFixed(
        "rock_gnome_spells",
        [
          { name: "Mending", unlocksAtLevel: 1 },
          { name: "Prestidigitation", unlocksAtLevel: 1 },
        ],
        "Rock Gnome lineage cantrips",
      ),
    ],
  },

  "Goliath::Giant Ancestry::Cloud's Jaunt (Cloud Giant)": {
    linkedModifiers: [
      bonusActionMove("clouds_jaunt", 30, "Bonus Action: teleport up to 30 ft to unoccupied space you can see"),
      usesPool({ type: "proficiency", recharges: [{ rest: "long_rest" }] }, "Cloud's Jaunt"),
    ],
  },
  "Goliath::Giant Ancestry::Fire's Burn (Fire Giant)": {
    linkedModifiers: [
      onHitExtraDamage("fires_burn", "1d10", ["Fire"], {
        label: "On hit: +1d10 Fire damage",
      }),
      usesPool({ type: "proficiency", recharges: [{ rest: "long_rest" }] }, "Fire's Burn"),
    ],
  },
  "Goliath::Giant Ancestry::Frost's Chill (Frost Giant)": {
    linkedModifiers: [
      onHitExtraDamage("frosts_chill", "1d6", ["Cold"], {
        label: "On hit: +1d6 Cold; target Speed −10 ft until your next turn",
      }),
      usesPool({ type: "proficiency", recharges: [{ rest: "long_rest" }] }, "Frost's Chill"),
    ],
  },
  "Goliath::Giant Ancestry::Hill's Tumble (Hill Giant)": {
    linkedModifiers: [
      onHitApplyCondition("hills_tumble", "Prone", "On hit vs Large or smaller: target is Prone"),
      usesPool({ type: "proficiency", recharges: [{ rest: "long_rest" }] }, "Hill's Tumble"),
    ],
  },
  "Goliath::Giant Ancestry::Stone's Endurance (Stone Giant)": {
    linkedModifiers: [
      damageReductionReaction(
        "stones_endurance",
        "Reaction: reduce damage by 1d12 + CON",
      ),
      usesPool({ type: "proficiency", recharges: [{ rest: "long_rest" }] }, "Stone's Endurance"),
    ],
  },
  "Goliath::Giant Ancestry::Storm's Thunder (Storm Giant)": {
    linkedModifiers: [
      forceSaveBonusAction("storms_thunder", {
        saveAbility: "CON",
        effectDamageTypes: ["Thunder"],
        label: "Bonus Action: CON save or Thunder damage in 10-ft emanation",
      }),
      usesPool({ type: "proficiency", recharges: [{ rest: "long_rest" }] }, "Storm's Thunder"),
    ],
  },

  "Tiefling::Fiendish Legacy::Abyssal": {
    linkedModifiers: [
      damageResistance(["Poison"], "Poison resistance"),
      spellcastingAbilityChoice("abyssal_legacy_ability"),
      spellsKnownFixed(
        "abyssal_spells",
        [
          { name: "Poison Spray", unlocksAtLevel: 1 },
          { name: "Ray of Sickness", unlocksAtLevel: 3 },
          { name: "Hold Person", unlocksAtLevel: 5 },
        ],
        "Abyssal legacy spells",
      ),
    ],
  },
  "Tiefling::Fiendish Legacy::Chthonic": {
    linkedModifiers: [
      damageResistance(["Necrotic"], "Necrotic resistance"),
      spellcastingAbilityChoice("chthonic_legacy_ability"),
      spellsKnownFixed(
        "chthonic_spells",
        [
          { name: "Chill Touch", unlocksAtLevel: 1 },
          { name: "False Life", unlocksAtLevel: 3 },
          { name: "Ray of Enfeeblement", unlocksAtLevel: 5 },
        ],
        "Chthonic legacy spells",
      ),
    ],
  },
  "Tiefling::Fiendish Legacy::Infernal": {
    linkedModifiers: [
      damageResistance(["Fire"], "Fire resistance"),
      spellcastingAbilityChoice("infernal_legacy_ability"),
      spellsKnownFixed(
        "infernal_spells",
        [
          { name: "Fire Bolt", unlocksAtLevel: 1 },
          { name: "Hellish Rebuke", unlocksAtLevel: 3 },
          { name: "Darkness", unlocksAtLevel: 5 },
        ],
        "Infernal legacy spells",
      ),
    ],
  },

  "Elf::Keen Senses::Insight": { linkedModifiers: [skillProficiency("Insight", "Keen Senses — Insight")] },
  "Elf::Keen Senses::Perception": {
    linkedModifiers: [skillProficiency("Perception", "Keen Senses — Perception")],
  },
  "Elf::Keen Senses::Survival": { linkedModifiers: [skillProficiency("Survival", "Keen Senses — Survival")] },
}

/** Resolve an SRD species choice-option preset, including short Goliath ancestry names. */
export function lookupSrdSpeciesChoiceOptionPreset(
  speciesName: string,
  traitName: string,
  optionName: string,
): TraitPreset | undefined {
  const aliases = [...new Set([
    speciesName,
    speciesName.replace(/\s*\([^)]*\)\s*$/u, "").trim(),
  ].filter(Boolean))]

  for (const alias of aliases) {
    const exact = SRD_SPECIES_CHOICE_OPTION_PRESETS[`${alias}::${traitName}::${optionName}`]
    if (exact) return exact
  }

  const needle = optionName.trim().toLowerCase()
  if (!needle) return undefined

  for (const alias of aliases) {
    const prefix = `${alias}::${traitName}::`
    for (const [key, preset] of Object.entries(SRD_SPECIES_CHOICE_OPTION_PRESETS)) {
      if (!key.startsWith(prefix)) continue
      const optPart = key.slice(prefix.length)
      const beforeParen = optPart.split("(")[0]?.trim().toLowerCase() ?? ""
      const optLower = optPart.toLowerCase()
      if (
        optLower === needle ||
        beforeParen === needle ||
        optLower.startsWith(`${needle} `) ||
        optLower.startsWith(`${needle}(`)
      ) {
        return preset
      }
    }
  }

  return undefined
}

/** Traits with no satisfactory common-modifier mapping (descriptive-only for now). */
export const SRD_SPECIES_TRAITS_WITHOUT_MODIFIER_MATCH = [
  "Dragonborn::Draconic Ancestry — choice header only; resistance is on each ancestry option",
  "Elf::Elven Lineage — choice header only; benefits are on each lineage option",
  "Gnome::Gnomish Lineage — choice header only; benefits are on each lineage option",
  "Goliath::Giant Ancestry — choice header only; benefits are on each ancestry option",
  "Tiefling::Fiendish Legacy — choice header only; benefits are on each legacy option",
] as const

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
  const preset = SRD_SPECIES_TRAIT_PRESETS[key]
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
          const optionPreset = lookupSrdSpeciesChoiceOptionPreset(
            speciesName,
            trait.name,
            option.name ?? "",
          )
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

  return enrichFeatureWithMechanicalDetection(next as unknown as Feature, {
    contentKind: "species_trait",
    sourceName: speciesName,
    featureName: trait.name,
    level: trait.level,
  })
}

/** SRD 2024 species that let the player choose their size (Medium or Small). */
const SRD_SPECIES_SIZE_OPTIONS: Record<string, string[]> = {
  Human: ["Small", "Medium"],
  Tiefling: ["Small", "Medium"],
}

export function enrichSrdSpeciesRow(row: Record<string, unknown>): Record<string, unknown> {
  return applySrdCardImage(
    applySrdItemIcon(enrichSrdSpeciesRowCore(row), SRD_SPECIES_ICONS_BY_NAME),
    SPECIES_CARD_IMAGES_BY_NAME,
  )
}

function enrichSrdSpeciesRowCore(row: Record<string, unknown>): Record<string, unknown> {
  if (!isSrdSource(row.source as string | null | undefined)) return row
  const speciesName = String(row.name ?? "")
  const traits = Array.isArray(row.traits) ? (row.traits as Trait[]) : []

  let next = applySrdFlavorDescription(row, "species")

  const sizeOptions = SRD_SPECIES_SIZE_OPTIONS[speciesName]
  if (sizeOptions && !Array.isArray(next.size_options)) {
    next = { ...next, size_options: sizeOptions }
  }

  // Origin languages (Common + two of your choice) — every SRD species grants these.
  // Only add when the species doesn't already carry a language grant of its own.
  if (!speciesRowHasLanguageGrant(next)) {
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

function linkedModifiersHaveLanguageGrant(instances: unknown): boolean {
  return (
    Array.isArray(instances) &&
    instances.some(
      (inst) =>
        inst &&
        typeof inst === "object" &&
        ((inst as LinkedModifierInstance).catalogRefId === "cat_char_languages" ||
          (Array.isArray((inst as LinkedModifierInstance).characteristics) &&
            (inst as LinkedModifierInstance).characteristics!.some(
              (c) => c?.type === "languages",
            ))),
    )
  )
}

function recordLinkedModifiers(row: Record<string, unknown>): unknown[] {
  const linked = row.linkedModifiers ?? row.linked_modifiers
  return Array.isArray(linked) ? linked : []
}

/** True when a species row already grants a language modifier (species-wide or per trait). */
export function speciesRowHasLanguageGrant(row: Record<string, unknown>): boolean {
  if (linkedModifiersHaveLanguageGrant(recordLinkedModifiers(row))) return true

  const traits = Array.isArray(row.traits) ? (row.traits as Trait[]) : []
  return traits.some((trait) => {
    const traitRow = trait as unknown as unknown as Record<string, unknown>
    if (
      linkedModifiersHaveLanguageGrant(trait.linkedModifiers) ||
      linkedModifiersHaveLanguageGrant(traitRow.linked_modifiers)
    ) {
      return true
    }
    return (trait.choices?.options ?? []).some((option) => {
      const optionRow = option as unknown as unknown as Record<string, unknown>
      return (
        linkedModifiersHaveLanguageGrant(option.linkedModifiers) ||
        linkedModifiersHaveLanguageGrant(optionRow.linked_modifiers)
      )
    })
  })
}

export function enrichSrdSpeciesList(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(enrichSrdSpeciesRow)
}
