import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
  defaultClassIconForName,
  HOMEBREW_CLASS_ICONS_BY_NAME,
  resolveAttachedClassIcon,
  SRD_CLASS_ICONS_BY_NAME,
} from "@/lib/compendium/class-icons-defaults"
import { getCompendiumItemIcon } from "@/lib/compendium/content-types"
import { enrichImportedClassRow } from "@/lib/import/enrich-import-classes"

describe("class icon defaults", () => {
  it("maps Kibbles Psion name variants to rear-aura", () => {
    expect(defaultClassIconForName("Psion")).toBe("rear-aura")
    expect(defaultClassIconForName("KibblesTasty Psion")).toBe("rear-aura")
    expect(defaultClassIconForName("Kibbles' Tasty Psion")).toBe("rear-aura")
    expect(defaultClassIconForName("Fighter")).toBe(SRD_CLASS_ICONS_BY_NAME.Fighter)
    expect(resolveAttachedClassIcon({ name: "Martyr", icon: null })).toBe("bleeding-heart")
    expect(resolveAttachedClassIcon({ name: "Martyr", icon: "drop" })).toBe("drop")
    expect(
      resolveAttachedClassIcon({ name: "Martyr", icon: "bleeding-heart" }, { icon: "heart-plus" }),
    ).toBe("heart-plus")
    expect(defaultClassIconForName("LaserLlama Psion")).toBeNull()
  })

  it("maps Kibbles Occultist, Warden, and Inventor to curated icons", () => {
    expect(defaultClassIconForName("Occultist")).toBe("pentacle")
    expect(defaultClassIconForName("Warden")).toBe("tribal-shield")
    expect(defaultClassIconForName("Warden (Kibbles Tasty)")).toBe("tribal-shield")
    expect(defaultClassIconForName("Warden (Mage Hand Press)")).toBeNull()
    expect(defaultClassIconForName("Inventor")).toBe("gears")
    expect(defaultClassIconForName("KibblesTasty Inventor")).toBe("gears")
    expect(defaultClassIconForName("Kibbles' Tasty Inventor")).toBe("gears")
  })

  it("ships curated Kibbles icons in public/icons", () => {
    for (const icon of [
      HOMEBREW_CLASS_ICONS_BY_NAME.Psion,
      HOMEBREW_CLASS_ICONS_BY_NAME.Occultist,
      HOMEBREW_CLASS_ICONS_BY_NAME.Warden,
      HOMEBREW_CLASS_ICONS_BY_NAME.Inventor,
      HOMEBREW_CLASS_ICONS_BY_NAME.Dancer,
      HOMEBREW_CLASS_ICONS_BY_NAME.Martyr,
    ]) {
      expect(fs.existsSync(path.join(process.cwd(), "public/icons", `${icon}.svg`))).toBe(true)
    }
  })

  it("uses rear-aura in compendium default icon lookup", () => {
    expect(getCompendiumItemIcon("classes", { name: "KibblesTasty Psion" })).toBe("rear-aura")
  })

  it("uses gears for Inventor in compendium default icon lookup", () => {
    expect(getCompendiumItemIcon("classes", { name: "Inventor" })).toBe("gears")
  })

  it("uses the parent class icon for subclasses without an assigned icon", () => {
    expect(
      getCompendiumItemIcon("subclasses", { name: "College of Dance", class_name: "Bard" }),
    ).toBe("musical-notes")
    expect(getCompendiumItemIcon("subclasses", { name: "Champion" })).toBe("mounted-knight")
  })

  it("stamps rear-aura onto imported Psion class rows without an icon", () => {
    const row = enrichImportedClassRow(
      {
        name: "KibblesTasty Psion",
        description: null,
        hit_die: 6,
        features: [],
      },
      undefined,
    )
    expect(row.icon).toBe("rear-aura")
  })

  it("stamps gears onto imported Inventor class rows without an icon", () => {
    const row = enrichImportedClassRow(
      {
        name: "Inventor",
        description: null,
        hit_die: 8,
        features: [],
      },
      undefined,
    )
    expect(row.icon).toBe("gears")
  })
})
