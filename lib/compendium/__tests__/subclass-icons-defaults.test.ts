import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import bundledSubclasses from "@/lib/srd/seed-data/subclasses.json"
import { enrichSrdSubclassRow } from "@/lib/compendium/enrich-srd-subclasses"
import { SRD_SUBCLASS_ICONS_BY_NAME } from "@/lib/compendium/subclass-icons-defaults"

describe("SRD subclass icon defaults", () => {
  it("maps every bundled SRD subclass to an installed game-icons slug", () => {
    const iconsDir = path.join(process.cwd(), "public/icons")

    for (const row of bundledSubclasses) {
      const icon = SRD_SUBCLASS_ICONS_BY_NAME[row.name]
      expect(icon, `missing icon mapping for ${row.name}`).toBeTruthy()
      expect(
        fs.existsSync(path.join(iconsDir, `${icon}.svg`)),
        `icon file missing for ${row.name}: ${icon}`,
      ).toBe(true)
    }
  })

  it("applies bundled subclass icons on seed enrich", () => {
    const row = enrichSrdSubclassRow(
      {
        name: "Circle of the Land",
        source: "D&D 5.5e SRD",
        features: [],
      },
      "Druid",
    )
    expect(row.icon).toBe(SRD_SUBCLASS_ICONS_BY_NAME["Circle of the Land"])
  })

  it("does not apply defaults to custom homebrew subclasses", () => {
    const row = enrichSrdSubclassRow(
      {
        name: "Circle of the Land",
        source: "Custom",
        features: [],
      },
      "Druid",
    )
    expect(row.icon).toBeUndefined()
  })
})
