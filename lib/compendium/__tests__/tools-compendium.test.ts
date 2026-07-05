import { describe, expect, it } from "vitest"
import {
  getAllSeedToolNames,
  getMusicalInstrumentNames,
  getStandardProficiencyToolNames,
  toolNamesForPool,
} from "@/lib/compendium/tool-options"
import { enrichClassFeatureWithModifierPresets } from "@/lib/compendium/enrich-srd-class-features"

describe("SRD tools compendium seed", () => {
  it("includes 41 bundled tool entries", () => {
    expect(getAllSeedToolNames()).toHaveLength(41)
  })

  it("keeps the 27 PHB proficiency-level tool names", () => {
    expect(getStandardProficiencyToolNames()).toHaveLength(27)
    expect(getStandardProficiencyToolNames()).toContain("Musical Instrument")
    expect(getStandardProficiencyToolNames()).toContain("Gaming Set")
  })

  it("filters musical instrument pool for Bard picks", () => {
    const pool = toolNamesForPool("musical", getAllSeedToolNames())
    expect(pool).toContain("Lute")
    expect(pool).toContain("Musical Instrument")
    expect(pool).not.toContain("Thieves' Tools")
    expect(getMusicalInstrumentNames().every((name) => pool.includes(name))).toBe(true)
  })
})

describe("class tool choice wiring", () => {
  it("Bardic Inspiration uses musical tool pool", () => {
    const feature = enrichClassFeatureWithModifierPresets("Bard", {
      level: 1,
      name: "Bardic Inspiration",
      description: "Grant inspiration and learn instruments.",
    })
    const toolMod = feature.linkedModifiers?.flatMap((inst) => inst.characteristics ?? []).find(
      (mod) => mod.type === "tool_proficiencies" && (mod.choiceCount ?? 0) > 0,
    )
    expect(toolMod?.toolChoicePool).toBe("musical")
    expect(toolMod?.choiceCount).toBe(3)
    const pool = toolNamesForPool("musical", getAllSeedToolNames())
    expect(pool).toContain("Lute")
  })
})
