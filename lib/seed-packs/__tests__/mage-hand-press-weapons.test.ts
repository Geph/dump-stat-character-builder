import { describe, expect, it } from "vitest"
import weapons from "@/lib/seed-packs/mage-hand-press/magehandpress-weapons.json"
import { loadMageHandPressPack } from "@/lib/seed-packs/mage-hand-press/load"
import { normalizeEquipmentRows } from "@/lib/import/normalize-equipment"
import { parseImportContentJson } from "@/lib/import/parse-import-content-json"

describe("Mage Hand Press weapons seed", () => {
  it("parses and bundles all new weapon rows", () => {
    const parsed = parseImportContentJson(JSON.stringify(weapons))
    expect(parsed?.equipment).toHaveLength(24)

    const pack = loadMageHandPressPack()
    expect(pack.manifest.files).toHaveLength(pack.files.length)
    expect(pack.manifest.files).toContain("magehandpress-weapons.json")
    expect(pack.files).toContain(weapons)
  })

  it("preserves representative melee and ranged weapon mechanics", () => {
    const rows = normalizeEquipmentRows(
      weapons.equipment.map((row) => ({ ...row })) as unknown as Record<string, unknown>[],
    )
    const katana = rows.find((row) => row.name === "Katana")
    expect(katana?.subcategory).toBe("Martial Melee")
    expect(katana?.properties).toMatchObject({
      damage: "1d8 Slashing",
      properties: ["Finesse", "Versatile (1d10)"],
      mastery: "Vex",
    })

    const ballista = rows.find((row) => row.name === "Ballista")
    expect(ballista?.properties).toMatchObject({
      damage: "1d10 Piercing",
      properties: expect.arrayContaining([
        "Ammunition (Range 100/400; Bolt)",
        "Mounted (1d12)",
      ]),
      mastery: "Mounted",
      mastery_damage: "1d12",
    })

    const repeatingCrossbow = rows.find((row) => row.name === "Repeating Crossbow")
    expect(repeatingCrossbow?.properties).toMatchObject({
      properties: expect.arrayContaining(["Reload (4)"]),
      mastery: "Automatic",
    })
  })
})
