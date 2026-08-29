import { describe, expect, it } from "vitest"
import { collectAsiPoolsFromFeat } from "@/lib/character/feat-asi-pools"
import {
  averageHpGain,
  buildLevelUpStandardizedNotes,
  collectFeatureScalingImprovements,
  collectSpeciesScalingImprovements,
  collectSpeciesTraitsGainedAtLevel,
  proficiencyBonusAtLevel,
  rolledHpGain,
} from "@/lib/character/level-up-improvements"
import { buildLevelUpPlan } from "@/lib/character/level-up-plan"
import { asiPool } from "@/lib/compendium/feat-modifier-presets"
import { enrichSrdSpeciesRow } from "@/lib/compendium/enrich-srd-species"
import { SRD_SOURCE } from "@/lib/srd/source"
import bundledSpecies from "@/lib/srd/seed-data/species.json"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import type { DndClass, Feat, Feature, Species } from "@/lib/types"

describe("level-up improvements", () => {
  it("computes proficiency bonus by total level", () => {
    expect([1, 4, 5, 8, 9, 12, 13, 16, 17, 20].map(proficiencyBonusAtLevel)).toEqual([
      2, 2, 3, 3, 4, 4, 5, 5, 6, 6,
    ])
  })

  it("notes proficiency bonus increases at the right levels", () => {
    expect(buildLevelUpStandardizedNotes({ fromTotalLevel: 4, toTotalLevel: 5 })).toEqual([
      expect.objectContaining({
        id: "proficiency_bonus",
        detail: "Increases from +2 to +3.",
      }),
    ])
    expect(buildLevelUpStandardizedNotes({ fromTotalLevel: 3, toTotalLevel: 4 })).toEqual([])
  })

  it("computes average and rolled HP gains", () => {
    expect(averageHpGain(10, 2)).toBe(8)
    expect(rolledHpGain(10, 2, 1)).toBe(3)
    expect(rolledHpGain(10, -2, 1)).toBe(1)
  })

  it("explains Critical Shot crit-range improvements at levels 9 and 17", () => {
    const criticalShot = {
      name: "Critical Shot",
      level: 2,
      description: "",
      linkedModifiers: [
        {
          instanceId: "crit",
          catalogRefId: "cat_char_attack_roll_modifiers",
          characteristics: [
            {
              id: "mod_crit",
              type: "attack_roll_modifiers",
              entries: [
                {
                  bonus: 0,
                  target: "ranged",
                  criticalHitMinimum: 19,
                  criticalHitMinimumByLevel: [
                    { level: 9, mode: "fixed", fixed: 18 },
                    { level: 17, mode: "fixed", fixed: 17 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    } as Feature

    expect(collectFeatureScalingImprovements([criticalShot], 8, 9, "class")).toEqual([
      expect.objectContaining({
        name: "Critical Shot",
        detail: "Critical hits with ranged weapons improve from 19–20 to 18–20.",
      }),
    ])
    expect(collectFeatureScalingImprovements([criticalShot], 16, 17, "class")).toEqual([
      expect.objectContaining({
        name: "Critical Shot",
        detail: "Critical hits with ranged weapons improve from 18–20 to 17–20.",
      }),
    ])
    expect(collectFeatureScalingImprovements([criticalShot], 7, 8, "class")).toEqual([])
  })

  it("shows catalog spell names instead of import slugs and UUIDs", () => {
    const revolutionSpells = {
      name: "Revolution Spells",
      level: 3,
      description: "",
      linkedModifiers: [
        {
          instanceId: "table",
          catalogRefId: "cat_char_spells_known",
          characteristics: [
            {
              id: "mod_table",
              type: "spells_known",
              alwaysPrepared: true,
              spells: [
                { spellId: "import:hold person", alwaysPrepared: true, unlocksAtClassLevel: 5 },
                { spellId: "import:magic weapon", alwaysPrepared: true, unlocksAtClassLevel: 5 },
                {
                  spellId: "91a77aa3-a4c7-4bea-9da0-5bcb01f95496",
                  alwaysPrepared: true,
                  unlocksAtClassLevel: 5,
                },
                {
                  spellId: "d52b1f22-503e-416b-a310-d79d76d6c002",
                  alwaysPrepared: true,
                  unlocksAtClassLevel: 5,
                },
              ],
            },
          ],
        },
        {
          instanceId: "prose",
          catalogRefId: "cat_char_spells_known",
          characteristics: [
            {
              id: "mod_prose",
              type: "spells_known",
              alwaysPrepared: true,
              spells: [
                {
                  spellId: "91a77aa3-a4c7-4bea-9da0-5bcb01f95496",
                  alwaysPrepared: true,
                  unlocksAtClassLevel: 5,
                },
                {
                  spellId: "d52b1f22-503e-416b-a310-d79d76d6c002",
                  alwaysPrepared: true,
                  unlocksAtClassLevel: 5,
                },
              ],
            },
          ],
        },
      ],
    } as Feature

    expect(
      collectFeatureScalingImprovements([revolutionSpells], 4, 5, "subclass", [
        { id: "srd-hold", name: "Hold Person", source: "SRD" },
        { id: "srd-magic", name: "Magic Weapon", source: "SRD" },
        { id: "91a77aa3-a4c7-4bea-9da0-5bcb01f95496", name: "Crippling Agony", source: "MHP" },
        { id: "d52b1f22-503e-416b-a310-d79d76d6c002", name: "Divine Wrath", source: "MHP" },
      ]),
    ).toEqual([
      expect.objectContaining({
        name: "Revolution Spells",
        detail:
          "You gain Hold Person, Magic Weapon, Crippling Agony, and Divine Wrath (always prepared).",
      }),
    ])
  })

  it("title-cases import slugs and drops unresolved UUIDs at Revolution 9", () => {
    const revolutionSpells = {
      name: "Burden of Revolution Spells",
      level: 3,
      description: "",
      linkedModifiers: [
        {
          instanceId: "table",
          catalogRefId: "cat_char_spells_known",
          characteristics: [
            {
              id: "mod_table",
              type: "spells_known",
              alwaysPrepared: true,
              spells: [
                { spellId: "import:divine wrath", alwaysPrepared: true, unlocksAtClassLevel: 9 },
                {
                  spellId: "import:protection from energy",
                  alwaysPrepared: true,
                  unlocksAtClassLevel: 9,
                },
                {
                  spellId: "7821cd1d-98bc-420b-917c-78e227647f44",
                  alwaysPrepared: true,
                  unlocksAtClassLevel: 9,
                },
                {
                  spellId: "551fb9d2-daed-4009-b6e5-0831aaab2dc8",
                  alwaysPrepared: true,
                  unlocksAtClassLevel: 9,
                },
              ],
            },
          ],
        },
        {
          instanceId: "prose",
          catalogRefId: "cat_char_spells_known",
          characteristics: [
            {
              id: "mod_prose",
              type: "spells_known",
              alwaysPrepared: true,
              spells: [
                {
                  spellId: "7821cd1d-98bc-420b-917c-78e227647f44",
                  alwaysPrepared: true,
                  unlocksAtClassLevel: 9,
                },
                {
                  spellId: "551fb9d2-daed-4009-b6e5-0831aaab2dc8",
                  alwaysPrepared: true,
                  unlocksAtClassLevel: 9,
                },
              ],
            },
          ],
        },
      ],
    } as Feature

    expect(collectFeatureScalingImprovements([revolutionSpells], 8, 9, "subclass")).toEqual([
      expect.objectContaining({
        name: "Burden of Revolution Spells",
        detail: "You gain Divine Wrath and Protection From Energy (always prepared).",
      }),
    ])
    expect(
      collectFeatureScalingImprovements([revolutionSpells], 8, 9, "subclass", [
        { id: "7821cd1d-98bc-420b-917c-78e227647f44", name: "Divine Wrath", source: "MHP" },
        { id: "551fb9d2-daed-4009-b6e5-0831aaab2dc8", name: "Protection from Energy", source: "SRD" },
      ]),
    ).toEqual([
      expect.objectContaining({
        detail: "You gain Divine Wrath and Protection from Energy (always prepared).",
      }),
    ])
  })
})

function srdSpecies(name: string): Species {
  const row = bundledSpecies.find((entry) => entry.name === name)
  if (!row) throw new Error(`${name} missing from SRD seed`)
  return enrichSrdSpeciesRow({
    id: `species_${name.toLowerCase()}`,
    name,
    description: row.description ?? null,
    speed: 30,
    size: "Medium",
    creature_type: "Humanoid",
    source: SRD_SOURCE,
    traits: row.traits,
  }) as unknown as Species
}

describe("species level-up improvements", () => {
  it("unlocks High Elf lineage spells at character levels 3 and 5", () => {
    const elf = srdSpecies("Elf")
    const picks = { "Elven Lineage": ["High Elf"] }

    expect(collectSpeciesScalingImprovements(elf, picks, 2, 3)).toEqual([
      expect.objectContaining({
        name: "Elven Lineage",
        detail: "You gain Detect Magic (always prepared).",
        source: "species",
      }),
    ])
    expect(collectSpeciesScalingImprovements(elf, picks, 4, 5)).toEqual([
      expect.objectContaining({
        name: "Elven Lineage",
        detail: "You gain Misty Step (always prepared).",
      }),
    ])
    expect(collectSpeciesScalingImprovements(elf, picks, 3, 4)).toEqual([])
  })

  it("scales Dragonborn Breath Weapon and unlocks Draconic Flight at 5", () => {
    const dragonborn = srdSpecies("Dragonborn")
    expect(collectSpeciesScalingImprovements(dragonborn, {}, 4, 5)).toEqual([
      expect.objectContaining({
        name: "Breath Weapon",
        detail: "Breath Weapon damage increases from 1d10 to 2d10.",
      }),
    ])
    expect(collectSpeciesTraitsGainedAtLevel(dragonborn, 4, 5)).toEqual([
      expect.objectContaining({ name: "Draconic Flight", level: 5 }),
    ])
    expect(collectSpeciesTraitsGainedAtLevel(dragonborn, 2, 3)).toEqual([])
  })

  it("includes lineage spells and breath scaling on the level-up plan", () => {
    const entry = {
      row: { class_id: "fighter", level: 2, subclass_id: null, order: 0 },
      class: {
        id: "fighter",
        name: "Fighter",
        hit_die: 10,
        features: [{ name: "Fighting Style", level: 1, description: "" } as Feature],
      } as DndClass,
      subclass: null,
    } as CharacterClassDetail
    const plan = buildLevelUpPlan({
      entry,
      subclasses: [],
      currentTotalLevel: 2,
      featureChoicePicks: {},
      species: srdSpecies("Elf"),
      speciesTraitPicks: { "Elven Lineage": ["High Elf"] },
    })
    expect(plan?.featureImprovements).toEqual([
      expect.objectContaining({
        name: "Elven Lineage",
        detail: "You gain Detect Magic (always prepared).",
      }),
    ])
  })
})

describe("collectAsiPoolsFromFeat", () => {
  it("reads asi_pool from linked modifiers", () => {
    const feat = {
      id: "observant",
      name: "Observant",
      linkedModifiers: [asiPool("modinst_obs", 1, "+1 Int or Wis", ["intelligence", "wisdom"])],
    } as Feat
    const grants = collectAsiPoolsFromFeat(feat, "feat:observant")
    expect(grants).toHaveLength(1)
    expect(grants[0]).toMatchObject({
      points: 1,
      allowedAbilities: ["intelligence", "wisdom"],
    })
  })

  it("falls back to a 2-point pool for the ASI feat", () => {
    const feat = { id: "asi", name: "Ability Score Improvement" } as Feat
    expect(collectAsiPoolsFromFeat(feat, "feat:asi")).toEqual([
      expect.objectContaining({ points: 2, label: "Ability Score Improvement" }),
    ])
  })

  it("resolves catalog-only asi_pool refs so half-feats still allocate", () => {
    const feat = {
      id: "observant",
      name: "Observant",
      modifierRefs: ["cat_asi"],
    } as Feat
    const grants = collectAsiPoolsFromFeat(feat, "feat:class:L4:Ability Score Improvement", [
      {
        id: "cat_asi",
        name: "Ability scores",
        characteristics: [
          {
            id: "mod_obs",
            type: "ability_scores",
            mode: "asi_pool",
            points: 1,
            allowedAbilities: ["intelligence", "wisdom"],
          },
        ],
      } as never,
    ])
    expect(grants).toEqual([
      expect.objectContaining({
        points: 1,
        allowedAbilities: ["intelligence", "wisdom"],
        allocationKey: expect.stringContaining("feat:class:L4:Ability Score Improvement::ref::"),
      }),
    ])
  })
})

describe("buildLevelUpPlan standardized notes and hit die", () => {
  function feature(name: string, level: number, extra: Partial<Feature> = {}): Feature {
    return { name, level, description: "", ...extra } as Feature
  }

  it("exposes hit die and PB note when crossing level 5", () => {
    const entry = {
      row: { class_id: "fighter", level: 4, subclass_id: null, order: 0 },
      class: {
        id: "fighter",
        name: "Fighter",
        hit_die: 10,
        features: [feature("Ability Score Improvement", 4), feature("Extra Attack", 5)],
      } as DndClass,
      subclass: null,
    } as CharacterClassDetail
    const plan = buildLevelUpPlan({
      entry,
      subclasses: [],
      currentTotalLevel: 4,
      featureChoicePicks: {},
    })
    expect(plan?.hitDie).toBe(10)
    expect(plan?.toLevel).toBe(5)
    expect(plan?.standardizedNotes.some((note) => note.id === "proficiency_bonus")).toBe(true)
    expect(plan?.newFeatures.some((feature) => feature.name === "Extra Attack")).toBe(true)
    expect(plan?.featureImprovements).toEqual([])
  })

  it("surfaces Critical Shot improvement on Gunslinger 8 → 9", () => {
    const entry = {
      row: { class_id: "gunslinger", level: 8, subclass_id: null, order: 0 },
      class: {
        id: "gunslinger",
        name: "Gunslinger",
        hit_die: 8,
        features: [
          feature("Critical Shot", 2, {
            linkedModifiers: [
              {
                instanceId: "crit",
                catalogRefId: "cat_char_attack_roll_modifiers",
                characteristics: [
                  {
                    id: "mod_crit",
                    type: "attack_roll_modifiers",
                    entries: [
                      {
                        bonus: 0,
                        target: "ranged",
                        criticalHitMinimum: 19,
                        criticalHitMinimumByLevel: [
                          { level: 9, mode: "fixed", fixed: 18 },
                          { level: 17, mode: "fixed", fixed: 17 },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          }),
        ],
      } as DndClass,
      subclass: null,
    } as CharacterClassDetail
    const plan = buildLevelUpPlan({
      entry,
      subclasses: [],
      currentTotalLevel: 8,
      featureChoicePicks: {},
    })
    expect(plan?.newFeatures).toEqual([])
    expect(plan?.featureImprovements).toEqual([
      expect.objectContaining({
        name: "Critical Shot",
        detail: "Critical hits with ranged weapons improve from 19–20 to 18–20.",
      }),
    ])
    expect(plan?.standardizedNotes.some((note) => note.id === "proficiency_bonus")).toBe(true)
  })
})
