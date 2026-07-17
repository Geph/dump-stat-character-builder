import { describe, expect, it } from "vitest"
import { normalizeBackgroundRow } from "@/lib/compendium/normalize-backgrounds"
import { isLegacyBackground } from "@/lib/compendium/background-origin-feat"
import { getBackgroundAbilityGrant } from "@/lib/builder/background-asi"
import { getBackgroundStartingEquipmentGroups } from "@/lib/compendium/background-equipment"
import type { Background } from "@/lib/types"

/** Source-correct ASIs / feats / tools for Forge of the Artificer house backgrounds. */
const EXPECTED = [
  {
    name: "Aberrant Heir",
    abilities: ["strength", "constitution", "charisma"],
    feat: "Aberrant Dragonmark",
    tools: ["Disguise Kit"],
    pool: null as string | null,
    abilityJson: { strength: 0, constitution: 0, charisma: 0 },
  },
  {
    name: "House Agent",
    abilities: ["strength", "intelligence", "charisma"],
    feat: "Lucky",
    tools: ["Choose one kind of Artisan's Tools"],
    pool: "artisans",
    abilityJson: { strength: 0, intelligence: 0, charisma: 0 },
  },
  {
    name: "House Cannith Heir",
    abilities: ["strength", "dexterity", "intelligence"],
    feat: "Mark of Making",
    tools: ["Choose one kind of Artisan's Tools"],
    pool: "artisans",
    abilityJson: { strength: 0, dexterity: 0, intelligence: 0 },
  },
  {
    name: "House Deneith Heir",
    abilities: ["strength", "constitution", "wisdom"],
    feat: "Mark of Sentinel",
    tools: ["Choose one kind of Gaming Set"],
    pool: "gaming",
    abilityJson: { strength: 0, constitution: 0, wisdom: 0 },
  },
  {
    name: "House Ghallanda Heir",
    abilities: ["dexterity", "wisdom", "charisma"],
    feat: "Mark of Hospitality",
    tools: ["Cook's Utensils"],
    pool: null,
    abilityJson: { dexterity: 0, wisdom: 0, charisma: 0 },
  },
  {
    name: "House Jorasco Heir",
    abilities: ["dexterity", "constitution", "wisdom"],
    feat: "Mark of Healing",
    tools: ["Herbalism Kit"],
    pool: null,
    abilityJson: { dexterity: 0, constitution: 0, wisdom: 0 },
  },
  {
    name: "House Kundarak Heir",
    abilities: ["strength", "constitution", "intelligence"],
    feat: "Mark of Warding",
    tools: ["Thieves' Tools"],
    pool: null,
    abilityJson: { strength: 0, constitution: 0, intelligence: 0 },
  },
  {
    name: "House Lyrandar Heir",
    abilities: ["strength", "dexterity", "charisma"],
    feat: "Mark of Storm",
    tools: ["Navigator's Tools"],
    pool: null,
    abilityJson: { strength: 0, dexterity: 0, charisma: 0 },
  },
  {
    name: "House Medani Heir",
    abilities: ["dexterity", "intelligence", "wisdom"],
    feat: "Mark of Detection",
    tools: ["Disguise Kit"],
    pool: null,
    abilityJson: { dexterity: 0, intelligence: 0, wisdom: 0 },
  },
  {
    name: "House Orien Heir",
    abilities: ["dexterity", "constitution", "intelligence"],
    feat: "Mark of Passage",
    tools: ["Cartographer's Tools"],
    pool: null,
    abilityJson: { dexterity: 0, constitution: 0, intelligence: 0 },
  },
  {
    name: "House Phiarlan Heir",
    abilities: ["dexterity", "wisdom", "charisma"],
    feat: "Mark of Shadow",
    tools: ["Disguise Kit"],
    pool: null,
    abilityJson: { dexterity: 0, wisdom: 0, charisma: 0 },
  },
  {
    name: "House Sivis Heir",
    abilities: ["intelligence", "wisdom", "charisma"],
    feat: "Mark of Scribing",
    tools: ["Calligrapher's Supplies"],
    pool: null,
    abilityJson: { intelligence: 0, wisdom: 0, charisma: 0 },
  },
  {
    name: "House Tharashk Heir",
    abilities: ["constitution", "intelligence", "wisdom"],
    feat: "Mark of Finding",
    tools: ["Choose one kind of Gaming Set"],
    pool: "gaming",
    abilityJson: { constitution: 0, intelligence: 0, wisdom: 0 },
  },
  {
    name: "House Thuranni Heir",
    abilities: ["dexterity", "intelligence", "charisma"],
    feat: "Mark of Shadow",
    tools: ["Choose one kind of Musical Instrument"],
    pool: "musical",
    // LLM bug: "desktop" + duplicate dexterity — normalize must collapse to three abilities.
    abilityJson: { desktop: 0, dexterity: 0, intelligence: 0, charisma: 0 },
  },
  {
    name: "House Vadalis Heir",
    abilities: ["constitution", "wisdom", "charisma"],
    feat: "Mark of Handling",
    tools: ["Herbalism Kit"],
    pool: null,
    abilityJson: { constitution: 0, wisdom: 0, charisma: 0 },
  },
] as const

describe("eberron house backgrounds wiring", () => {
  for (const row of EXPECTED) {
    it(`wires ${row.name}`, () => {
      const normalized = normalizeBackgroundRow({
        name: row.name,
        description: "flavor",
        skill_proficiencies: ["Insight", "Perception"],
        tool_proficiencies: [...row.tools],
        feat_granted: row.feat,
        ability_bonuses: { ...row.abilityJson },
        starting_equipment_groups: [
          {
            description: "Choose A or B:",
            options: [
              {
                label: "A",
                items: [
                  { name: "Fine Clothes", quantity: 1 },
                  { name: "Gold Pieces", quantity: 10 },
                ],
              },
              { label: "B", items: [{ name: "Gold Pieces", quantity: 50 }] },
            ],
          },
        ],
      })
      const bg = normalized as unknown as Background
      expect(isLegacyBackground(bg)).toBe(false)
      expect(bg.feat_granted).toBe(row.feat)
      expect(Object.keys(bg.ability_bonuses ?? {}).sort()).toEqual([...row.abilities].sort())
      const grant = getBackgroundAbilityGrant(bg)
      expect(grant.needsChoice).toBe(true)
      expect(grant.eligible.sort()).toEqual([...row.abilities].sort())

      const groups = getBackgroundStartingEquipmentGroups(bg)
      expect(groups[0]?.options.map((o) => o.label)).toEqual(["A", "B"])

      if (row.pool) {
        const chars = (bg.feature?.linkedModifiers ?? []).flatMap((m) => m.characteristics ?? [])
        expect(
          chars.some(
            (c) =>
              c.type === "tool_proficiencies" &&
              (c as { toolChoicePool?: string }).toolChoicePool === row.pool,
          ),
        ).toBe(true)
      }
    })
  }
})
