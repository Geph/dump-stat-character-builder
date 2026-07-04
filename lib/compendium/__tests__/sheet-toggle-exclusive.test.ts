import { describe, expect, it } from "vitest"
import {
  applySheetToggleChange,
  PRIMORDIAL_ASPECT_TOGGLES,
} from "@/lib/compendium/sheet-toggle-registry"

describe("applySheetToggleChange exclusive groups", () => {
  const definitions = PRIMORDIAL_ASPECT_TOGGLES

  it("deactivates sibling primordial aspects when activating fire", () => {
    const next = applySheetToggleChange(
      ["primordial_aspect_cold"],
      "primordial_aspect_fire",
      definitions,
    )
    expect(next).toEqual(["primordial_aspect_fire"])
  })

  it("deactivates cold and lightning when fire was active via cold first", () => {
    const withLightning = applySheetToggleChange(
      [],
      "primordial_aspect_lightning",
      definitions,
    )
    const withFire = applySheetToggleChange(
      withLightning,
      "primordial_aspect_fire",
      definitions,
    )
    expect(withFire).toEqual(["primordial_aspect_fire"])
  })
})
