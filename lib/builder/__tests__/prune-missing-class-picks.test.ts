import { describe, expect, it } from "vitest"
import { pruneMissingClassSelections } from "@/lib/builder/prune-missing-class-picks"

describe("pruneMissingClassSelections", () => {
  it("clears class and subclass skill picks when the class is gone from the catalog", () => {
    const pruned = pruneMissingClassSelections({
      knownClassIds: ["wizard"],
      classLevels: [
        { classId: "fighter", level: 3 },
        { classId: "wizard", level: 2 },
      ],
      classAddOrder: ["fighter", "wizard"],
      primaryClassId: "fighter",
      subclassByClassId: { fighter: "champion", wizard: "evocation" },
      classSkillPicks: { fighter: ["Athletics", "Intimidation"], wizard: ["Arcana"] },
      classToolPicks: { fighter: ["Smith's Tools"] },
      featureChoicePicks: {
        "fighter:L3:Bonus Proficiencies": ["Survival"],
        "wizard:L2:Cantrips": ["Fire Bolt"],
      },
      extraSkillProficiencies: ["Athletics", "Intimidation", "Arcana", "Survival", "Stealth"],
    })

    expect(pruned.changed).toBe(true)
    expect(pruned.removedClassIds).toEqual(["fighter"])
    expect(pruned.classLevels).toEqual([{ classId: "wizard", level: 2 }])
    expect(pruned.primaryClassId).toBe("wizard")
    expect(pruned.classSkillPicks).toEqual({ wizard: ["Arcana"] })
    expect(pruned.classToolPicks).toEqual({})
    expect(pruned.subclassByClassId).toEqual({ wizard: "evocation" })
    expect(pruned.featureChoicePicks).toEqual({ "wizard:L2:Cantrips": ["Fire Bolt"] })
    expect(pruned.removedSkills).toEqual(expect.arrayContaining(["Athletics", "Intimidation", "Survival"]))
    expect(pruned.extraSkillProficiencies).toEqual(["Arcana", "Stealth"])
  })

  it("is a no-op when every class is still in the catalog", () => {
    const pruned = pruneMissingClassSelections({
      knownClassIds: ["bard"],
      classLevels: [{ classId: "bard", level: 1 }],
      primaryClassId: "bard",
      subclassByClassId: {},
      classSkillPicks: { bard: ["Performance"] },
      featureChoicePicks: {},
      extraSkillProficiencies: ["Performance"],
    })
    expect(pruned.changed).toBe(false)
    expect(pruned.classSkillPicks).toEqual({ bard: ["Performance"] })
    expect(pruned.extraSkillProficiencies).toEqual(["Performance"])
  })
})
