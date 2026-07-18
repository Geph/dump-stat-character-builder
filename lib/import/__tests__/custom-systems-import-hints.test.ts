import { describe, expect, it } from "vitest"
import { buildByoExtractionPrompt, templateJsonString } from "@/lib/import/byo-import-kit"
import { buildImportSystemPrompt } from "@/lib/import/import-system-prompt"
import {
  CUSTOM_ABILITY_LIBRARY_STRUCTURE_HINT,
  formatCustomSystemsImportHint,
  parseClassResourceLabelList,
} from "@/lib/import/custom-systems-import-hints"

describe("custom systems import hints", () => {
  it("parses comma-separated resource labels", () => {
    expect(parseClassResourceLabelList("Psi Points, Exploit Dice; Grit")).toEqual([
      "Psi Points",
      "Exploit Dice",
      "Grit",
    ])
  })

  it("returns empty hint when both fields are blank", () => {
    expect(formatCustomSystemsImportHint({ abilityCategory: "  ", classResourceLabels: "" })).toBe(
      "",
    )
  })

  it("describes hierarchy and labels for Psion-style libraries", () => {
    const hint = formatCustomSystemsImportHint({
      abilityCategory: "Psionic Disciplines",
      classResourceLabels: "Psi Points, Psi Limit",
    })
    expect(hint).toContain("Ability category: Psionic Disciplines")
    expect(hint).toContain("Psi Points; Psi Limit")
    expect(hint).toContain("split hierarchy")
    expect(hint).toContain("choices.category")
    expect(hint).toContain("Psionic Disciplines")
    expect(hint).toContain("Do NOT mash")
    expect(hint).toContain("Enhancement Discipline")
    expect(hint).toContain("Crushing Grip")
    expect(hint).toContain('"execution": "On a successful Grapple"')
    expect(hint).toContain("eligible_classes")
    expect(hint).toContain("Section-intro rules propagate")
    expect(hint).toContain("until_item_consumed")
    expect(hint).toContain("source_type\": \"compendium\"")
    expect(hint).toContain("Airburst Mine")
    expect(hint).toContain('ability_role": "discipline"')
    expect(hint).toContain('ability_role": "psionic_power"')
    expect(hint).toContain('ability_role": "upgrade"')
    expect(hint).toContain('ability_role": "class_talent"')
    expect(hint).toContain("Do NOT put psionic powers in spells[]")
    expect(hint).toContain("EVERY discipline-gated talent")
    expect(hint).toContain("Discipline Talents")
    expect(hint).toContain("Class Talents")
    expect(hint).toContain("specialization_choices")
  })

  it("includes structure examples in BYO extraction prompt with custom systems", () => {
    const prompt = buildByoExtractionPrompt("abilities", {
      customSystems: {
        abilityCategory: "Exploits",
        classResourceLabels: "Exploit Dice",
      },
    })
    expect(prompt).toContain("Ability category: Exploits")
    expect(prompt).toContain("Exploit Dice")
    expect(prompt).toContain("higher-rank section header")
    expect(prompt).toContain("1st-Degree Exploits")
    expect(prompt).toContain("Gadgetsmith Upgrades")
    expect(prompt).toContain("Enhancing Surge")
    expect(prompt).toContain("psionic_power")
    expect(prompt).not.toContain("prefer spells[] for Psion-style leaf powers")
  })

  it("includes structure examples for abilities imports without Step 0 labels", () => {
    const prompt = buildImportSystemPrompt("abilities")
    expect(prompt).toContain(CUSTOM_ABILITY_LIBRARY_STRUCTURE_HINT.slice(0, 40))
    expect(prompt).toContain("Do NOT mash")
  })

  it("uses a split abilities JSON template with psionic_power not spells", () => {
    const template = templateJsonString("abilities")
    expect(template).toContain("Enhancement Discipline")
    expect(template).toContain("Enhancing Surge")
    expect(template).toContain("psionic_power")
    expect(template).toContain("class_talent")
    expect(template).toContain("Discipline Talents")
    expect(template).toContain("Crushing Grip")
    expect(template).toContain("Airburst Mine")
    expect(template).toContain("import_proposals")
    expect(template).not.toContain('"name": "Psionic Discipline"')
    expect(JSON.parse(template).spells).toBeUndefined()
  })
})
