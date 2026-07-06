import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { parseAll } from "@/lib/srd/parser.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "../../..")
const equipmentMd = fs.readFileSync(
  path.join(root, "data/srd-source/equipment.md"),
  "utf8",
)

describe("parseArmorTable", () => {
  it("parses all 13 SRD armor rows including names ending in Armor", () => {
    const data = parseAll({
      origins: "",
      classes: "",
      spells: "",
      feats: "",
      equipment: equipmentMd,
      magicItems: "",
    })

    const armor = data.equipment.filter(
      (row) => row.category === "Armor" || row.name === "Shield",
    )
    expect(armor.map((row) => row.name).sort()).toEqual(
      [
        "Breastplate",
        "Chain Mail",
        "Chain Shirt",
        "Half Plate Armor",
        "Hide Armor",
        "Leather Armor",
        "Padded Armor",
        "Plate Armor",
        "Ring Mail",
        "Scale Mail",
        "Shield",
        "Splint Armor",
        "Studded Leather Armor",
      ].sort(),
    )
  })

  it("preserves SRD armor stats for representative rows", () => {
    const data = parseAll({
      origins: "",
      classes: "",
      spells: "",
      feats: "",
      equipment: equipmentMd,
      magicItems: "",
    })
    const byName = Object.fromEntries(data.equipment.map((row) => [row.name, row]))

    expect(byName["Padded Armor"]).toMatchObject({
      subcategory: "Light Armor",
      properties: {
        ac: "11 + Dex modifier",
        disadvantage: "Stealth",
      },
      weight: 8,
      cost: { amount: 5, unit: "GP" },
    })

    expect(byName["Plate Armor"]).toMatchObject({
      subcategory: "Heavy Armor",
      properties: {
        ac: "18",
        strength_requirement: "Str 15",
        disadvantage: "Stealth",
      },
      weight: 65,
      cost: { amount: 1500, unit: "GP" },
    })

    expect(byName["Chain Mail"]).toMatchObject({
      subcategory: "Heavy Armor",
      properties: {
        ac: "16",
        strength_requirement: "Str 13",
        disadvantage: "Stealth",
      },
      weight: 55,
      cost: { amount: 75, unit: "GP" },
    })
  })
})
