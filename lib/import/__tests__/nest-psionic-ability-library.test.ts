import { describe, expect, it } from "vitest"
import { normalizeFeatureChoices } from "@/lib/compendium/normalize-feature-activation"
import { normalizeAbilityImportRow } from "@/lib/import/normalize-ability-import"
import {
  extractDisciplinePassive,
  GENERAL_PSIONIC_TALENTS_NAME,
  isTopLevelCompendiumAbility,
  nestPsionicAbilityLibrary,
} from "@/lib/import/nest-psionic-ability-library"

describe("nestPsionicAbilityLibrary", () => {
  it("retains option levels and prerequisites through feature and ability normalization", () => {
    const choices = { category: "Talents", count: 1, options: [{ name: "Advanced", description: "A talent.", prerequisite: "Foundation", level_requirement: 11 }] }
    expect(normalizeFeatureChoices(choices)?.options).toEqual(choices.options)
    expect(normalizeAbilityImportRow({ name: "Discipline", choices }).choices).toEqual(choices)
  })
  it("preserves pool identity and talent wiring without duplicating packages on reimport", () => {
    const rows = [
      { name: "Test Discipline", ability_role: "discipline" },
      { name: GENERAL_PSIONIC_TALENTS_NAME, ability_role: "talent_pool", id: "pool" },
      { name: "Advanced Talent", ability_role: "class_talent", level_requirement: 11, linkedModifiers: [{ id: "test", characteristics: [] }] },
    ]
    const once = nestPsionicAbilityLibrary(rows)
    expect(nestPsionicAbilityLibrary(once)).toEqual(once)
    const pools = once.filter((r) => r.ability_role === "talent_pool")
    expect(pools).toHaveLength(1)
    expect(pools[0]).toMatchObject({ id: "pool", choices: { options: [{ name: "Advanced Talent", level_requirement: 11, linkedModifiers: rows[2].linkedModifiers }] } })
  })
  it("builds discipline modifier_catalog entries and a General Psionic Talents pool", () => {
    const nested = nestPsionicAbilityLibrary([
      {
        name: "Consumption Discipline",
        ability_role: "discipline",
        description:
          "<p>Predator minds.</p><p><strong>Adaptive Hunter.</strong> After using Mind Leech on a target, you can gain one skill proficiency.</p><p><strong>Alternate Effects.</strong> Table.</p>",
        choices: {
          category: "Discipline Talents",
          count: 1,
          options: [{ name: "Consumed Strength", description: "Use INT for Athletics." }],
        },
        source_name: "Psion",
      },
      {
        name: "Mind Leech",
        ability_role: "psionic_power",
        definition: "Psionic power from Consumption Discipline.",
        description:
          "<p>Cha save psychic damage.</p><p>You can spend psi points up to your per-use limit to add multiple modifiers.</p><ul><li><strong>Devouring (2 psi points):</strong> Area.</li></ul>",
        casting_time: "1 action",
        range: "30 feet",
        source_name: "Psion",
      },
      {
        name: "Astral Arms",
        ability_role: "class_talent",
        description: "Bonus action astral arms.",
        source_name: "Psion",
      },
    ])

    const discipline = nested.find((row) => row.name === "Consumption Discipline")
    expect(discipline?.ability_role).toBe("discipline")
    const catalog = discipline?.modifier_catalog as { name: string; group: string }[]
    expect(catalog.map((entry) => entry.name)).toEqual(
      expect.arrayContaining([
        "Adaptive Hunter",
        "Mind Leech",
        "Alternate Effects",
        "Consumed Strength",
      ]),
    )

    const general = nested.find((row) => row.name === GENERAL_PSIONIC_TALENTS_NAME)
    expect(general?.ability_role).toBe("talent_pool")
    expect((general?.modifier_catalog as unknown[]).length).toBe(1)

    expect(isTopLevelCompendiumAbility({ ability_role: "discipline" })).toBe(true)
    expect(isTopLevelCompendiumAbility({ ability_role: "talent_pool" })).toBe(true)
    expect(isTopLevelCompendiumAbility({ ability_role: "psionic_power" })).toBe(false)
    expect(isTopLevelCompendiumAbility({ ability_role: "class_talent" })).toBe(false)
  })

  it("nests Specializations separately from Discipline Talents", () => {
    const nested = nestPsionicAbilityLibrary([
      {
        name: "Psychokinesis Discipline",
        ability_role: "discipline",
        description: "<p><strong>Alternate Effects.</strong> Table.</p>",
        choices: {
          category: "Discipline Talents",
          count: 1,
          options: [{ name: "Elemental Aegis", description: "Shield." }],
        },
        specialization_choices: {
          category: "Specialization",
          count: 1,
          options: [{ name: "Cryokinetic", description: "Cold AE." }],
        },
        source_name: "Psion",
      },
    ])
    const catalog = nested[0]?.modifier_catalog as { name: string; group: string }[]
    expect(catalog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Cryokinetic", group: "Specializations" }),
        expect.objectContaining({ name: "Elemental Aegis", group: "Discipline Talents" }),
      ]),
    )
  })

  it("extracts Adaptive Hunter-style passives", () => {
    expect(
      extractDisciplinePassive(
        "<p><strong>Adaptive Hunter.</strong> After using Mind Leech on a target, you gain a proficiency.</p>",
      ),
    ).toEqual({
      name: "Adaptive Hunter",
      body: "After using Mind Leech on a target, you gain a proficiency.",
    })
  })
})
