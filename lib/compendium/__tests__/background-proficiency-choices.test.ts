import { describe, expect, it } from "vitest"
import { normalizeBackgroundRow } from "@/lib/compendium/normalize-backgrounds"
import {
  parseBackgroundLanguageChoicePhrase,
  parseBackgroundToolChoicePhrase,
  wireBackgroundProficiencyChoices,
} from "@/lib/compendium/wire-background-proficiency-choices"
import { collectUnmatchedStartingEquipmentNames } from "@/lib/import/collect-unmatched-starting-equipment"
import { normalizeBackgroundProficiencies } from "@/lib/compendium/background-proficiencies"
import type { Background } from "@/lib/types"

describe("background proficiency choice wiring", () => {
  it("parses artisan / gaming / musical tool choice phrases", () => {
    expect(parseBackgroundToolChoicePhrase("Choose one kind of Artisan's Tools")).toMatchObject({
      pool: "artisans",
      count: 1,
    })
    expect(parseBackgroundToolChoicePhrase("Gaming Set")).toMatchObject({ pool: "gaming", count: 1 })
    expect(parseBackgroundToolChoicePhrase("Choose one kind of Musical Instrument")).toMatchObject({
      pool: "musical",
      count: 1,
    })
    expect(parseBackgroundToolChoicePhrase("Calligrapher's Supplies")).toBeNull()
  })

  it("parses language choice phrases", () => {
    expect(parseBackgroundLanguageChoicePhrase("One language of your choice")).toMatchObject({
      count: 1,
    })
    expect(
      parseBackgroundLanguageChoicePhrase(
        "Two of your choice (Abyssal, Celestial, or Infernal recommended)",
      ),
    ).toMatchObject({ count: 2 })
  })

  it("wires choice phrases onto feature linkedModifiers and strips them from arrays", () => {
    const wired = wireBackgroundProficiencyChoices({
      name: "Artisan",
      tool_proficiencies: ["Choose one kind of Artisan's Tools"],
      proficiencies: { languages: ["Two of your choice"] },
      feature: { name: "Workshop", description: "You know a workshop." },
    })
    const feature = wired.feature as {
      linkedModifiers: { characteristics?: { type: string; choiceCount?: number; toolChoicePool?: string }[] }[]
    }
    const chars = feature.linkedModifiers.flatMap((m) => m.characteristics ?? [])
    expect(chars.some((c) => c.type === "tool_proficiencies" && c.toolChoicePool === "artisans")).toBe(
      true,
    )
    expect(chars.some((c) => c.type === "languages" && c.choiceCount === 2)).toBe(true)
    expect(wired.tool_proficiencies).toBeNull()
    expect((wired.proficiencies as { languages: string[] }).languages).toEqual([])
  })

  it("normalizeBackgroundRow wires Guide-style tools and Gate Warden languages", () => {
    const guide = normalizeBackgroundRow({
      name: "Entertainer",
      description: "Performer",
      skill_proficiencies: ["Acrobatics", "Performance"],
      tool_proficiencies: ["Choose one kind of Musical Instrument"],
      feat_granted: "Musician",
      ability_bonuses: { strength: 0, dexterity: 0, charisma: 0 },
    })
    const mods = (
      (guide.feature as { linkedModifiers?: { characteristics?: { type: string }[] }[] })
        ?.linkedModifiers ?? []
    ).flatMap((m) => m.characteristics ?? [])
    expect(mods.some((c) => c.type === "tool_proficiencies")).toBe(true)

    const gate = normalizeBackgroundRow({
      name: "Gate Warden",
      description: "Planar",
      skill_proficiencies: ["Persuasion", "Survival"],
      feat_granted: "Scion of the Outer Planes",
      ability_bonuses: null,
      proficiencies: {
        languages: ["Two of your choice (Abyssal, Celestial, or Infernal recommended)"],
      },
      feature: { name: "Planar Infusion", description: "You gain Scion." },
    })
    const gateMods = (
      (gate.feature as { linkedModifiers?: { characteristics?: { type: string; choiceCount?: number }[] }[] })
        ?.linkedModifiers ?? []
    ).flatMap((m) => m.characteristics ?? [])
    expect(gateMods.some((c) => c.type === "languages" && c.choiceCount === 2)).toBe(true)

    const background = gate as unknown as Background
    const prof = normalizeBackgroundProficiencies(
      background.proficiencies as never,
      background.tool_proficiencies,
    )
    expect(prof.languages).toEqual([])
  })
})

describe("unmatched starting equipment", () => {
  it("flags names not in the equipment catalog", () => {
    const missing = collectUnmatchedStartingEquipmentNames({
      backgrounds: [
        {
          name: "Gate Warden",
          description: null,
          skill_proficiencies: null,
          feat_granted: null,
          ability_bonuses: null,
          starting_equipment: [
            { name: "Ring of keys to unknown locks", quantity: 1 },
            { name: "Traveler's Clothes", quantity: 1 },
          ],
        },
      ],
    })
    expect(missing.map((row) => row.name)).toContain("Ring of keys to unknown locks")
    expect(missing.map((row) => row.name)).not.toContain("Traveler's Clothes")
  })
})
