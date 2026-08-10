import { describe, expect, it } from "vitest"
import { buildCreaturePersistRows } from "@/lib/import/build-creature-persist-rows"
import { loadKibblesTastyPack } from "@/lib/seed-packs/kibbles-tasty/load"
import { loadMageHandPressPack } from "@/lib/seed-packs/mage-hand-press/load"

describe("example seed pack creatures", () => {
  it("persists every MHP creature row without throwing", () => {
    const { files } = loadMageHandPressPack()
    const creatures = files.flatMap((file) => file.creatures ?? [])
    expect(creatures.length).toBeGreaterThan(0)
    const rows = buildCreaturePersistRows(creatures, "Mage Hand Press")
    expect(rows).toHaveLength(creatures.length)
    expect(rows.every((row) => row.name.trim().length > 0)).toBe(true)
  })

  it("persists every Kibbles creature row without throwing", () => {
    const { files } = loadKibblesTastyPack()
    const creatures = files.flatMap((file) => file.creatures ?? [])
    expect(creatures.length).toBeGreaterThan(0)
    const rows = buildCreaturePersistRows(creatures, "Kibbles Tasty")
    expect(rows).toHaveLength(creatures.length)
    expect(rows.every((row) => row.name.trim().length > 0)).toBe(true)
  })
})
