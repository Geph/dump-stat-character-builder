import { describe, expect, it } from "vitest"
import { inferClassSkillPicks } from "@/lib/builder/infer-builder-picks"
import type { Background, Character, DndClass } from "@/lib/types"

function mockClass(id: string, name: string, skills: string[]): DndClass {
  return {
    id,
    name,
    hit_die: 10,
    skill_choices: { count: 2, options: skills },
    saving_throws: [],
    weapon_proficiencies: [],
    armor_proficiencies: [],
    features: [],
  } as DndClass
}

describe("inferClassSkillPicks", () => {
  it("assigns overlapping skills to the correct multiclass entries", () => {
    const fighterId = "fighter-id"
    const rangerId = "ranger-id"
    const fighter = mockClass(fighterId, "Fighter", [
      "Athletics",
      "Perception",
      "Survival",
      "Insight",
    ])
    const ranger = mockClass(rangerId, "Ranger", [
      "Athletics",
      "Perception",
      "Survival",
      "Stealth",
    ])

    const character = {
      id: "char-1",
      class_id: fighterId,
      level: 3,
      skill_proficiencies: ["Athletics", "Perception", "Survival"],
      class_add_order: [fighterId, rangerId],
      character_classes: [
        { class_id: fighterId, level: 2, sort_order: 0 },
        { class_id: rangerId, level: 1, sort_order: 1 },
      ],
    } as unknown as Character

    const picks = inferClassSkillPicks(character, [fighter, ranger], null as Background | null)

    expect(picks[fighterId]).toEqual(["Athletics", "Perception"])
    expect(picks[rangerId]).toEqual(["Survival"])
  })
})
