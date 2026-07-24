import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import { applyBundledCardImage } from "@/lib/compendium/card-image"
import {
  lookupSrdSpeciesChoiceOptionPreset,
  speciesRowHasLanguageGrant,
} from "@/lib/compendium/enrich-srd-species"
import { FEAT_MODIFIER_CATALOG } from "@/lib/compendium/enrich-srd-feats"
import { enrichFeatureWithMechanicalDetection } from "@/lib/compendium/enrich-feature-mechanical-detection"
import { syncModifierRefs, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import { SPECIES_CARD_IMAGES_BY_NAME } from "@/lib/compendium/species-card-images-defaults"
import { isSrdSource } from "@/lib/srd/source"
import type { FeatureActivation, Trait, UsesConfig } from "@/lib/types"
import type { Feature } from "@/lib/types"

/**
 * Modifier presets for non-SRD species entered in the compendium (PHB, Eberron, etc.).
 * No stat text is bundled in the public repo — create species rows locally with trait
 * names matching the keys below (`SpeciesName::TraitName`); linked modifiers apply on load.
 */

const CHECK_ROLL_MODIFIER_CATALOG_ID = "cat_fx_check_roll_modifier"
const REST_REPLACEMENT_CATALOG_ID = "cat_char_rest_replacement"
const MAGICAL_SLEEP_IMMUNITY_CATALOG_ID = "cat_char_magical_sleep_immunity"
const CREATURE_SIZE_CATALOG_ID = "cat_char_creature_size"
const MOVEMENT_EFFECTS_CATALOG_ID = "cat_char_movement_effects"
const GAIN_INSPIRATION_CATALOG_ID = "cat_other_gain_inspiration"
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
  return charInstance(`modinst_unarmed_${die}_${damageType}`, FEAT_MODIFIER_CATALOG.unarmedStrikeDamage, [
    {
      id: modId(`unarmed_${die}_${damageType}`),
      type: "unarmed_strike_damage",
      die: die as "1d6",
      damageType,
      ability: "strength",
      label,
    },
  ])
}

function specialNote(description: string, label?: string) {
  return usesPool({ type: "special", specialDescription: description }, label ?? description)
}

function creatureSize(
  size: "Small" | "Medium" | "Large" | "Huge",
  mode: "passive" | "activatable" = "passive",
  label?: string,
) {
  return charInstance(`modinst_size_${size}_${mode}`, CREATURE_SIZE_CATALOG_ID, [
    {
      id: modId(`size_${size}_${mode}`),
      type: "creature_size",
      size,
      mode,
      durationMinutes: null,
      label: label ?? `Size: ${size}`,
    },
  ])
}

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

