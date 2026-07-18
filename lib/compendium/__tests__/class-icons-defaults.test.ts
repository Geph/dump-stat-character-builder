import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
  defaultClassIconForName,
  HOMEBREW_CLASS_ICONS_BY_NAME,
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
    expect(defaultClassIconForName("LaserLlama Psion")).toBeNull()
  })

  it("ships rear-aura in public/icons", () => {
    const icon = HOMEBREW_CLASS_ICONS_BY_NAME.Psion
    expect(fs.existsSync(path.join(process.cwd(), "public/icons", `${icon}.svg`))).toBe(true)
  })

  it("uses rear-aura in compendium default icon lookup", () => {
    expect(getCompendiumItemIcon("classes", { name: "KibblesTasty Psion" })).toBe("rear-aura")
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
})
