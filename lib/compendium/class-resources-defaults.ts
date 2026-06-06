import type { ClassResource } from "@/lib/types"

/** Default class resource pools for SRD classes (2024 rules). */
export const SRD_CLASS_RESOURCES_BY_NAME: Record<string, ClassResource[]> = {
  Barbarian: [
    {
      id: "rage",
      name: "Rage",
      description: "Rages per long rest; higher levels recover uses on a short rest.",
      uses: {
        type: "at_level",
        recharge: "long_rest",
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
      description: "Uses equal to Charisma modifier; die size grows with level.",
      uses: { type: "ability_modifier", abilityModifier: "CHA", recharge: "long_rest" },
    },
  ],
  Cleric: [
    {
      id: "channel_divinity",
      name: "Channel Divinity",
      description: "Recharges on a short or long rest.",
      uses: {
        type: "at_level",
        recharge: "short_rest",
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
      description: "Wild Shape charges; also fuel some subclass features in 2024.",
      uses: {
        type: "at_level",
        recharge: "long_rest",
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
      description: "Self-heal uses per short rest.",
      uses: { type: "fixed", fixedAmount: 2, recharge: "short_rest" },
    },
    {
      id: "action_surge",
      name: "Action Surge",
      description: "Extra action uses per short rest.",
      uses: {
        type: "at_level",
        recharge: "short_rest",
        atLevelTable: [
          { level: 2, count: 1 },
          { level: 17, count: 2 },
        ],
      },
    },
    {
      id: "indomitable",
      name: "Indomitable",
      description: "Reroll a failed save.",
      uses: {
        type: "at_level",
        recharge: "long_rest",
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
      description: "Equal to Monk level; recharge on short or long rest.",
      uses: { type: "at_level", recharge: "short_rest", atLevelTable: [{ level: 1, count: 1 }] },
    },
  ],
  Paladin: [
    {
      id: "channel_divinity",
      name: "Channel Divinity",
      description: "Recharges on a short or long rest.",
      uses: { type: "fixed", fixedAmount: 2, recharge: "short_rest" },
    },
    {
      id: "lay_on_hands",
      name: "Lay on Hands",
      description: "Healing pool equal to 5 × Paladin level; refreshes on a long rest.",
      uses: { type: "at_level", recharge: "long_rest", atLevelTable: [{ level: 1, count: 5 }] },
    },
  ],
  Sorcerer: [
    {
      id: "sorcery_points",
      name: "Sorcery Points",
      description: "Fuel Metamagic and spell slot conversion.",
      uses: { type: "at_level", recharge: "long_rest", atLevelTable: [{ level: 1, count: 1 }] },
    },
    {
      id: "innate_sorcery",
      name: "Innate Sorcery",
      description: "Limited uses of enhanced spellcasting.",
      uses: { type: "at_level", recharge: "long_rest", atLevelTable: [{ level: 1, count: 2 }] },
    },
  ],
  Warlock: [
    {
      id: "pact_magic_slots",
      name: "Pact Magic Slots",
      description: "Small number of slots that recharge on a short rest.",
      uses: { type: "at_level", recharge: "short_rest", atLevelTable: [{ level: 1, count: 1 }] },
    },
  ],
  Wizard: [
    {
      id: "arcane_recovery",
      name: "Arcane Recovery",
      description: "Recover spell slots once per day on a short rest.",
      uses: { type: "fixed", fixedAmount: 1, recharge: "long_rest" },
    },
  ],
}
