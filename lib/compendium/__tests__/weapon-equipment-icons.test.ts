import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { getCompendiumItemIcon } from "@/lib/compendium/content-types"
import { enrichSrdMundaneEquipmentRow } from "@/lib/compendium/enrich-srd-magic-items"
import { SRD_ARMOR_ICONS_BY_NAME } from "@/lib/compendium/srd-item-icons-defaults"
import equipmentSeed from "@/lib/srd/seed-data/equipment.json"
import { weaponIconSlug } from "@/lib/compendium/weapon-icons"

describe("weapon equipment icon defaults", () => {
  it("resolves compendium weapon icons from the mastery visual grid mapping", () => {
    expect(
      getCompendiumItemIcon("equipment", {
        name: "Longsword",
        category: "Weapon",
      }),
    ).toBe("broadsword")
    expect(
      getCompendiumItemIcon("equipment", {
        name: "Greataxe",
        category: "Weapon",
      }),
    ).toBe("sharp-axe")
  })

  it("keeps explicit weapon icons when set", () => {
    expect(
      getCompendiumItemIcon("equipment", {
        name: "Longsword",
        category: "Weapon",
        icon: "custom-sword",
      }),
    ).toBe("custom-sword")
  })

  it("resolves compendium armor icons from bundled defaults", () => {
    expect(
      getCompendiumItemIcon("equipment", {
        name: "Shield",
        category: "Armor",
        subcategory: "Shield",
      }),
    ).toBe("checked-shield")
  })

  it("maps every bundled SRD weapon to an installed game-icons slug on seed enrich", () => {
    const iconsDir = path.join(process.cwd(), "public/icons")
    const weapons = equipmentSeed.filter((row) => row.category === "Weapon")

    for (const weapon of weapons) {
      const enriched = enrichSrdMundaneEquipmentRow({
        ...weapon,
        source: "D&D 5.5e SRD",
      })
      const icon = enriched.icon as string
      expect(icon, `missing icon for ${weapon.name}`).toBe(weaponIconSlug(weapon.name))
      expect(
        fs.existsSync(path.join(iconsDir, `${icon}.svg`)),
        `icon file missing for ${weapon.name}: ${icon}`,
      ).toBe(true)
    }
  })

  it("maps every bundled SRD mundane armor default on seed enrich", () => {
    const iconsDir = path.join(process.cwd(), "public/icons")
    const armor = equipmentSeed.filter((row) => row.category === "Armor")

    expect(armor.length).toBe(Object.keys(SRD_ARMOR_ICONS_BY_NAME).length)

    for (const row of armor) {
      const expected = SRD_ARMOR_ICONS_BY_NAME[row.name]
      expect(expected, `missing icon mapping for ${row.name}`).toBeTruthy()
      const enriched = enrichSrdMundaneEquipmentRow({
        ...row,
        source: "D&D 5.5e SRD",
      })
      expect(enriched.icon).toBe(expected)
      expect(fs.existsSync(path.join(iconsDir, `${expected}.svg`))).toBe(true)
    }
  })
})
