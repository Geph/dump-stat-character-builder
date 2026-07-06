import { describe, expect, it } from "vitest"
import { getClassDetailHeroBadges } from "@/lib/builder/class-detail-badges"
import type { DndClass } from "@/lib/types"

function wizardFixture(): DndClass {
  return {
    id: "wizard",
    name: "Wizard",
    description: null,
        hit_die: 6,
    primary_ability: ["Intelligence"],
    saving_throws: null,
    armor_proficiencies: null,
    weapon_proficiencies: null,
    skill_choices: undefined,
    starting_equipment: null,
    starting_equipment_groups: null,
    starting_gold: null,
    features: [
      { level: 1, name: "Arcane Recovery", description: "Once per day when you finish a Short Rest..." },
      { level: 1, name: "Spellcasting", description: "" },
    ],
    spellcasting: {
      ability: "Intelligence",
      prepared: true,
      spellbook: true,
      caster_progression: "full",
    },
    icon: null,
    source: "SRD",
    creator_url: null,
    created_at: "",
  } as unknown as unknown as DndClass
}

describe("getClassDetailHeroBadges", () => {
  it("includes prepared caster, arcane recovery, and no weapon mastery for Wizard", () => {
    expect(getClassDetailHeroBadges(wizardFixture())).toEqual([
      { label: "PREPARED CASTER" },
      { label: "ARCANE RECOVERY", emphasis: true },
    ])
  })

  it("includes rage for Barbarian", () => {
    const cls = wizardFixture()
    cls.name = "Barbarian"
    cls.spellcasting = null
    cls.features = [{ level: 1, name: "Rage", description: "" }]
    expect(getClassDetailHeroBadges(cls)).toEqual([{ label: "RAGE", emphasis: true }])
  })

  it("includes weapon mastery when the class has the feature", () => {
    const cls = wizardFixture()
    cls.name = "Fighter"
    cls.spellcasting = null
    cls.features = [
      { level: 1, name: "Weapon Mastery", description: "", choices: { category: "Weapon Mastery", count: 2, options: [] } },
      { level: 1, name: "Second Wind", description: "" },
    ]
    expect(getClassDetailHeroBadges(cls)).toEqual([
      { label: "WEAPON MASTERY" },
      { label: "SECOND WIND", emphasis: true },
      { label: "ACTION SURGE", emphasis: true },
    ])
  })
})
