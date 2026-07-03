import { describe, expect, it } from "vitest"

import {
  extractMulticlassSection,
  parseMulticlassSection,
} from "@/lib/import/parse-multiclass-section"

describe("parseMulticlassSection", () => {
  it("parses prerequisites and proficiencies from multiclass prose", () => {
    const parsed = parseMulticlassSection(`
Multiclassing
Prerequisites: To qualify for multiclassing into the Psion, you must meet these prerequisites: 13 Intelligence
Proficiencies Gained: Light armor, simple weapons, and one skill from the class list
Starting Equipment
`)
    expect(parsed?.multiclass_prerequisites).toEqual([{ ability: "Intelligence", minimum: 13 }])
    expect(parsed?.multiclass_proficiencies_gained).toEqual(
      expect.arrayContaining(["Light armor", "simple weapons"]),
    )
  })

  it("extracts multiclass block from full class text", () => {
    const { classText, multiclass } = extractMulticlassSection(`
You are a psion.
Multiclassing
Prerequisites: 13 Intelligence
Proficiencies Gained: Light armor
Equipment
You start with gear.
`)
    expect(classText).not.toMatch(/Multiclassing/)
    expect(multiclass?.multiclass_prerequisites[0]?.ability).toBe("Intelligence")
  })

  it("extracts multiclass block when it is the final section", () => {
    const { multiclass } = extractMulticlassSection(`
Starting Equipment
Choose: (a) a shortsword

Multiclassing
Prerequisites: 13 Dexterity, 13 Wisdom
Proficiencies Gained: Simple weapons, shortswords
`)
    expect(multiclass?.multiclass_prerequisites).toEqual(
      expect.arrayContaining([
        { ability: "Dexterity", minimum: 13 },
        { ability: "Wisdom", minimum: 13 },
      ]),
    )
  })
})
