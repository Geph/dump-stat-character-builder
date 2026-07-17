import { describe, expect, it } from "vitest"
import {
  extractPrerequisiteFromDescription,
  isChoicePrerequisiteMet,
  parseMinimumLevelFromPrerequisite,
} from "@/lib/builder/choice-prerequisite"
import { isKnackEligible } from "@/lib/builder/knack-choices"
import { enrichAbilityImportRow } from "@/lib/import/enrich-ability-import"
import type { CustomAbility } from "@/lib/types"

function knack(partial: Partial<CustomAbility> & Pick<CustomAbility, "name">): CustomAbility {
  return {
    id: partial.id ?? partial.name.toLowerCase().replace(/\s+/g, "-"),
    description: partial.description ?? "",
    prerequisites: partial.prerequisites ?? null,
    characteristics: null,
    attached_to_type: "class",
    attached_to_id: "Warmage",
    uses: null,
    show_in_builder: true,
    icon: null,
    source: "magehandpress",
    creator_url: null,
    created_at: "",
    updated_at: "",
    ability_role: "knack",
    repeatable: partial.repeatable ?? false,
    ...partial,
  }
}

describe("choice prerequisites (Warmage-style)", () => {
  it("extracts Prerequisite: lines from descriptions", () => {
    expect(
      extractPrerequisiteFromDescription(
        "<p>Prerequisite: Light Cantrip</p><p>When you cast Light…</p>",
      ),
    ).toBe("Light Cantrip")
    expect(
      extractPrerequisiteFromDescription(
        "Prerequisites: Level 10+ Warmage, House of Rooks\nAs a Bonus Action…",
      ),
    ).toBe("Level 10+ Warmage, House of Rooks")
    // Section header without a colon must not match.
    expect(
      extractPrerequisiteFromDescription(
        "Prerequisites. If a trick has a prerequisite, you must meet it.",
      ),
    ).toBeNull()
  })

  it("parses Level N+ class gates", () => {
    expect(parseMinimumLevelFromPrerequisite("Level 5+ Warmage")).toBe(5)
    expect(parseMinimumLevelFromPrerequisite("Level 10+ Warmage, House of Bishops")).toBe(10)
    expect(parseMinimumLevelFromPrerequisite("5th-level Warmage")).toBe(5)
  })

  it("gates Blinding Light on knowing the Light cantrip", () => {
    const prereq = "Light Cantrip"
    expect(
      isChoicePrerequisiteMet(prereq, { classLevel: 2, knownSpellNames: [] }),
    ).toBe(false)
    expect(
      isChoicePrerequisiteMet(prereq, { classLevel: 2, knownSpellNames: ["Light"] }),
    ).toBe(true)
  })

  it("accepts either cantrip in an OR group", () => {
    const prereq = "Quickstep or Springheel Cantrip"
    expect(
      isChoicePrerequisiteMet(prereq, {
        classLevel: 2,
        knownSpellNames: ["Quickstep"],
      }),
    ).toBe(true)
    expect(
      isChoicePrerequisiteMet(prereq, {
        classLevel: 2,
        knownSpellNames: ["Springheel"],
      }),
    ).toBe(true)
    expect(
      isChoicePrerequisiteMet(prereq, {
        classLevel: 2,
        knownSpellNames: ["Light"],
      }),
    ).toBe(false)
  })

  it("requires level and cantrip together (Force Aegis)", () => {
    const prereq = "Level 5+ Warmage, Force Buckler cantrip"
    expect(
      isChoicePrerequisiteMet(prereq, {
        classLevel: 4,
        knownSpellNames: ["Force Buckler"],
      }),
    ).toBe(false)
    expect(
      isChoicePrerequisiteMet(prereq, {
        classLevel: 5,
        knownSpellNames: [],
      }),
    ).toBe(false)
    expect(
      isChoicePrerequisiteMet(prereq, {
        classLevel: 5,
        knownSpellNames: ["Force Buckler"],
      }),
    ).toBe(true)
  })

  it("requires subclass for House-gated tricks", () => {
    const prereq = "Level 10+ Warmage, House of Bishops"
    expect(
      isChoicePrerequisiteMet(prereq, {
        classLevel: 10,
        subclassName: "House of Rooks",
      }),
    ).toBe(false)
    expect(
      isChoicePrerequisiteMet(prereq, {
        classLevel: 10,
        subclassName: "House of Bishops",
      }),
    ).toBe(true)
  })

  it("handles multi-cantrip OR lists (Spellstrike)", () => {
    const prereq =
      "Level 10+ Warmage, Arc Blade, Burning Blade, Frigid Blade, or True Strike Cantrip"
    expect(
      isChoicePrerequisiteMet(prereq, {
        classLevel: 10,
        knownSpellNames: ["True Strike"],
      }),
    ).toBe(true)
    expect(
      isChoicePrerequisiteMet(prereq, {
        classLevel: 10,
        knownSpellNames: ["Arc Blade"],
      }),
    ).toBe(true)
    expect(
      isChoicePrerequisiteMet(prereq, {
        classLevel: 10,
        knownSpellNames: ["Light"],
      }),
    ).toBe(false)
  })

  it("still enforces knack name chains", () => {
    const slayerII = knack({ name: "Slayer II", prerequisites: "Slayer I" })
    expect(isKnackEligible(slayerII, 5, [])).toBe(false)
    expect(isKnackEligible(slayerII, 5, ["Slayer I"])).toBe(true)
  })

  it("scrapes prerequisite and level_requirement on ability import", () => {
    const row = enrichAbilityImportRow({
      name: "Blinding Light",
      description: "<p>Prerequisite: Light Cantrip</p><p>When you cast the Light cantrip…</p>",
      ability_role: "knack",
      source_name: "Warmage",
    })
    expect(row.prerequisites).toBe("Light Cantrip")
    expect(row.prerequisite).toBe("Light Cantrip")

    const leveled = enrichAbilityImportRow({
      name: "Force Aegis",
      description: "Prerequisite: Level 5+ Warmage, Force Buckler cantrip\nWhen you cast…",
      ability_role: "knack",
      source_name: "Warmage",
    })
    expect(leveled.prerequisites).toBe("Level 5+ Warmage, Force Buckler cantrip")
    expect(leveled.level_requirement).toBe(5)
  })
})
