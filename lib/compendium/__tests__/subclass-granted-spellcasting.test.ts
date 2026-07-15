import { describe, expect, it } from "vitest"
import { SubclassImportSchema } from "@/lib/import/content-schema"
import {
  getMulticlassSpellSlotTables,
  resolveEffectiveClassSpellcasting,
} from "@/lib/compendium/spell-slots"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import type { DndClass, Subclass } from "@/lib/types"

describe("SubclassImportSchema spellcasting", () => {
  it("accepts subclass-granted spellcasting with caster_progression (Eldritch Knight)", () => {
    const parsed = SubclassImportSchema.parse({
      name: "Eldritch Knight",
      class_name: "Fighter",
      description: "Combines martial mastery with magic.",
      features: [],
      spellcasting: {
        ability: "Intelligence",
        caster_progression: "third",
      },
    })
    expect(parsed.spellcasting?.ability).toBe("Intelligence")
    expect(parsed.spellcasting?.caster_progression).toBe("third")
  })

  it("defaults to undefined when omitted (most subclasses don't cast)", () => {
    const parsed = SubclassImportSchema.parse({
      name: "Champion",
      class_name: "Fighter",
      description: "Pure martial prowess.",
      features: [],
    })
    expect(parsed.spellcasting).toBeUndefined()
  })
})

function fighterWithEldritchKnight(level: number): CharacterClassDetail {
  const fighter: DndClass = {
    id: "fighter",
    name: "Fighter",
    description: null,
    card_blurb: null,
    hit_die: 10,
    primary_ability: null,
    saving_throws: null,
    armor_proficiencies: null,
    weapon_proficiencies: null,
    skill_choices: null,
    starting_equipment: null,
    starting_equipment_groups: null,
    starting_gold: null,
    features: [],
    spellcasting: null, // Fighter itself doesn't cast — only the Eldritch Knight subclass does.
    icon: null,
    source: "srd",
    creator_url: null,
    created_at: "",
  }
  const eldritchKnight: Subclass = {
    id: "eldritch-knight",
    class_id: "fighter",
    name: "Eldritch Knight",
    description: null,
    features: [],
    spellcasting: { ability: "Intelligence", caster_progression: "third" },
    icon: null,
    source: "srd",
    creator_url: null,
    created_at: "",
  }
  return {
    row: { class_id: "fighter", order: 0, level, subclass_id: "eldritch-knight" } as CharacterClassDetail["row"],
    class: fighter,
    subclass: eldritchKnight,
  }
}

describe("resolveEffectiveClassSpellcasting", () => {
  it("falls back to the subclass's spellcasting when the class itself has none", () => {
    const entry = fighterWithEldritchKnight(3)
    expect(resolveEffectiveClassSpellcasting(entry)).toEqual({
      ability: "Intelligence",
      caster_progression: "third",
    })
  })

  it("prefers the class's own spellcasting over the subclass's when both are set", () => {
    const entry = fighterWithEldritchKnight(3)
    entry.class = { ...entry.class!, spellcasting: { ability: "Wisdom", caster_progression: "full" } }
    expect(resolveEffectiveClassSpellcasting(entry)?.ability).toBe("Wisdom")
  })

  it("returns null when neither the class nor subclass casts", () => {
    const entry = fighterWithEldritchKnight(3)
    entry.subclass = { ...entry.subclass!, spellcasting: null }
    expect(resolveEffectiveClassSpellcasting(entry)).toBeNull()
  })
})

describe("Eldritch Knight spell slots end-to-end", () => {
  it("Fighter 3 with Eldritch Knight gets 2 first-level slots (third caster)", () => {
    const entry = fighterWithEldritchKnight(3)
    const tables = getMulticlassSpellSlotTables([
      {
        className: entry.class!.name,
        classLevel: entry.row.level,
        spellcasting: resolveEffectiveClassSpellcasting(entry),
      },
    ])
    expect(tables).toHaveLength(1)
    expect(tables[0]!.type).toBe("third")
    expect(tables[0]!.slotsByLevel[0]).toBe(2)
  })

  it("Fighter 7 with Eldritch Knight gets 4/2 slots, matching the PHB table", () => {
    const entry = fighterWithEldritchKnight(7)
    const tables = getMulticlassSpellSlotTables([
      {
        className: entry.class!.name,
        classLevel: entry.row.level,
        spellcasting: resolveEffectiveClassSpellcasting(entry),
      },
    ])
    expect(tables[0]!.slotsByLevel[0]).toBe(4)
    expect(tables[0]!.slotsByLevel[1]).toBe(2)
  })

  it("Fighter below level 3 with Eldritch Knight has no slots yet", () => {
    const entry = fighterWithEldritchKnight(1)
    const tables = getMulticlassSpellSlotTables([
      {
        className: entry.class!.name,
        classLevel: entry.row.level,
        spellcasting: resolveEffectiveClassSpellcasting(entry),
      },
    ])
    expect(tables[0]!.slotsByLevel.every((count) => count === 0)).toBe(true)
  })

  it("plain Fighter (no subclass) gets no spell slot table at all", () => {
    const entry = fighterWithEldritchKnight(5)
    entry.subclass = null
    const tables = getMulticlassSpellSlotTables(
      [
        {
          className: entry.class!.name,
          classLevel: entry.row.level,
          spellcasting: resolveEffectiveClassSpellcasting(entry),
        },
      ].filter((row) => row.spellcasting),
    )
    expect(tables).toHaveLength(0)
  })
})
