import { describe, expect, it } from "vitest"
import {
  buildCharactersBulkExport,
  characterRowToExportItem,
  parseCharacterExportJson,
  prepareCharacterImportRow,
} from "@/lib/character/character-export-format"

const sampleRow = {
  id: "abc-123",
  local_id: "local-1",
  name: "Aldric",
  level: 5,
  class_id: "class-1",
  subclass_id: "sub-1",
  species_id: "sp-1",
  background_id: "bg-1",
  strength: 16,
  dexterity: 14,
  constitution: 15,
  intelligence: 10,
  wisdom: 12,
  charisma: 8,
  proficiency_bonus: 3,
  equipment_ids: ["eq-1"],
  spell_ids: ["spell-1"],
  feat_ids: [],
  experience: 6500,
  gold: 42,
  sheet_state: { hp: 32 },
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
  classes: { id: "class-1", name: "Fighter" },
  species: { id: "sp-1", name: "Human" },
  backgrounds: { id: "bg-1", name: "Soldier" },
  subclasses: { id: "sub-1", name: "Champion" },
}

describe("character export format", () => {
  it("strips ids, timestamps, and joined relations from export data", () => {
    const item = characterRowToExportItem(sampleRow)
    expect(item.type).toBe("dnd-character")
    expect(item.data.id).toBeUndefined()
    expect(item.data.classes).toBeUndefined()
    expect(item.data.name).toBe("Aldric")
    expect(item.data.sheet_state).toEqual({ hp: 32 })
    expect(item.refs).toEqual({
      class: "Fighter",
      subclass: "Champion",
      species: "Human",
      background: "Soldier",
    })
  })

  it("round-trips single and bulk exports", () => {
    const item = characterRowToExportItem(sampleRow)
    const single = parseCharacterExportJson(JSON.stringify(item))
    expect(single).toHaveLength(1)

    const bulk = buildCharactersBulkExport([item, item])
    const parsedBulk = parseCharacterExportJson(JSON.stringify(bulk))
    expect(parsedBulk).toHaveLength(2)
  })

  it("prepares import rows with defaults", () => {
    const item = characterRowToExportItem({
      ...sampleRow,
      level: 0,
      proficiency_bonus: undefined,
      feat_ids: undefined,
    })
    const row = prepareCharacterImportRow(item)
    expect(row.id).toBeUndefined()
    expect(row.level).toBe(1)
    expect(row.feat_ids).toEqual([])
    expect(row.proficiency_bonus).toBe(2)
    expect(row.name).toBe("Aldric")
  })

  it("rejects imports without a name", () => {
    const item = characterRowToExportItem({ ...sampleRow, name: "  " })
    expect(() => prepareCharacterImportRow(item)).toThrow(/missing a name/i)
  })
})
