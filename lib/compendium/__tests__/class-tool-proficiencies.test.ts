import { describe, expect, it } from "vitest"
import {
  fixedToolProficienciesFromList,
  parseClassToolChoicePhrase,
  wireClassToolProficiencyChoices,
} from "@/lib/compendium/class-tool-proficiencies"
import { aggregateClassToolProficiencies } from "@/lib/builder/multiclass-proficiencies"
import type { DndClass } from "@/lib/types"

function baseClass(overrides: Partial<DndClass> = {}): DndClass {
  return {
    id: "cls_test",
    name: "Test",
    description: null,
    card_blurb: null,
    hit_die: 8,
    primary_ability: ["Dexterity"],
    saving_throws: ["Dexterity"],
    armor_proficiencies: ["Light armor"],
    weapon_proficiencies: ["Simple weapons"],
    tool_proficiencies: null,
    skill_choices: null,
    starting_equipment: null,
    starting_equipment_groups: null,
    starting_gold: null,
    features: [{ level: 1, name: "Core", description: "Basics." }],
    spellcasting: null,
    icon: null,
    source: "Test",
    creator_url: null,
    created_at: "",
    ...overrides,
  }
}

describe("class tool proficiencies", () => {
  it("parses Bard and Monk choice phrases", () => {
    expect(parseClassToolChoicePhrase("Choose 3 Musical Instruments")).toMatchObject({
      count: 3,
      pool: "musical",
    })
    expect(
      parseClassToolChoicePhrase(
        "Choose one type of Artisan's Tools or Musical Instrument (see Equipment)",
      ),
    ).toMatchObject({ count: 1 })
    expect(
      parseClassToolChoicePhrase(
        "Choose one type of Artisan's Tools or Musical Instrument (see Equipment)",
      )?.options?.length,
    ).toBeGreaterThan(5)
  })

  it("keeps fixed tools and filters choice phrases", () => {
    expect(
      fixedToolProficienciesFromList([
        "Thieves' Tools",
        "Choose 3 Musical Instruments",
        "Herbalism Kit",
      ]),
    ).toEqual(["Thieves' Tools", "Herbalism Kit"])
  })

  it("aggregates fixed class tools for the primary class", () => {
    const cls = baseClass({
      id: "rogue",
      name: "Rogue",
      tool_proficiencies: ["Thieves' Tools"],
    })
    expect(
      aggregateClassToolProficiencies({
        classLevels: [{ classId: "rogue", level: 1 }],
        classes: [cls],
        primaryClassId: "rogue",
        classToolPicks: {},
      }),
    ).toEqual(["Thieves' Tools"])
  })

  it("wires choice phrases onto a level-1 feature when none exist yet", () => {
    const wired = wireClassToolProficiencyChoices(
      baseClass({
        tool_proficiencies: ["Choose one kind of Gaming Set"],
      }),
    )
    const chars = wired.features?.[0]?.linkedModifiers?.flatMap((m) => m.characteristics ?? []) ?? []
    expect(chars.some((c) => c.type === "tool_proficiencies" && c.choiceCount === 1)).toBe(true)
  })

  it("does not duplicate an existing tool-choice modifier", () => {
    const cls = baseClass({
      tool_proficiencies: ["Choose 3 Musical Instruments"],
      features: [
        {
          level: 1,
          name: "Bardic Inspiration",
          description: "Inspire.",
          linkedModifiers: [
            {
              instanceId: "existing",
              catalogRefId: "cat_char_tool_proficiencies",
              characteristics: [
                {
                  id: "mod_existing",
                  type: "tool_proficiencies",
                  values: [],
                  choiceCount: 3,
                  toolChoicePool: "musical",
                },
              ],
            },
          ],
        },
      ],
    })
    const wired = wireClassToolProficiencyChoices(cls)
    const toolMods =
      wired.features?.[0]?.linkedModifiers?.filter((m) =>
        m.characteristics?.some((c) => c.type === "tool_proficiencies"),
      ) ?? []
    expect(toolMods).toHaveLength(1)
  })
})
