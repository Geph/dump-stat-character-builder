import { describe, expect, it } from "vitest"
import {
  inferSpellListClassNames,
  isInvestigatorListSpell,
  spellMatchesClassName,
} from "@/lib/compendium/investigator-spell-list"

describe("inferSpellListClassNames", () => {
  it("reads the class out of common spells_known labels", () => {
    expect(inferSpellListClassNames("Investigator spell list")).toEqual(["Investigator"])
    expect(inferSpellListClassNames("Witch cantrips")).toEqual(["Witch"])
    expect(inferSpellListClassNames("Inventor spells")).toEqual(["Inventor"])
  })

  it("ignores labels that are not a class list", () => {
    expect(inferSpellListClassNames("Innate Arcanum")).toEqual([])
    expect(inferSpellListClassNames("Hexes")).toEqual([])
    expect(inferSpellListClassNames("")).toEqual([])
  })
})

describe("isInvestigatorListSpell", () => {
  it("matches official grimoire names including punctuation variants", () => {
    expect(isInvestigatorListSpell("Alarm")).toBe(true)
    expect(isInvestigatorListSpell("Blood Print")).toBe(true)
    expect(isInvestigatorListSpell("Arcanist's Magic Aura")).toBe(true)
    expect(isInvestigatorListSpell("Arcanist’s Magic Aura")).toBe(true)
    expect(isInvestigatorListSpell("Séance")).toBe(true)
    expect(isInvestigatorListSpell("Seance")).toBe(true)
    expect(isInvestigatorListSpell("Zero Gravity")).toBe(true)
  })

  it("rejects spells that are not on the Investigator list", () => {
    expect(isInvestigatorListSpell("Accelerate/decelerate")).toBe(false)
    expect(isInvestigatorListSpell("Ballistic Smite")).toBe(false)
    expect(isInvestigatorListSpell("After")).toBe(false)
  })
})

describe("spellMatchesClassName", () => {
  it("accepts Investigator grimoire spells even without the class tag", () => {
    expect(spellMatchesClassName({ name: "Alarm", classes: ["Wizard", "Ranger"] }, "Investigator")).toBe(
      true,
    )
    expect(spellMatchesClassName({ name: "Detect Magic", classes: ["Bard"] }, "Investigator")).toBe(true)
  })

  it("still requires a real class tag for other classes", () => {
    expect(spellMatchesClassName({ name: "Alarm", classes: ["Wizard"] }, "Wizard")).toBe(true)
    expect(spellMatchesClassName({ name: "Alarm", classes: ["Wizard"] }, "Sorcerer")).toBe(false)
  })

  it("does not let off-list spells onto Investigator", () => {
    expect(
      spellMatchesClassName({ name: "Accelerate/decelerate", classes: ["Wizard"] }, "Investigator"),
    ).toBe(false)
  })
})
