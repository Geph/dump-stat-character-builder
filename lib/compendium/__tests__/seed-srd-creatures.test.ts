import { describe, expect, it } from "vitest"
import { buildSrdCreatureSeedRows } from "@/lib/compendium/seed-srd-creatures"
import { SRD_SOURCE } from "@/lib/srd/source"

describe("buildSrdCreatureSeedRows", () => {
  it("seeds all 84 SRD creatures with structured stat blocks", () => {
    const rows = buildSrdCreatureSeedRows()
    expect(rows).toHaveLength(84)
    expect(rows.every((row) => row.source === SRD_SOURCE)).toBe(true)
    expect(
      rows.every((row) => row.category === "creature" || row.category === "companion"),
    ).toBe(true)
    // Find Steed's summon is the one owner-scaled companion in the SRD seed.
    expect(
      rows.filter((row) => row.category === "companion").map((row) => row.name),
    ).toEqual(["Otherworldly Steed"])
    expect(rows.every((row) => row.stat_block != null)).toBe(true)
    expect(rows.every((row) => row.import_payload != null)).toBe(true)

    const wolf = rows.find((row) => row.name === "Wolf")
    expect(wolf).toMatchObject({
      creature_type: "Beast",
      size: "Medium",
      cr: "1/4",
      xp: 50,
    })
    expect((wolf?.stat_block as { ac: { parts: unknown[] } }).ac.parts).toEqual([
      { type: "fixed", value: 12 },
    ])
  })
})
