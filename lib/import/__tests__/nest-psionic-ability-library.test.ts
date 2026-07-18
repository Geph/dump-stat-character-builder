import { describe, expect, it } from "vitest"
import {
  extractDisciplinePassive,
  GENERAL_PSIONIC_TALENTS_NAME,
  isTopLevelCompendiumAbility,
  nestPsionicAbilityLibrary,
} from "@/lib/import/nest-psionic-ability-library"

describe("nestPsionicAbilityLibrary", () => {
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
