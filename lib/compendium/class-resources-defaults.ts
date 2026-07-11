import type { ClassResource } from "@/lib/types"
import { spellSlotResourceUsesForCasterType } from "@/lib/compendium/spell-slots"

const LONG_REST = [{ rest: "long_rest" as const }]
const SHORT_REST = [{ rest: "short_rest" as const }]
const SHORT_OR_LONG_REST = [{ rest: "short_rest" as const }, { rest: "long_rest" as const }]

const CHANNEL_DIVINITY_DESCRIPTION =
  "Spent when you use Channel Divinity or a feature that requires it. Cleric options include Preserve Life and Turn Undead; Paladin options include Sacred Weapon and similar oath features. Recharges on a short or long rest."

const SPELL_SLOTS_FULL: ClassResource = {
  id: "spell_slots",
  name: "Spell Slots",
  description:
    "Spell slots per long rest at each character level follow standard full-caster progression (1st–9th level slots per the class table).",
  uses: spellSlotResourceUsesForCasterType("full"),
}

const SPELL_SLOTS_HALF: ClassResource = {
  id: "spell_slots",
  name: "Spell Slots",
  description:
    "Spell slots per long rest follow half-caster progression (slots begin at class level 2).",
  uses: spellSlotResourceUsesForCasterType("half"),
}

