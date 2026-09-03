import { describe, expect, it } from "vitest"
import { formatClassIdentityLabel } from "@/lib/character/class-identity-label"
import {
  enrichSubclassChoiceOptionSpells,
  featureTreatsChoiceSpellsAsRituals,
} from "@/lib/compendium/enrich-subclass-spell-features"
import type { Feature } from "@/lib/types"

const SPELL_CATALOG = [
  { id: "import:alter self", name: "Alter Self" },
  { id: "import:jump", name: "Jump" },
  { id: "import:gaseous form", name: "Gaseous Form" },
  { id: "import:fabricate", name: "Fabricate" },
  { id: "import:passwall", name: "Passwall" },
  { id: "import:charm person", name: "Charm Person" },
  { id: "import:zone of truth", name: "Zone of Truth" },
  { id: "import:major image", name: "Major Image" },
]

function thesisTable(rows: Array<[number, string]>): string {
  const body = rows
    .map(([level, spells]) => `<tr><td>${level}</td><td>${spells}</td></tr>`)
    .join("")
  return `<table><tr><th>Investigator Level</th><th>Spells</th></tr>${body}</table>`
}

describe("formatClassIdentityLabel", () => {
  it("includes subclass on banner and share labels", () => {
    expect(
      formatClassIdentityLabel({
        className: "Investigator",
        subclassName: "Exterminator",
        level: 7,
      }),
    ).toBe("Investigator (Exterminator) 7")
    expect(
      formatClassIdentityLabel({
        className: "Investigator",
        subclassName: "Exterminator",
        level: 7,
        style: "share",
      }),
    ).toBe("Investigator (Exterminator) Level 7")
  })

  it("omits parentheses when there is no subclass", () => {
    expect(formatClassIdentityLabel({ className: "Fighter", level: 5 })).toBe("Fighter 5")
  })
})

describe("Investigator Thesis spell-set choices", () => {
  const thesisFeature = {
    level: 3,
    name: "Thesis",
    description:
      "Choose one subject area for your thesis: Corpus, Mentis, Mortis, or Oculus. " +
      "You add the listed spells for your Investigator level to your grimoire for free. " +
      "The listed spells count as Investigator spells for you and you treat them if they have the Ritual tag. " +
      "Whenever you gain an Investigator level, you can replace your thesis with another one.",
    isChoice: true,
    choices: {
      category: "Thesis",
      count: 1,
      swappableOnRest: false,
      options: [
        {
          name: "Corpus",
          description: thesisTable([
            [3, "Alter Self, Jump"],
            [5, "Gaseous Form"],
            [7, "Fabricate"],
            [9, "Passwall"],
          ]),
        },
        {
          name: "Mentis",
          description: thesisTable([
            [3, "Charm Person, Zone of Truth"],
            [5, "Major Image"],
          ]),
        },
      ],
    },
  } as Feature

  it("detects Ritual-tag thesis prose", () => {
    expect(featureTreatsChoiceSpellsAsRituals(thesisFeature)).toBe(true)
  })

  it("wires each thesis option's spell table with unlocks and castAsRitual", () => {
    const enriched = enrichSubclassChoiceOptionSpells(thesisFeature, SPELL_CATALOG)
    const corpus = enriched.choices?.options?.find((option) => option.name === "Corpus")
    const known = (corpus?.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "spells_known")
    expect(known?.type).toBe("spells_known")
    if (known?.type !== "spells_known") return
    expect(known.spells).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          spellId: "import:alter self",
          unlocksAtClassLevel: 3,
          castAsRitual: true,
          alwaysPrepared: true,
        }),
        expect.objectContaining({
          spellId: "import:gaseous form",
          unlocksAtClassLevel: 5,
          castAsRitual: true,
        }),
        expect.objectContaining({
          spellId: "import:passwall",
          unlocksAtClassLevel: 9,
          castAsRitual: true,
        }),
      ]),
    )

    const mentis = enriched.choices?.options?.find((option) => option.name === "Mentis")
    const mentisKnown = (mentis?.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "spells_known")
    expect(mentisKnown?.type).toBe("spells_known")
    if (mentisKnown?.type !== "spells_known") return
    expect(mentisKnown.spells?.some((spell) => spell.spellId === "import:charm person")).toBe(true)
  })

  it("keeps Thesis as a non-rest swap choice", () => {
    const enriched = enrichSubclassChoiceOptionSpells(thesisFeature, SPELL_CATALOG)
    expect(enriched.isChoice).toBe(true)
    expect(enriched.choices?.swappableOnRest).toBe(false)
  })
})
