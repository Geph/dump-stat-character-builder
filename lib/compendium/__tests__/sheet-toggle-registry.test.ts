import { describe, expect, it } from "vitest"
import {
  BUILTIN_SHEET_TOGGLES,
  getSheetToggleDefinition,
  isKnownSheetToggleId,
  mergeSheetToggleDefinitions,
} from "@/lib/compendium/sheet-toggle-registry"

describe("sheet-toggle-registry", () => {
  it("includes builtin rage and below-half-hp toggles", () => {
    const ids = BUILTIN_SHEET_TOGGLES.map((entry) => entry.id)
    expect(ids).toContain("while_raging")
    expect(ids).toContain("below_half_hp")
    expect(ids).not.toContain("in_combat_or_high_stakes")
  })

  it("resolves optional psion toggles by id", () => {
    expect(getSheetToggleDefinition("in_combat_or_high_stakes")?.sourceType).toBe("class_feature")
  })

  it("recognizes magic item toggle ids", () => {
    expect(isKnownSheetToggleId("magic_item:abc:power")).toBe(true)
    expect(getSheetToggleDefinition("magic_item:abc:power")?.sourceType).toBe("magic_item")
  })

  it("merges dynamic toggles without duplicating builtins", () => {
    const merged = mergeSheetToggleDefinitions([
      { id: "while_raging", label: "Duplicate", sourceType: "magic_item" },
      { id: "magic_item:x:y", label: "Item power", sourceType: "magic_item" },
    ])
    expect(merged.filter((entry) => entry.id === "while_raging")).toHaveLength(1)
    expect(merged.some((entry) => entry.id === "magic_item:x:y")).toBe(true)
  })
})
