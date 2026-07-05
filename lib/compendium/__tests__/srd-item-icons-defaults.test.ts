import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { enrichSrdFeatRow } from "@/lib/compendium/enrich-srd-feats"
import { enrichSrdSpeciesRow } from "@/lib/compendium/enrich-srd-species"
import { enrichSrdToolRow } from "@/lib/compendium/enrich-srd-tools"
import { normalizeBackgroundRows } from "@/lib/compendium/normalize-backgrounds"
import {
  SRD_BACKGROUND_ICONS_BY_NAME,
  SRD_FEAT_ICONS_BY_NAME,
  SRD_SPECIES_ICONS_BY_NAME,
  SRD_TOOL_ICONS_BY_NAME,
} from "@/lib/compendium/srd-item-icons-defaults"
import { getAllSeedToolNames } from "@/lib/compendium/tool-options"

describe("SRD item icon defaults", () => {
  it("maps bundled species icons on seed enrich", () => {
    const row = enrichSrdSpeciesRow({
      name: "Dragonborn",
      source: "D&D 5.5e SRD",
      traits: [],
    })
    expect(row.icon).toBe(SRD_SPECIES_ICONS_BY_NAME.Dragonborn)
  })

  it("maps bundled feat icons on seed enrich", () => {
    const row = enrichSrdFeatRow({
      name: "Alert",
      source: "D&D 5.5e SRD",
      description: "Always on guard.",
    })
    expect(row.icon).toBe(SRD_FEAT_ICONS_BY_NAME.Alert)
  })

  it("maps bundled background icons on seed enrich", () => {
    const [row] = normalizeBackgroundRows([
      {
        name: "Acolyte",
        source: "D&D 5.5e SRD",
      },
    ])
    expect(row.icon).toBe(SRD_BACKGROUND_ICONS_BY_NAME.Acolyte)
  })

  it("maps bundled tool icons on seed enrich", () => {
    const row = enrichSrdToolRow({
      name: "Alchemist's Supplies",
      source: "D&D 5.5e SRD",
      tool_group: "artisans",
    })
    expect(row.icon).toBe(SRD_TOOL_ICONS_BY_NAME["Alchemist's Supplies"])
  })

  it("maps all 41 bundled SRD tools to installed game-icons slugs", () => {
    const iconsDir = path.join(process.cwd(), "public/icons")

    for (const name of getAllSeedToolNames()) {
      const icon = SRD_TOOL_ICONS_BY_NAME[name]
      expect(icon, `missing icon mapping for ${name}`).toBeTruthy()
      expect(
        fs.existsSync(path.join(iconsDir, `${icon}.svg`)),
        `icon file missing for ${name}: ${icon}`,
      ).toBe(true)
    }
  })

  it("does not apply defaults to custom homebrew rows", () => {
    const row = enrichSrdSpeciesRow({
      name: "Dragonborn",
      source: "Custom",
      traits: [],
    })
    expect(row.icon).toBeUndefined()
  })
})
