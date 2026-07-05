import { describe, expect, it } from "vitest"
import {
  buildCharacterSheetToggleDefinitions,
  collectReferencedSheetToggleIds,
} from "@/lib/character/collect-referenced-sheet-toggles"
import type { Feature } from "@/lib/types"

describe("collectReferencedSheetToggleIds", () => {
  it("includes rage when a feature modifier requires while_raging", () => {
    const ids = collectReferencedSheetToggleIds({
      features: [
        {
          level: 1,
          name: "Rage",
          description: "",
          linkedModifiers: [
            {
              instanceId: "modinst_rage",
              catalogRefId: "cat_char_damage_roll_modifiers",
              characteristics: [
                {
                  id: "mod_rage",
                  type: "damage_roll_modifiers",
                  entries: [{ bonus: 2, target: "melee" }],
                  limitations: [
                    {
                      id: "lim_rage",
                      kind: "sheet_toggle",
                      rule: "requires_active",
                      value: "while_raging",
                    },
                  ],
                },
              ],
            },
          ],
        } as Feature,
      ],
      feats: [],
      catalog: [],
    })
    expect(ids.has("while_raging")).toBe(true)
    expect(ids.has("form_of_dread")).toBe(false)
  })

  it("buildCharacterSheetToggleDefinitions omits unreferenced builtins", () => {
    const defs = buildCharacterSheetToggleDefinitions(new Set(["while_raging"]), [])
    expect(defs.map((entry) => entry.id)).toEqual(["while_raging"])
  })
})
