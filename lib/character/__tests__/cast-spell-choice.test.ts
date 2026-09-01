import { describe, expect, it } from "vitest"
import {
  filterSpellsForCastChoice,
  spellMatchesCastingTimeFilter,
} from "@/lib/character/cast-spell-choice"
import type { Spell } from "@/lib/types"

function spell(partial: Pick<Spell, "id" | "name" | "level"> & Partial<Spell>): Spell {
  return {
    school: "Evocation",
    casting_time: "1 action",
    range: "60 feet",
    components: ["V", "S"],
    material: null,
    duration: "Instantaneous",
    concentration: false,
    ritual: false,
    description: null,
    higher_levels: null,
    classes: ["Wizard"],
    icon: null,
    ...partial,
  } as Spell
}

describe("cast spell choice filters", () => {
  it("matches one-action spells and rejects bonus/reaction times", () => {
    expect(spellMatchesCastingTimeFilter("1 action", "action")).toBe(true)
    expect(spellMatchesCastingTimeFilter("one action", "action")).toBe(true)
    expect(spellMatchesCastingTimeFilter("1 bonus action", "action")).toBe(false)
    expect(spellMatchesCastingTimeFilter("1 reaction", "action")).toBe(false)
    expect(spellMatchesCastingTimeFilter("1 bonus action", "bonus_action")).toBe(true)
  })

  it("keeps only one-action known spells for Reactive Spell", () => {
    const firebolt = spell({ id: "fb", name: "Fire Bolt", level: 0, casting_time: "1 action" })
    const misty = spell({ id: "ms", name: "Misty Step", level: 2, casting_time: "1 bonus action" })
    const shield = spell({ id: "sh", name: "Shield", level: 1, casting_time: "1 reaction" })
    const hold = spell({ id: "hp", name: "Hold Person", level: 2, casting_time: "1 action" })
    expect(
      filterSpellsForCastChoice([firebolt, misty, shield, hold], { castingTime: "action" }).map(
        (row) => row.name,
      ),
    ).toEqual(["Fire Bolt", "Hold Person"])
  })
})
