import { describe, expect, it } from "vitest"

import {
  classifySpellUsage,
  filterSpellsBySchool,
  filterSpellsByUsage,
  uniqueSpellSchools,
} from "@/lib/builder/spell-grant-filters"

const SPELLS = [
  { name: "Alarm", school: "Abjuration" },
  { name: "Animal Friendship", school: "Enchantment" },
  { name: "Ballistic Smite", school: "Evocation" },
  { name: "Blank", school: "  " },
  { name: "Unknown", school: null },
  { name: "Ward", school: "Abjuration" },
]

describe("uniqueSpellSchools", () => {
  it("returns sorted unique schools and skips blanks", () => {
    expect(uniqueSpellSchools(SPELLS)).toEqual(["Abjuration", "Enchantment", "Evocation"])
  })
})

describe("filterSpellsBySchool", () => {
  it("leaves the list intact when the filter is all", () => {
    expect(filterSpellsBySchool(SPELLS, "all")).toEqual(SPELLS)
  })

  it("keeps only the chosen school", () => {
    expect(filterSpellsBySchool(SPELLS, "Abjuration").map((spell) => spell.name)).toEqual([
      "Alarm",
      "Ward",
    ])
  })
})

describe("classifySpellUsage", () => {
  it("tags spell attacks and forced saves as attack / saving throw", () => {
    expect(
      classifySpellUsage({
        description: "Make a ranged spell attack against the target. On a hit, the target takes 1d10 Fire damage.",
      }),
    ).toEqual(["attack_save"])
    expect(
      classifySpellUsage({
        description: "The target must succeed on a Dexterity saving throw or take 1d8 Radiant damage.",
      }),
    ).toEqual(["attack_save"])
  })

  it("does not treat Bless-style roll bonuses as an offensive save", () => {
    expect(
      classifySpellUsage({
        description:
          "You bless up to three creatures within range. Whenever a target makes an attack roll or a saving throw, the target adds 1d4 to the attack roll or save.",
      }),
    ).toEqual(["ally_support"])
  })

  it("tags healing and willing-creature buffs as ally support", () => {
    expect(
      classifySpellUsage({
        description: "A creature you touch regains a number of Hit Points equal to 2d8 plus your spellcasting ability modifier.",
      }),
    ).toEqual(["ally_support"])
    expect(
      classifySpellUsage({
        description: "You touch a willing creature and choose a skill. The creature adds 1d4 to any ability check using the chosen skill.",
      }),
    ).toEqual(["ally_support"])
  })

  it("tags self wards as defense and Sanctuary as defense plus support", () => {
    expect(
      classifySpellUsage({
        description:
          "An imperceptible barrier of magical force protects you. You have a +5 bonus to AC, including against the triggering attack, and you take no damage from Magic Missile.",
      }),
    ).toEqual(["defense"])
    expect(
      classifySpellUsage({
        description:
          "You ward a creature within range. Any creature who targets the warded creature with an attack roll must succeed on a Wisdom saving throw or choose a new target.",
      }),
    ).toEqual(["ally_support", "defense"])
  })

  it("tags battlefield lockdown as control, including save-based control", () => {
    expect(
      classifySpellUsage({
        description: "The webs fill a 20-foot Cube. The webs are Difficult Terrain, and the area is Lightly Obscured.",
      }),
    ).toEqual(["control"])
    expect(
      classifySpellUsage({
        description:
          "The target must succeed on a Wisdom saving throw or have the Paralyzed condition for the duration.",
      }),
    ).toEqual(["attack_save", "control"])
  })

  it("falls back to utility for detection, travel, and toolbox cantrips", () => {
    expect(
      classifySpellUsage({
        description: "For the duration, you sense the presence of magical effects within 30 feet of yourself.",
      }),
    ).toEqual(["utility"])
    expect(
      classifySpellUsage({
        description: "Briefly surrounded by silvery mist, you teleport up to 30 feet to an unoccupied space you can see.",
      }),
    ).toEqual(["utility"])
  })
})

describe("filterSpellsByUsage", () => {
  const mixed = [
    { name: "Fire Bolt", description: "Make a ranged spell attack. On a hit, the target takes 1d10 Fire damage." },
    { name: "Cure Wounds", description: "A creature you touch regains Hit Points equal to 2d8." },
    { name: "Detect Magic", description: "You sense the presence of magical effects within 30 feet." },
  ]

  it("leaves the list intact when the filter is all", () => {
    expect(filterSpellsByUsage(mixed, "all")).toEqual(mixed)
  })

  it("keeps spells that include the chosen use", () => {
    expect(filterSpellsByUsage(mixed, "attack_save").map((spell) => spell.name)).toEqual(["Fire Bolt"])
    expect(filterSpellsByUsage(mixed, "ally_support").map((spell) => spell.name)).toEqual(["Cure Wounds"])
    expect(filterSpellsByUsage(mixed, "utility").map((spell) => spell.name)).toEqual(["Detect Magic"])
  })
})
