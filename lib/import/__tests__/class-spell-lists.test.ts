import { describe, expect, it } from "vitest"
import { applyClassSpellListsToImport, spellNameMatchKeys } from "@/lib/import/class-spell-lists"

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

    expect(next.classes?.[0]).not.toHaveProperty("spell_list")
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
