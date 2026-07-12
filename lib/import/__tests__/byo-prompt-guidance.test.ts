import { describe, expect, it } from "vitest"
import { buildByoExtractionPrompt } from "@/lib/import/byo-import-kit"
import { buildImportSystemPrompt } from "@/lib/import/import-system-prompt"
import {
  CHOICE_EXTRACTION_HINT,
  CUSTOM_CLASS_IMPORT_HINT,
  DUPLICATE_ABILITY_MERGE_HINT,
  GENERAL_SOURCE_CLEANUP_HINT,
  MARKER_LEGEND_SCAN_HINT,
  NAME_SOURCE_MATCHING_HINT,
} from "@/lib/import/content-schema"
import { COMMON_MODIFIERS_IMPORT_HINT } from "@/lib/import/common-modifiers-import-hints"

describe("BYO prompt guidance (Psion audit follow-up)", () => {
  it("places name/source matching before the Common Modifier wiring index", () => {
    const prompt = buildImportSystemPrompt("classes")
    const nameIdx = prompt.indexOf("Name and source matching")
    const modifiersIdx = prompt.indexOf("Common Modifier wiring index")
    expect(nameIdx).toBeGreaterThan(-1)
    expect(modifiersIdx).toBeGreaterThan(nameIdx)
    expect(NAME_SOURCE_MATCHING_HINT).toContain("identical name string")
  })

  it("covers talent pools, class_talent, Specialization, and distinct category labels", () => {
    const prompt = buildByoExtractionPrompt("abilities", {
      customSystems: {
        abilityCategory: "Psionic Disciplines",
        classResourceLabels: "Psi Points, Psi Limit",
      },
    })
    expect(prompt).toContain("class_talent")
    expect(prompt).toContain("Discipline Talents")
    expect(prompt).toContain("Class Talents")
    expect(prompt).toContain("Specialization")
    expect(prompt).toContain("class_talents_known")
    expect(prompt).not.toContain("KibblesTasty Psion")
  })

  it("scopes feat isChoice to ability-catalog picks, not grant_feat milestones", () => {
    expect(CHOICE_EXTRACTION_HINT).toContain("do NOT use isChoice")
    expect(CHOICE_EXTRACTION_HINT).toContain("grant_feat")
    expect(CHOICE_EXTRACTION_HINT).toContain("custom ability catalog")
    expect(CHOICE_EXTRACTION_HINT).toContain("not another feat")
    expect(COMMON_MODIFIERS_IMPORT_HINT).toContain("never isChoice")
    expect(COMMON_MODIFIERS_IMPORT_HINT).toContain("ability catalog")
  })

  it("includes cleanup, marker legends, duplicate merge, and class-naming rules", () => {
    const prompt = buildImportSystemPrompt("all")
    expect(prompt).toContain(GENERAL_SOURCE_CLEANUP_HINT.slice(0, 40))
    expect(prompt).toContain(MARKER_LEGEND_SCAN_HINT.slice(0, 40))
    expect(prompt).toContain(DUPLICATE_ABILITY_MERGE_HINT.slice(0, 40))
    expect(CUSTOM_CLASS_IMPORT_HINT).toContain("exactly as it appears")
    expect(CUSTOM_CLASS_IMPORT_HINT).not.toContain("KibblesTasty Psion")
    expect(prompt).toContain("turn_start_bonus_grant")
    expect(prompt).toContain("expiresEndOfTurn")
  })

  it("covers exploit-library fields and cross-pass Leadership-style notes", () => {
    const prompt = buildByoExtractionPrompt("abilities", {
      customSystems: {
        abilityCategory: "Exploits",
        classResourceLabels: "Exploit Dice",
      },
    })
    expect(prompt).toContain("execution")
    expect(prompt).toContain("eligible_classes")
    expect(prompt).toContain("Section-intro rules propagate")
    expect(prompt).toContain("until_item_consumed")
    expect(prompt).toContain("up_to_proficiency_bonus")
    expect(prompt).toContain("Leadership modifier")
    expect(prompt).toContain("companion_stat_block")
    expect(prompt).toContain('"execution": "On a successful Grapple"')
    // Psion single-class pattern still uses source_name
    expect(prompt).toContain('"source_name": "Psion"')
  })
})
