import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import bundledSubclasses from "@/lib/srd/seed-data/subclasses.json"
import { SRD_CLASS_ICONS_BY_NAME } from "@/lib/compendium/class-icons-defaults"
import { enrichSrdSubclassRow } from "@/lib/compendium/enrich-srd-subclasses"
import {
  defaultSubclassIconForName,
  SRD_SUBCLASS_ICONS_BY_NAME,
} from "@/lib/compendium/subclass-icons-defaults"

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

  it("maps Barbarian PHB path icons from the curated defaults", () => {
    expect(SRD_SUBCLASS_ICONS_BY_NAME["Path of the Wild Heart"]).toBe("heart-inside")
    expect(SRD_SUBCLASS_ICONS_BY_NAME["Path of the World Tree"]).toBe("tree-door")
    expect(SRD_SUBCLASS_ICONS_BY_NAME["Path of the Zealot"]).toBe("church")
    for (const slug of ["heart-inside", "tree-door", "church"] as const) {
      expect(fs.existsSync(path.join(process.cwd(), "public/icons", `${slug}.svg`))).toBe(true)
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

  it("falls back to the parent class icon when no subclass icon is assigned", () => {
    expect(defaultSubclassIconForName("College of Dance", "Bard")).toBe(
      SRD_CLASS_ICONS_BY_NAME.Bard,
    )
    expect(defaultSubclassIconForName("Consuming Mind", "Psion")).toBe("rear-aura")
    expect(defaultSubclassIconForName("Oath of Devotion", "Paladin")).toBe(
      SRD_SUBCLASS_ICONS_BY_NAME["Oath of Devotion"],
    )

    const row = enrichSrdSubclassRow(
      {
        name: "College of Dance",
        source: "Player's Handbook",
        features: [],
      },
      "Bard",
    )
    expect(row.icon).toBe(SRD_CLASS_ICONS_BY_NAME.Bard)
  })

  it("keeps a stored custom icon instead of the class fallback", () => {
    const row = enrichSrdSubclassRow(
      {
        name: "College of Dance",
        source: "Custom",
        features: [],
        icon: "custom-icon",
      },
      "Bard",
    )
    expect(row.icon).toBe("custom-icon")
  })
})