function cantripOption(spellName: string, label?: string) {
  const key = spellName.replace(/\s+/g, "_").toLowerCase()
  return charInstance(`modinst_cantrip_${key}`, FEAT_MODIFIER_CATALOG.spellsKnown, [
    {
      id: modId(`cantrip_${key}`),
      type: "spells_known",
      spells: [{ spellId: spellName, prepared: true }],
      castingAbility: "intelligence",
      label: label ?? spellName,
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

function nimbleEscape(label = "Nimble Escape") {
  return fxInstance(`modinst_${label.replace(/\s+/g, "_").toLowerCase()}`, FEAT_MODIFIER_CATALOG.movementOption, {
    bonusAction: true,
    effects: [
      {
        id: modId(`${label.replace(/\s+/g, "_").toLowerCase()}`),
        kind: "movement_option",
        movementDisengage: true,
        movementHide: true,
        label,
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

function gainInspiration() {
  return {
    instanceId: "modinst_gain_inspiration",
    catalogRefId: GAIN_INSPIRATION_CATALOG_ID,
    characteristics: [],
  } satisfies LinkedModifierInstance
}

function tranceRest(hours = 4, label = "Trance — long rest") {
  return [
    restReplacement(
      hours,
      label,
      `Finish a long rest in ${hours} hours via trancelike meditation while retaining consciousness.`,
    ),
    magicalSleepNoSleep(`${label} — no sleep / immune to magical sleep`),
  ]
}

function powerfulBuild(label = "Powerful Build") {
  return [
    fxInstance("modinst_powerful_build_grappled", CHECK_ROLL_MODIFIER_CATALOG_ID, {
      effects: [
        {
          id: modId("powerful_build_grappled"),
          kind: "check_roll_modifier",
          checkRollMode: "advantage",
          checkCategory: "ability",
          checkConditionTypes: ["Grappled"],
          label: "Advantage on ability checks to escape a Grapple",
        },
      ],
    }),
    specialNote(
      "Count as one size larger for carrying capacity and the weight you can push, drag, or lift",
      label,
    ),
  ]
}

function sentryRest(label = "Sentry's Rest") {
  return [
    restReplacement(
      6,
      `${label} — 6-hour long rest`,
      "Finish a long rest in 6 hours while inert but conscious.",
    ),
    magicalSleepNoSleep(label),
  ]
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

/**
 * Trait-name presets shared across many WOTC species (Halfling Luck, Trance, etc.).
 * Used when `Species::Trait` has no dedicated entry.
 */
const SHARED_TRAIT_PRESETS: Record<string, TraitPreset> = {
  Trance: { linkedModifiers: tranceRest(4, "Trance") },
  "Astral Trance": {
    linkedModifiers: [
      ...tranceRest(4, "Astral Trance"),
      skillChoice(1, "Astral Trance — skill until next long rest"),
      toolChoice(1, "Astral Trance — weapon or tool until next long rest"),
    ],
  },
  "Sentry's Rest": { linkedModifiers: sentryRest() },
  Sleepless: {
    linkedModifiers: [
      magicalSleepNoSleep("Sleepless — no sleep required"),
      specialNote("Remain conscious through a Long Rest (still avoid strenuous activity)", "Sleepless"),
    ],
  },
  Everlasting: {
    linkedModifiers: [
      ...tranceRest(4, "Everlasting"),
      exhaustionSourceImmunity(
        ["dehydration", "malnutrition", "suffocation"],
        "No Exhaustion from dehydration, malnutrition, or suffocation",
      ),
    ],
  },
  Luck: { linkedModifiers: [checkRollLuck("species_luck")] },
  "Halfling Nimbleness": {
    linkedModifiers: [
      movementEffects({ movementMoveThroughLargerSpaces: true }, "Halfling Nimbleness"),
    ],
  },
  Nimbleness: {
    linkedModifiers: [
      movementEffects({ movementMoveThroughLargerSpaces: true }, "Nimbleness"),
    ],
  },
  "Naturally Stealthy": {
    linkedModifiers: [
      movementEffects({ movementHideBehindLargerCreatures: true }, "Naturally Stealthy"),
    ],
  },
  Resourceful: { linkedModifiers: [gainInspiration()] },
  "Powerful Build": { linkedModifiers: powerfulBuild() },
  "Nimble Escape": { linkedModifiers: [nimbleEscape()] },
  Amphibious: {
    linkedModifiers: [specialNote("You can breathe air and water", "Amphibious")],
  },
  "Limited Amphibiousness": {
    linkedModifiers: [
      specialNote(
        "You can breathe air and water, but must submerge at least once every 4 hours",
        "Limited Amphibiousness",
      ),
    ],
  },
  "Unending Breath": {
    linkedModifiers: [
      specialNote("You can hold your breath indefinitely while you aren't Incapacitated", "Unending Breath"),
    ],
  },
  "Hold Breath": {
    linkedModifiers: [specialNote("You can hold your breath for up to 1 hour", "Hold Breath")],
  },
  "Earth Walk": {
    linkedModifiers: [
      specialNote(
        "You can move across difficult terrain made of earth or stone without spending extra movement",
        "Earth Walk",
      ),
    ],
  },
  "Shape-Shifter": {
    linkedModifiers: [
      specialNote("Magic action: change appearance and voice (Shape-Shifter)", "Shape-Shifter"),
    ],
  },
  Shapechanger: {
    linkedModifiers: [
      specialNote("Action: change appearance and voice (Shapechanger)", "Shapechanger"),
    ],
  },
  "Shape Self": {
    linkedModifiers: [
      specialNote("Action: reshape your body (Shape Self)", "Shape Self"),
    ],
  },
}

const SPECIES_TRAIT_PRESETS: Record<string, TraitPreset> = {
  // —— Dragonborn ——
  "Dragonborn::Damage Resistance": {
    linkedModifiers: [
      specialNote(
        "You have Resistance to the damage type associated with your Draconic Ancestry",
        "Damage Resistance",
      ),
    ],
  },

  // —— Astral Elf ——
  "Astral Elf::Astral Fire": {
    linkedModifiers: [
      specialNote(
        "Know one cantrip: Dancing Lights, Light, or Sacred Flame (chosen spellcasting ability)",
        "Astral Fire",
      ),
    ],
  },

  // —— Reborn ——
  "Reborn::Strange Endurance": {
    linkedModifiers: [
      // Options carry the actual resistance; header marks the pick.
      specialNote("Choose Cold, Necrotic, or Poison resistance", "Strange Endurance"),
    ],
  },

  // —— Aarakocra ——
  "Aarakocra::Talons": {
    linkedModifiers: [
      unarmedStrike("1d6", "Slashing", "Talons: Unarmed Strike 1d6 + STR Slashing"),
    ],
  },

  // —— Autognome ——
  "Autognome::Sentry's Rest": { linkedModifiers: sentryRest("Sentry's Rest") },
  "Autognome::Specialized Design": {
    linkedModifiers: [toolChoice(2, "Specialized Design — two tools")],
  },
  "Autognome::Healing Machine": {
    linkedModifiers: [
      specialNote(
        "If targeted by Mending, may spend a Hit Die to regain HP = roll + CON (min 1); also benefits from listed healing spells despite being a Construct",
        "Healing Machine",
      ),
    ],
  },

  // —— Centaur ——
  "Centaur::Hooves": {
    linkedModifiers: [
      unarmedStrike("1d6", "Bludgeoning", "Hooves: Unarmed Strike 1d6 + STR Bludgeoning"),
    ],
  },
  "Centaur::Charge": {
    linkedModifiers: [
      specialNote(
        "After moving 30+ ft. straight toward a target and hitting with a melee weapon attack, Bonus Action hoof attack vs same target",
        "Charge",
      ),
    ],
  },
  "Centaur::Equine Build": {
    linkedModifiers: [
      specialNote(
        "Count as one size larger for carrying/push/drag/lift; climbing that requires hands and feet costs +4 ft per foot instead of +1",
        "Equine Build",
      ),
    ],
  },

  // —— Gnoll ——
  "Gnoll::Bite": {
    linkedModifiers: [
      unarmedStrike("1d6", "Piercing", "Bite: Unarmed Strike 1d6 + STR Piercing"),
    ],
  },
  "Gnoll::Rampage": {
    linkedModifiers: [
      fxInstance("modinst_gnoll_rampage", FEAT_MODIFIER_CATALOG.movementOption, {
        bonusAction: true,
        effects: [
          {
            id: modId("gnoll_rampage"),
            kind: "movement_option",
            label: "After Bite or reducing a creature to 0 HP: move up to half Speed and make one weapon or Bite attack",
          },
        ],
      }),
    ],
  },

  // —— Bugbear ——
  "Bugbear::Surprise Attack": {
    linkedModifiers: [
      specialNote(
        "Once per creature: extra 2d6 damage on a hit against a creature that hasn't taken a turn yet in combat",
        "Surprise Attack",
      ),
    ],
  },

  // —— Hadozee ——
  "Hadozee::Glide": {
    linkedModifiers: [
      specialNote(
        "When you fall 10+ feet, Reaction: glide horizontally up to your Speed and take no falling damage",
        "Glide",
      ),
    ],
  },
  "Hadozee::Dexterous Feet": {
    linkedModifiers: [
      specialNote(
        "Bonus Action: manipulate an object, open/close a door or container, or pick up/set down a Tiny object with your feet",
        "Dexterous Feet",
      ),
    ],
  },

  // —— Giff ——
  "Giff::Firearms Mastery": {
    linkedModifiers: [
      specialNote(
        "Proficiency with firearms; ignore Loading; no long-range Disadvantage with a firearm",
        "Firearms Mastery",
      ),
    ],
  },

  // —— Githyanki ——
  "Githyanki::Astral Knowledge": {
    linkedModifiers: [
      skillChoice(1, "Astral Knowledge — skill until next long rest"),
      toolChoice(1, "Astral Knowledge — weapon or tool until next long rest"),
    ],
  },

  // —— Lupin ——
  "Lupin::Feral Pounce": {
    linkedModifiers: [
      specialNote(
        "Unarmed strikes deal Slashing damage; once per turn on a hit as part of the Attack action, use both Damage and Shove together",
        "Feral Pounce",
      ),
    ],
  },

  // —— Thri-kreen ——
  "Thri-kreen::Secondary Arms": {
    linkedModifiers: [
      specialNote(
        "Two smaller arms can manipulate objects / open-close / pick up, or wield a Light weapon",
        "Secondary Arms",
      ),
    ],
  },
  "Thri-kreen::Sleepless": {
    linkedModifiers: SHARED_TRAIT_PRESETS.Sleepless.linkedModifiers,
  },

  // —— Dhakaani Guul'dar ——
  "Dhakaani Guul'dar (Bugbear)::Stand by the Strong": {
    linkedModifiers: [
      specialNote(
        "Reaction: an ally within 30 feet who failed a save against Frightened can reroll it",
        "Stand by the Strong",
      ),
    ],
  },
  "Dhakaani Guul'dar (Bugbear)::Powerful Build": { linkedModifiers: powerfulBuild() },

  // —— Lorwyn Changeling ——
  "Lorwyn Changeling::Unpredictable Movement": {
    linkedModifiers: [
      specialNote(
        "On rolling Initiative without Disadvantage, immediately move up to half Speed",
        "Unpredictable Movement",
      ),
    ],
  },

  // —— Plasmoid ——
  "Plasmoid::Amorphous": {
    linkedModifiers: [
      fxInstance("modinst_plasmoid_amorphous", CHECK_ROLL_MODIFIER_CATALOG_ID, {
        effects: [
          {
            id: modId("plasmoid_amorphous"),
            kind: "check_roll_modifier",
            checkRollMode: "advantage",
            checkCategory: "ability",
            checkConditionTypes: ["Grappled"],
            label: "Advantage on ability checks to escape a Grapple",
          },
        ],
      }),
    ],
  },

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
    linkedModifiers: sentryRest("Sentry's Rest"),
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
  "Reborn::Strange Endurance::Cold": {
    linkedModifiers: [damageResistance(["Cold"], "Strange Endurance — Cold")],
  },
  "Reborn::Strange Endurance::Necrotic": {
    linkedModifiers: [damageResistance(["Necrotic"], "Strange Endurance — Necrotic")],
  },
  "Reborn::Strange Endurance::Poison": {
    linkedModifiers: [damageResistance(["Poison"], "Strange Endurance — Poison")],
  },
  "Astral Elf::Astral Fire::Dancing Lights": {
    linkedModifiers: [
      charInstance("modinst_astral_fire_dancing_lights", FEAT_MODIFIER_CATALOG.spellsKnown, [
        {
          id: modId("astral_fire_dancing_lights"),
          type: "spells_known",
          spells: [{ spellId: "Dancing Lights", prepared: true }],
          castingAbility: "intelligence",
          label: "Dancing Lights (Astral Fire)",
        },
      ]),
    ],
  },
  "Astral Elf::Astral Fire::Light": {
    linkedModifiers: [
      charInstance("modinst_astral_fire_light", FEAT_MODIFIER_CATALOG.spellsKnown, [
        {
          id: modId("astral_fire_light"),
          type: "spells_known",
          spells: [{ spellId: "Light", prepared: true }],
          castingAbility: "intelligence",
          label: "Light (Astral Fire)",
        },
      ]),
    ],
  },
  "Astral Elf::Astral Fire::Sacred Flame": {
    linkedModifiers: [
      charInstance("modinst_astral_fire_sacred_flame", FEAT_MODIFIER_CATALOG.spellsKnown, [
        {
          id: modId("astral_fire_sacred_flame"),
          type: "spells_known",
          spells: [{ spellId: "Sacred Flame", prepared: true }],
          castingAbility: "intelligence",
          label: "Sacred Flame (Astral Fire)",
        },
      ]),
    ],
  },
  "Kalamer Landwalker (Merfolk)::Blessing of the Sea::Merfolk Form": {
    linkedModifiers: [
      specialNote("Swim 40 ft., walk 10 ft. while in Merfolk Form", "Merfolk Form"),
    ],
  },
  "Kalamer Landwalker (Merfolk)::Blessing of the Sea::Landwalker Form": {
    linkedModifiers: [
      specialNote("Walk Speed +20 ft., Swim Speed 0 while in Landwalker Form", "Landwalker Form"),
    ],
  },

  // —— Elf (Lorwyn / Shadowmoor lineages) ——
  "Elf::Elven Lineage::Lorwyn Elf": {
    linkedModifiers: [
      spellcastingAbilityChoice("lorwyn_elf_lineage_ability"),
      spellsKnownFixed(
        "lorwyn_elf_spells",
        [
          { name: "Thorn Whip", unlocksAtLevel: 1 },
          { name: "Command", unlocksAtLevel: 3 },
          { name: "Silence", unlocksAtLevel: 5 },
        ],
        "Lorwyn Elf lineage spells",
      ),
    ],
  },
  "Elf::Elven Lineage::Shadowmoor Elf": {
    linkedModifiers: [
      vision(120, "darkvision", "Shadowmoor Elf darkvision 120 ft."),
      spellcastingAbilityChoice("shadowmoor_elf_lineage_ability"),
      spellsKnownFixed(
        "shadowmoor_elf_spells",
        [
          { name: "Starry Wisp", unlocksAtLevel: 1 },
          { name: "Heroism", unlocksAtLevel: 3 },
          { name: "Gentle Repose", unlocksAtLevel: 5 },
        ],
        "Shadowmoor Elf lineage spells",
      ),
    ],
  },

  // —— Eladrin Fey Step seasons ——
  "Eladrin::Fey Step::Autumn": {
    linkedModifiers: [
      specialNote(
        "Up to two creatures within 10 ft. save or are Charmed for 1 minute or until damaged",
        "Fey Step (Autumn)",
      ),
    ],
  },
  "Eladrin::Fey Step::Winter": {
    linkedModifiers: [
      specialNote(
        "One creature within 5 ft. (before teleporting) saves or is Frightened until end of your next turn",
        "Fey Step (Winter)",
      ),
    ],
  },
  "Eladrin::Fey Step::Spring": {
    linkedModifiers: [
      specialNote(
        "Touch a willing creature within 5 ft. to teleport it instead of you",
        "Fey Step (Spring)",
      ),
    ],
  },
  "Eladrin::Fey Step::Summer": {
    linkedModifiers: [
      specialNote(
        "Creatures within 5 ft. take Fire damage equal to your Proficiency Bonus",
        "Fey Step (Summer)",
      ),
    ],
  },

  // —— Dhampir Vampiric Bite empower choices ——
  "Dhampir::Vampiric Bite::Drain": {
    linkedModifiers: [
      specialNote("Regain HP equal to the Piercing damage dealt by the bite", "Vampiric Bite — Drain"),
    ],
  },
  "Dhampir::Vampiric Bite::Strengthen": {
    linkedModifiers: [
      specialNote(
        "Bonus equal to the bite damage on your next ability check or attack roll within 1 minute",
        "Vampiric Bite — Strengthen",
      ),
    ],
  },

  // —— Aasimar 2014 revelation names (aliases of 2024 options) ——
  "Aasimar::Celestial Revelation::Radiant Soul": {
    linkedModifiers: [speedFlyEqualWalk("Radiant Soul — fly speed equal to Speed")],
  },
  "Aasimar::Celestial Revelation::Radiant Consumption": {
    linkedModifiers: [
      charInstance("modinst_radiant_consumption_aura", AURA_CATALOG_ID, [
        {
          id: modId("radiant_consumption_aura"),
          type: "aura",
          radiusFeet: 10,
          affectsSelf: true,
          affectsAllies: false,
          label: "Bright Light 10 ft., Dim Light 10 ft. beyond",
        },
      ]),
      charInstance("modinst_radiant_consumption_damage", TURN_START_TRIGGER_CATALOG_ID, [
        {
          id: modId("radiant_consumption_damage"),
          type: "turn_start_trigger",
          effect: {
            catalogRefId: EXTRA_DAMAGE_ON_HIT_CATALOG_ID,
            activation: {
              effects: [
                {
                  id: modId("radiant_consumption_damage_fx"),
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

  ...Object.fromEntries(
    [
      "Acid Splash",
      "Guidance",
      "Light",
      "Mage Hand",
      "Mind Sliver",
      "Poison Spray",
      "Resistance",
      "Shocking Grasp",
      "Thorn Whip",
    ].map((spell) => [
      `Ruinbound::Personal Symbiont::${spell}`,
      { linkedModifiers: [cantripOption(spell, `Personal Symbiont — ${spell}`)] },
    ]),
  ),

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
            saveDCConfig: { mode: "proficiency", ability: "CHA" },
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
  const aliases = speciesNameAliases(speciesName)
  return (
    aliases.some((alias) => {
      const prefix = `${alias}::`
      return (
        Object.keys(SPECIES_TRAIT_PRESETS).some((key) => key.startsWith(prefix)) ||
        Object.keys(SPECIES_CHOICE_OPTION_PRESETS).some((key) => key.startsWith(prefix))
      )
    }) || Object.keys(SHARED_TRAIT_PRESETS).length > 0
  )
}

function speciesNameAliases(speciesName: string): string[] {
  const aliases = [speciesName]
  const stripped = speciesName.replace(/\s*\([^)]*\)\s*$/u, "").trim()
  if (stripped && stripped !== speciesName) aliases.push(stripped)
  return aliases
}

function lookupTraitPreset(speciesName: string, traitName: string): TraitPreset | undefined {
  for (const alias of speciesNameAliases(speciesName)) {
    const key = `${alias}::${traitName}`
    if (SPECIES_TRAIT_PRESETS[key]) return SPECIES_TRAIT_PRESETS[key]
  }
  return SHARED_TRAIT_PRESETS[traitName]
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

function lookupChoiceOptionPreset(
  speciesName: string,
  traitName: string,
  optionName: string,
): TraitPreset | undefined {
  for (const alias of speciesNameAliases(speciesName)) {
    const key = `${alias}::${traitName}::${optionName}`
    if (SPECIES_CHOICE_OPTION_PRESETS[key]) return SPECIES_CHOICE_OPTION_PRESETS[key]
  }

  // Size Medium/Small — shared across species that offer a size pick.
  if (traitName === "Size" && (optionName === "Medium" || optionName === "Small")) {
    return {
      linkedModifiers: [creatureSize(optionName, "passive", `Size: ${optionName}`)],
    }
  }

  return lookupSrdSpeciesChoiceOptionPreset(speciesName, traitName, optionName)
}

function sizeOptionsFromTraits(traits: Trait[]): string[] | undefined {
  const sizeTrait = traits.find((trait) => trait.name === "Size")
  const names = (sizeTrait?.choices?.options ?? [])
    .map((option) => option.name?.trim())
    .filter((name): name is "Small" | "Medium" => name === "Small" || name === "Medium")
  if (!names.length) return undefined
  return (["Small", "Medium"] as const).filter((size) => names.includes(size))
}

function applyPresetToTrait(speciesName: string, trait: Trait): Trait {
  const preset = lookupTraitPreset(speciesName, trait.name)
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
          const optionPreset = lookupChoiceOptionPreset(
            speciesName,
            trait.name ?? "",
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

function withSpeciesCardImage(row: Record<string, unknown>): Record<string, unknown> {
  return applyBundledCardImage(row, SPECIES_CARD_IMAGES_BY_NAME)
}

/** Apply non-SRD species modifier presets when the species name matches the registry. */
export function enrichCustomSpeciesRow(row: Record<string, unknown>): Record<string, unknown> {
  if (isSrdSource(row.source as string | null | undefined)) return row
  const speciesName = String(row.name ?? "")

  const traits = Array.isArray(row.traits) ? (row.traits as Trait[]) : []
  let next = { ...row }

  const sizeFromRegistry = speciesNameAliases(speciesName).find((alias) => SPECIES_SIZE_OPTIONS[alias])
  const sizeOptions =
    (sizeFromRegistry ? SPECIES_SIZE_OPTIONS[sizeFromRegistry] : undefined) ??
    sizeOptionsFromTraits(traits)
  if (sizeOptions && !Array.isArray(next.size_options)) {
    next = { ...next, size_options: sizeOptions }
  }

  if (
    (SPECIES_WITH_STANDARD_LANGUAGES.has(speciesName) ||
      speciesNameAliases(speciesName).some((alias) => SPECIES_WITH_STANDARD_LANGUAGES.has(alias))) &&
    !speciesRowHasLanguageGrant(next)
  ) {
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

  if (!traits.length) return withSpeciesCardImage(next)

  const enrichedTraits = traits.map((trait) => applyPresetToTrait(speciesName, trait))
  return withSpeciesCardImage({ ...next, traits: enrichedTraits })
}

/** @deprecated Use enrichCustomSpeciesRow */
export const enrichPhbSpeciesRow = enrichCustomSpeciesRow