/** Default class resource pools for SRD classes (2024 rules). */
export const SRD_CLASS_RESOURCES_BY_NAME: Record<string, ClassResource[]> = {
  Barbarian: [
    {
      id: "rage",
      name: "Rage",
      description:
        "Spent when you use the Rage feature (Bonus Action) to enter a Rage for 1 minute. While raging: resistance to Bludgeoning, Piercing, and Slashing; bonus damage on Strength attacks; advantage on Strength checks and saves. 2 uses at level 1, scaling to 5 at level 17. Recharges on a long rest.",
      uses: {
        type: "at_level",
        atLevelMode: "tier",
        recharges: LONG_REST,
        atLevelTable: [
          { level: 1, count: 2 },
          { level: 6, count: 3 },
          { level: 12, count: 4 },
          { level: 17, count: 5 },
        ],
      },
    },
  ],
  Bard: [
    {
      id: "bardic_inspiration",
      name: "Bardic Inspiration",
      description:
        "Spent when you grant Bardic Inspiration to a creature (Bonus Action). The target can add your die to one ability check, attack roll, or saving throw. Uses equal to Charisma modifier (minimum 1). Recharges on a long rest.",
      uses: { type: "ability_modifier", abilityModifier: "CHA", recharges: LONG_REST },
    },
    SPELL_SLOTS_FULL,
  ],
  Cleric: [
    {
      id: "channel_divinity",
      name: "Channel Divinity",
      description: CHANNEL_DIVINITY_DESCRIPTION,
      uses: {
        type: "at_level",
        atLevelMode: "tier",
        recharges: SHORT_OR_LONG_REST,
        atLevelTable: [
          { level: 2, count: 2 },
          { level: 6, count: 3 },
          { level: 18, count: 4 },
        ],
      },
    },
    SPELL_SLOTS_FULL,
  ],
  Druid: [
    {
      id: "wild_shape",
      name: "Wild Shape",
      description:
        "Spent when you use Wild Shape (Bonus Action) to assume a Beast form. 2 uses at level 2, 3 at level 4, 4 at level 10. Recharges on a long rest.",
      uses: {
        type: "at_level",
        atLevelMode: "tier",
        recharges: LONG_REST,
        atLevelTable: [
          { level: 2, count: 2 },
          { level: 4, count: 3 },
          { level: 10, count: 4 },
        ],
      },
    },
    SPELL_SLOTS_FULL,
  ],
  Fighter: [
    {
      id: "second_wind",
      name: "Second Wind",
      description:
        "Spent when you use Second Wind (Bonus Action) to regain Hit Points (1d10 + Fighter level). 2 uses per short rest.",
      uses: { type: "fixed", fixedAmount: 2, recharges: SHORT_REST },
    },
    {
      id: "action_surge",
      name: "Action Surge",
      description:
        "Spent when you use Action Surge to take one additional Action on your turn. 1 use at level 2, 2 uses at level 17. Recharges on a short rest.",
      uses: {
        type: "at_level",
        atLevelMode: "tier",
        recharges: SHORT_REST,
        atLevelTable: [
          { level: 2, count: 1 },
          { level: 17, count: 2 },
        ],
      },
    },
    {
      id: "indomitable",
      name: "Indomitable",
      description:
        "Spent when you use Indomitable to turn a failed saving throw into a success. 1 use at 9th level, 2 at 13th, 3 at 17th. Recharges on a long rest.",
      uses: {
        type: "at_level",
        atLevelMode: "tier",
        recharges: [{ rest: "long_rest" }],
        atLevelTable: [
          { level: 9, count: 1 },
          { level: 13, count: 2 },
          { level: 17, count: 3 },
        ],
      },
    },
    {
      id: "superiority_dice",
      name: "Superiority Dice",
      description:
        "Spent when you use a Battle Master maneuver. Four d8s at level 3, five at level 7, six at level 15. Die becomes d10 at level 10 and d12 at level 18. Recharges on a short or long rest.",
      uses: {
        type: "at_level",
        atLevelMode: "tier",
        dieType: "d8",
        recharges: SHORT_OR_LONG_REST,
        atLevelTable: [
          { level: 3, count: 4 },
          { level: 7, count: 5 },
          { level: 15, count: 6 },
        ],
      },
    },
    {
      id: "psionic_energy_dice",
      name: "Psionic Energy Dice",
      description:
        "Spent on Psi Warrior powers (Protective Field, Psionic Strike, Telekinetic Movement, and similar). Pool size and die size scale by Fighter level. Regain one die on a short rest and all dice on a long rest.",
      uses: {
        type: "at_level",
        atLevelMode: "tier",
        dieType: "d6",
        recharges: [
          { rest: "short_rest", amount: 1 },
          { rest: "long_rest" },
        ],
        atLevelTable: [
          { level: 3, count: 4 },
          { level: 5, count: 6 },
          { level: 9, count: 8 },
          { level: 11, count: 8 },
          { level: 13, count: 10 },
          { level: 17, count: 12 },
        ],
      },
    },
  ],
  Monk: [
    {
      id: "focus_points",
      name: "Focus Points",
      description:
        "Spent on Monk's Focus techniques (Flurry of Blows, Patient Defense, Step of the Wind, and similar Focus features). Pool equal to Monk level. Recharges on a short or long rest.",
      uses: {
        type: "at_level",
        atLevelMode: "multiply_level",
        recharges: SHORT_OR_LONG_REST,
        atLevelTable: [{ level: 1, count: 1 }],
      },
    },
  ],
  Paladin: [
    {
      id: "channel_divinity",
      name: "Channel Divinity",
      description: CHANNEL_DIVINITY_DESCRIPTION,
      uses: { type: "fixed", fixedAmount: 2, recharges: SHORT_OR_LONG_REST },
    },
    {
      id: "lay_on_hands",
      name: "Lay on Hands",
      description:
        "Healing pool for Lay On Hands — spend points to restore Hit Points or end poison/disease. Pool equal to 5 × Paladin level. Recharges on a long rest.",
      uses: {
        type: "at_level",
        atLevelMode: "multiply_level",
        recharges: LONG_REST,
        atLevelTable: [{ level: 1, count: 5 }],
      },
    },
    SPELL_SLOTS_HALF,
  ],
  Ranger: [
    SPELL_SLOTS_HALF,
  ],
  Rogue: [
    {
      id: "psionic_energy_dice",
      name: "Psionic Energy Dice",
      description:
        "Spent on Soulknife psionic powers (Psi-Bolstered Knack, Psychic Whispers, Homing Strikes, and similar). Pool size and die size scale by Rogue level. Regain one die on a short rest and all dice on a long rest.",
      uses: {
        type: "at_level",
        atLevelMode: "tier",
        dieType: "d6",
        recharges: [
          { rest: "short_rest", amount: 1 },
          { rest: "long_rest" },
        ],
        atLevelTable: [
          { level: 3, count: 4 },
          { level: 5, count: 6 },
          { level: 9, count: 8 },
          { level: 11, count: 8 },
          { level: 13, count: 10 },
          { level: 17, count: 12 },
        ],
      },
    },
  ],
  Sorcerer: [
    {
      id: "sorcery_points",
      name: "Sorcery Points",
      description:
        "Spent on Metamagic and Font of Magic options (convert spell slots, create slots, enhance spells). Pool equal to Sorcerer level. Recharges on a long rest.",
      uses: {
        type: "at_level",
        atLevelMode: "multiply_level",
        recharges: LONG_REST,
        atLevelTable: [{ level: 1, count: 1 }],
      },
    },
    {
      id: "innate_sorcery",
      name: "Innate Sorcery",
      description:
        "Spent when you activate Innate Sorcery (Bonus Action) for 1 minute of enhanced spellcasting. 2 uses per long rest.",
      uses: { type: "fixed", fixedAmount: 2, recharges: LONG_REST },
    },
    SPELL_SLOTS_FULL,
  ],
  Warlock: [
    {
      id: "pact_magic_slots",
      name: "Pact Magic Slots",
      description:
        "Pact Magic spell slots — all slots are the same level and recharge on a short or long rest. 1 slot at level 1, 2 at levels 2–10, 3 at 11–16, 4 at 17–20.",
      uses: {
        type: "at_level",
        atLevelMode: "tier",
        recharges: SHORT_OR_LONG_REST,
        atLevelTable: [
          { level: 1, count: 1 },
          { level: 2, count: 2 },
          { level: 11, count: 3 },
          { level: 17, count: 4 },
        ],
      },
    },
  ],
  Wizard: [SPELL_SLOTS_FULL],
  Artificer: [SPELL_SLOTS_HALF],
}
