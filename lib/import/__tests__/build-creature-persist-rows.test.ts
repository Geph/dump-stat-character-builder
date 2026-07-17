import { describe, expect, it } from "vitest"
import { buildCreaturePersistRows } from "@/lib/import/build-creature-persist-rows"

const BASILISK_PROSE = `Basilisk Companion
Medium Monstrosity, Unaligned
Armor Class 15 plus PB (natural armor)
Hit Points 7 + 7 times caregiver's level
Speed 30 ft.
STR DEX CON INT WIS CHA
16 (+3) 10 (+0) 15 (+2) 5 (−3) 12 (+1) 10 (+0)
ACTIONS
Bite. Melee Weapon Attack: +3 plus PB to hit.`

describe("buildCreaturePersistRows", () => {
  it("parses prose description into a structured stat_block on persist", () => {
    const rows = buildCreaturePersistRows(
      [{ name: "Basilisk Companion", description: BASILISK_PROSE }],
      "Custom",
    )
    expect(rows).toHaveLength(1)
    const row = rows[0]
    expect(row.name).toBe("Basilisk Companion")
    expect(row.creature_type).toBe("Monstrosity")
    expect(row.size).toBe("Medium")
    const block = row.stat_block as { ac: { parts: unknown[] }; hp: { parts: unknown[] } }
    expect(block.ac.parts).toEqual([
      { type: "fixed", value: 15 },
      { type: "scale", ref: { kind: "proficiency_bonus" } },
    ])
    expect(block.hp.parts[0]).toEqual({ type: "fixed", value: 7 })
  })

  it("keeps an already-structured stat_block", () => {
    const rows = buildCreaturePersistRows(
      [
        {
          name: "Wolf",
          description: null,
          creature_type: "Beast",
          size: "Medium",
          cr: "1/4",
          stat_block: {
            name: "Wolf",
            ac: { parts: [{ type: "fixed", value: 12 }] },
            hp: { parts: [{ type: "fixed", value: 11 }] },
            traits: [],
            actions: [],
          },
        },
      ],
      "SRD",
    )
    expect(rows[0].source).toBe("SRD")
    expect((rows[0].stat_block as { ac: { parts: { value: number }[] } }).ac.parts[0].value).toBe(12)
  })
})
