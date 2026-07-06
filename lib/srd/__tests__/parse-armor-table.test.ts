import { describe, expect, it } from "vitest"
import { parseAll } from "@/lib/srd/parser.mjs"

/** Minimal SRD armor table excerpt (full file is gitignored under data/srd-source/). */
const ARMOR_TABLE_MD = `
**Armor**

<table>
  <thead>
    <tr>
      <th>Armor</th>
      <th>Armor Class (AC)</th>
      <th>Strength</th>
      <th>Stealth</th>
      <th>Weight</th>
      <th>Cost</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th colspan="6"><em>Light Armor (1 Minute to Don or Doff)</em></th>
    </tr>
    <tr>
      <td>Padded Armor</td>
      <td>11 + Dex modifier</td>
      <td>—</td>
      <td>Disadvantage</td>
      <td>8 lb.</td>
      <td>5 GP</td>
    </tr>
    <tr>
      <td>Leather Armor</td>
      <td>11 + Dex modifier</td>
      <td>—</td>
      <td>—</td>
      <td>10 lb.</td>
      <td>10 GP</td>
    </tr>
    <tr>
      <td>Studded Leather Armor</td>
      <td>12 + Dex modifier</td>
      <td>—</td>
      <td>—</td>
      <td>13 lb.</td>
      <td>45 GP</td>
    </tr>
    <tr>
      <th colspan="6"><em>Medium Armor (5 Minutes to Don and 1 Minute to Doff)</em></th>
    </tr>
    <tr>
      <td>Hide Armor</td>
      <td>12 + Dex modifier (max 2)</td>
      <td>—</td>
      <td>—</td>
      <td>12 lb.</td>
      <td>10 GP</td>
    </tr>
    <tr>
      <td>Chain Shirt</td>
      <td>13 + Dex modifier (max 2)</td>
      <td>—</td>
      <td>—</td>
      <td>20 lb.</td>
      <td>50 GP</td>
    </tr>
    <tr>
      <td>Scale Mail</td>
      <td>14 + Dex modifier (max 2)</td>
      <td>—</td>
      <td>Disadvantage</td>
      <td>45 lb.</td>
      <td>50 GP</td>
    </tr>
    <tr>
      <td>Breastplate</td>
      <td>14 + Dex modifier (max 2)</td>
      <td>—</td>
      <td>—</td>
      <td>20 lb.</td>
      <td>400 GP</td>
    </tr>
    <tr>
      <td>Half Plate Armor</td>
      <td>15 + Dex modifier (max 2)</td>
      <td>—</td>
      <td>Disadvantage</td>
      <td>40 lb.</td>
      <td>750 GP</td>
    </tr>
    <tr>
      <th colspan="6"><em>Heavy Armor (10 Minutes to Don and 5 Minutes to Doff)</em></th>
    </tr>
    <tr>
      <td>Ring Mail</td>
      <td>14</td>
      <td>—</td>
      <td>Disadvantage</td>
      <td>40 lb.</td>
      <td>30 GP</td>
    </tr>
    <tr>
      <td>Chain Mail</td>
      <td>16</td>
      <td>Str 13</td>
      <td>Disadvantage</td>
      <td>55 lb.</td>
      <td>75 GP</td>
    </tr>
    <tr>
      <td>Splint Armor</td>
      <td>17</td>
      <td>Str 15</td>
      <td>Disadvantage</td>
      <td>60 lb.</td>
      <td>200 GP</td>
    </tr>
    <tr>
      <td>Plate Armor</td>
      <td>18</td>
      <td>Str 15</td>
      <td>Disadvantage</td>
      <td>65 lb.</td>
      <td>1,500 GP</td>
    </tr>
    <tr>
      <th colspan="6"><em>Shield (Utilize Action to Don or Doff)</em></th>
    </tr>
    <tr>
      <td>Shield</td>
      <td>+2</td>
      <td>—</td>
      <td>—</td>
      <td>6 lb.</td>
      <td>10 GP</td>
    </tr>
  </tbody>
</table>
`

describe("parseArmorTable", () => {
  it("parses all 13 SRD armor rows including names ending in Armor", () => {
    const data = parseAll({
      origins: "",
      classes: "",
      spells: "",
      feats: "",
      equipment: ARMOR_TABLE_MD,
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
      equipment: ARMOR_TABLE_MD,
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
