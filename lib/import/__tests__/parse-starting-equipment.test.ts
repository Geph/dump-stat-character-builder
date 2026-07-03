import { describe, expect, it } from "vitest"
import { parseStartingEquipmentFromText } from "@/lib/import/parse-starting-equipment"

describe("parseStartingEquipmentFromText", () => {
  it("parses (a)/(b) equipment choices from Starting Equipment prose", () => {
    const parsed = parseStartingEquipmentFromText(`
Starting Equipment
You start with the following equipment, in addition to the equipment granted by your background:
(a) a shortsword; or (b) any simple weapon
`)

    expect(parsed.starting_equipment_groups).toHaveLength(1)
    expect(parsed.starting_equipment_groups[0]?.options).toHaveLength(2)
    expect(parsed.starting_equipment_groups[0]?.options[0]?.label).toMatch(/^\(a\)/)
    expect(parsed.starting_equipment_groups[0]?.options[1]?.label).toMatch(/^\(b\)/)
  })

  it("parses GP-only options", () => {
    const parsed = parseStartingEquipmentFromText(
      "Choose: (a) 5 GP; or (b) 10 GP",
    )
    expect(parsed.starting_gold).toBe(10)
    expect(parsed.starting_equipment_groups[0]?.options).toHaveLength(2)
  })
})
