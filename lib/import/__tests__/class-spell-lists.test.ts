import { describe, expect, it } from "vitest"
import {
  applyClassSpellListsToImport,
  spellNameMatchKeys,
  stampClassSpellListsOntoSpellRows,
} from "@/lib/import/class-spell-lists"

describe("spellNameMatchKeys", () => {
  it("treats Disk/Disc and a leading possessive as the same spell", () => {
    const disc = spellNameMatchKeys("Floating Disc")
    const tensers = spellNameMatchKeys("Tenser's Floating Disk")
    expect(disc.some((key) => tensers.includes(key))).toBe(true)
  })
})

describe("applyClassSpellListsToImport", () => {
  it("tags batch spells and emits stubs so persist can stamp existing SRD rows", () => {
    const next = applyClassSpellListsToImport({
      classes: [
        {
          name: "Investigator",
          spell_list: ["Alarm", "Detect Magic*", "Conjure Cover"],
        },
      ],
      spells: [
        {
          name: "Conjure Cover",
          classes: ["Investigator"],
          description: "A unique write-up.",
        },
      ],
    })

    expect(next.classes?.[0]?.spell_list).toEqual(["Alarm", "Detect Magic", "Conjure Cover"])
    expect(next.spells?.find((spell) => spell.name === "Conjure Cover")?.classes).toEqual([
      "Investigator",
    ])
    expect(next.spells?.find((spell) => spell.name === "Alarm")).toMatchObject({
      name: "Alarm",
      classes: ["Investigator"],
    })
    expect(next.spells?.find((spell) => spell.name === "Detect Magic")?.classes).toEqual([
      "Investigator",
    ])
  })

  it("does not duplicate a list name already present under an SRD title", () => {
    const next = applyClassSpellListsToImport({
      classes: [{ name: "Investigator", spell_list: ["Floating Disc"] }],
      spells: [{ name: "Tenser's Floating Disk", classes: ["Wizard"] }],
    })

    const floating = (next.spells ?? []).filter((spell) =>
      /floating dis[kc]/i.test(String(spell.name)),
    )
    expect(floating).toHaveLength(1)
    expect(floating[0]?.classes).toEqual(["Investigator", "Wizard"])
  })
})

describe("stampClassSpellListsOntoSpellRows", () => {
  it("unions a class tag onto existing catalog rows without rewriting prose", () => {
    const existing = [
      {
        id: "srd-acid",
        name: "Acid Splash",
        description: "SRD write-up",
        classes: ["Sorcerer", "Wizard"],
      },
      {
        id: "srd-fireball",
        name: "Fireball",
        description: "A bright streak",
        classes: ["Wizard"],
      },
    ]
    const { changed, all } = stampClassSpellListsOntoSpellRows(existing, [
      { className: "Artificer", names: ["Acid Splash", "Alarm"] },
    ])
    expect(changed).toHaveLength(1)
    expect(changed[0]).toMatchObject({
      id: "srd-acid",
      description: "SRD write-up",
      classes: ["Artificer", "Sorcerer", "Wizard"],
    })
    expect(all[1]?.classes).toEqual(["Wizard"])
  })
})
