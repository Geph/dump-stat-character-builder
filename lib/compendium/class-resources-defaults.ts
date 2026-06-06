import type { ClassResource } from "@/lib/types"

const LONG_REST = [{ rest: "long_rest" as const }]
const SHORT_REST = [{ rest: "short_rest" as const }]
const SHORT_OR_LONG_REST = [{ rest: "short_rest" as const }, { rest: "long_rest" as const }]

/** Default class resource pools for SRD classes (2024 rules). */
export const SRD_CLASS_RESOURCES_BY_NAME: Record<string, ClassResource[]> = {
  Barbarian: [
    {
      id: "rage",
      name: "Rage",
      description: "2 uses at level 1, scaling to 5 at level 17. Recharges on a long rest (extra uses on short rest at higher levels).",
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
      description: "Uses equal to Charisma modifier (minimum 1). Recharges on a long rest.",
      uses: { type: "ability_modifier", abilityModifier: "CHA", recharges: LONG_REST },
    },
  ],
  Cleric: [
    {
      id: "channel_divinity",
      name: "Channel Divinity",
      description: "2 uses at level 2, 3 at level 6, 4 at level 18. Recharges on a short or long rest.",
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
  ],
  Druid: [
    {
      id: "wild_shape",
      name: "Wild Shape",
      description: "2 uses at level 2, 3 at level 4, 4 at level 10. Recharges on a long rest.",
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
  ],
  Fighter: [
    {
      id: "second_wind",
      name: "Second Wind",
      description: "2 uses per short rest (2024).",
      uses: { type: "fixed", fixedAmount: 2, recharges: SHORT_REST },
    },
    {
      id: "action_surge",
      name: "Action Surge",
      description: "1 use at level 2, 2 uses at level 17. Recharges on a short rest.",
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
      description: "1 use at level 9, 2 at level 13, 3 at level 17. Recharges on a long rest.",
      uses: {
        type: "at_level",
        atLevelMode: "tier",
        recharges: LONG_REST,
        atLevelTable: [
          { level: 9, count: 1 },
          { level: 13, count: 2 },
          { level: 17, count: 3 },
        ],
      },
    },
  ],
  Monk: [
    {
      id: "focus_points",
      name: "Focus Points",
      description: "Pool equal to Monk level. Recharges on a short or long rest.",
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
      description: "2 uses per short or long rest.",
      uses: { type: "fixed", fixedAmount: 2, recharges: SHORT_OR_LONG_REST },
    },
    {
      id: "lay_on_hands",
      name: "Lay on Hands",
      description: "Healing pool equal to 5 × Paladin level. Recharges on a long rest.",
      uses: {
        type: "at_level",
        atLevelMode: "multiply_level",
        recharges: LONG_REST,
        atLevelTable: [{ level: 1, count: 5 }],
      },
    },
  ],
  Sorcerer: [
    {
      id: "sorcery_points",
      name: "Sorcery Points",
      description: "Pool equal to Sorcerer level. Recharges on a long rest (Font of Magic).",
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
      description: "2 uses per long rest while the Innate Sorcery feature is active.",
      uses: { type: "fixed", fixedAmount: 2, recharges: LONG_REST },
    },
  ],
  Warlock: [
    {
      id: "pact_magic_slots",
      name: "Pact Magic Slots",
      description: "Pact spell slots per SRD table (1 at level 1, 2 at levels 2–10, 3 at 11–16, 4 at 17–20). Recharges on a short or long rest.",
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
  Wizard: [
    {
      id: "arcane_recovery",
      name: "Arcane Recovery",
      description: "Once per day on a short rest.",
      uses: { type: "fixed", fixedAmount: 1, recharges: SHORT_REST },
    },
  ],
}
