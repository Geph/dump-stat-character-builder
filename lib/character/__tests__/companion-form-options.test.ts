import { describe, expect, it } from "vitest"
import {
  crToNumber,
  familiarFormOptions,
  familiarTemplateForForm,
  wildShapeEligibleForms,
  wildShapeTierForLevel,
} from "@/lib/character/companion-form-options"
import { buildSrdCreatureSeedRows } from "@/lib/compendium/seed-srd-creatures"
import type { Creature } from "@/lib/types"

const SEED_CREATURES = buildSrdCreatureSeedRows() as unknown as Creature[]

const byName = (forms: { name: string }[]) => forms.map((form) => form.name)

describe("crToNumber", () => {
  it("parses whole and fractional CRs", () => {
    expect(crToNumber("1/4")).toBe(0.25)
    expect(crToNumber("1/2")).toBe(0.5)
    expect(crToNumber("3")).toBe(3)
    expect(crToNumber("0")).toBe(0)
    expect(crToNumber(null)).toBeNull()
    expect(crToNumber("None")).toBeNull()
  })
})

describe("wildShapeTierForLevel", () => {
  it("follows the 2024 Beast Shapes table", () => {
    expect(wildShapeTierForLevel(1)).toBeNull()
    expect(wildShapeTierForLevel(2)).toMatchObject({ maxCr: 0.25, flyAllowed: false, knownForms: 4 })
    expect(wildShapeTierForLevel(5)).toMatchObject({ maxCr: 0.5, flyAllowed: false, knownForms: 6 })
    expect(wildShapeTierForLevel(8)).toMatchObject({ maxCr: 1, flyAllowed: true, knownForms: 8 })
    expect(wildShapeTierForLevel(20)).toMatchObject({ maxCr: 1, flyAllowed: true })
  })
})

describe("wildShapeEligibleForms", () => {
  it("returns nothing below Druid level 2 or without a catalog", () => {
    expect(wildShapeEligibleForms(SEED_CREATURES, 1)).toHaveLength(0)
    expect(wildShapeEligibleForms(undefined, 5)).toHaveLength(0)
  })

  it("offers CR 1/4 Beasts without Fly Speed at level 2", () => {
    const names = byName(wildShapeEligibleForms(SEED_CREATURES, 2))
    expect(names).toContain("Wolf")
    expect(names).toContain("Riding Horse")
    expect(names).toContain("Rat")
    expect(names).toContain("Spider")
    // CR 1/2 excluded until level 5.
    expect(names).not.toContain("Black Bear")
    // Flying Beasts excluded until level 8.
    expect(names).not.toContain("Owl")
    expect(names).not.toContain("Bat")
    // Non-Beasts never qualify.
    expect(names).not.toContain("Imp")
    expect(names).not.toContain("Skeleton")
  })

  it("raises the CR cap at level 5 and allows Fly Speed at level 8", () => {
    const level5 = byName(wildShapeEligibleForms(SEED_CREATURES, 5))
    expect(level5).toContain("Black Bear")
    expect(level5).not.toContain("Owl")
    expect(level5).not.toContain("Dire Wolf")

    const level8 = byName(wildShapeEligibleForms(SEED_CREATURES, 8))
    expect(level8).toContain("Owl")
    expect(level8).toContain("Dire Wolf")
    expect(level8).toContain("Giant Spider")
  })

  it("marks every eligible form as a polymorph template", () => {
    const forms = wildShapeEligibleForms(SEED_CREATURES, 8)
    expect(forms.length).toBeGreaterThan(0)
    expect(forms.every((form) => form.polymorph === true)).toBe(true)
  })

  it("excludes owner-scaled companions like the Otherworldly Steed", () => {
    const names = byName(wildShapeEligibleForms(SEED_CREATURES, 20))
    expect(names).not.toContain("Otherworldly Steed")
  })
})

describe("familiarFormOptions", () => {
  it("offers the named Find Familiar forms plus other CR 0 Beasts", () => {
    const names = byName(familiarFormOptions(SEED_CREATURES))
    for (const form of ["Bat", "Cat", "Frog", "Hawk", "Lizard", "Octopus", "Owl", "Rat", "Raven", "Spider", "Weasel"]) {
      expect(names).toContain(form)
    }
    // Other CR 0 Beasts qualify ("another Beast that has a Challenge Rating of 0").
    expect(names).toContain("Crab")
    // Chain-only forms stay out without Pact of the Chain.
    expect(names).not.toContain("Imp")
    expect(names).not.toContain("Sphinx of Wonder")
    expect(names).not.toContain("Venomous Snake")
  })

  it("broadens the options for Pact of the Chain", () => {
    const names = byName(familiarFormOptions(SEED_CREATURES, { pactOfTheChain: true }))
    for (const form of ["Imp", "Pseudodragon", "Quasit", "Skeleton", "Sphinx of Wonder", "Sprite", "Venomous Snake"]) {
      expect(names).toContain(form)
    }
  })
})

describe("familiarTemplateForForm", () => {
  it("keeps the form's stat block and adds the familiar spirit traits", () => {
    const bat = familiarFormOptions(SEED_CREATURES).find((form) => form.name === "Bat")!
    const familiar = familiarTemplateForForm(bat)
    expect(familiar.name).toBe("Familiar (Bat)")
    expect(familiar.sizeTypeAlignment).toMatch(/Celestial, Fey, or Fiend/)
    expect(familiar.traits.map((trait) => trait.name)).toContain("Telepathic Link")
    expect(familiar.traits.map((trait) => trait.name)).toContain("Shared Senses")
    expect((familiar.reactions ?? []).map((entry) => entry.name)).toContain(
      "Deliver Touch Spells (Reaction)",
    )
    expect(familiar.polymorph).toBe(false)
  })
})
