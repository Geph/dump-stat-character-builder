import { describe, expect, it } from "vitest"
import spellsSeed from "@/lib/srd/seed-data/spells.json"
import { BUILDER_SPELL_COLUMNS } from "@/lib/data/builder-compendium-cache"

const SPELL_OMIT_COLUMNS = new Set(["created_at", "creator_url", "higher_levels", "material", "psionic_augments"])

function slimSpellRow(row: Record<string, unknown>): Record<string, unknown> {
  const selected = BUILDER_SPELL_COLUMNS.split(",").map((c) => c.trim())
  const out: Record<string, unknown> = {}
  for (const key of selected) {
    if (key in row) out[key] = row[key]
  }
  return out
}

describe("builder spell column select", () => {
  it("drops unused heavy spell fields from SRD seed payload", () => {
    const rows = spellsSeed as Record<string, unknown>[]
    const fullBytes = JSON.stringify(rows).length
    const slimRows = rows.map((row) => slimSpellRow(row))
    const slimBytes = JSON.stringify(slimRows).length

    expect(slimBytes).toBeLessThan(fullBytes)
    const savingsPct = ((fullBytes - slimBytes) / fullBytes) * 100
    // SRD spells: higher_levels + material dominate; expect meaningful shrink.
    expect(savingsPct).toBeGreaterThan(10)

    for (const row of rows) {
      for (const omitted of SPELL_OMIT_COLUMNS) {
        expect(BUILDER_SPELL_COLUMNS).not.toContain(omitted)
      }
    }
  })
})
