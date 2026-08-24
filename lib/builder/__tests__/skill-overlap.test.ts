import { describe, expect, it } from "vitest"
import {
  collectGrantedSkillNames,
  describeReleasedClassSkills,
  findClassSkillOverlaps,
  isSkillProficiencyChoice,
  mergeSkillProficiencyNames,
  releaseOverlappingClassSkillPicks,
  resolveSkillChoiceOptions,
} from "@/lib/builder/skill-overlap"

describe("collectGrantedSkillNames", () => {
  it("gathers skills from background, species, features and modifier grants", () => {
    expect(
      collectGrantedSkillNames({
        backgroundSkills: ["Athletics", "Survival"],
        speciesTraitPicks: { Skillful: ["Stealth"] },
        featureChoicePicks: { "fighter:L1:Extra": ["Perception"] },
        modifierGrantedSkills: ["Insight"],
      }),
    ).toEqual(["Athletics", "Insight", "Perception", "Stealth", "Survival"])
  })

  it("ignores non-skill picks that share the choice maps", () => {
    expect(
      collectGrantedSkillNames({
        featureChoicePicks: {
          "fighter:L1:Maneuvers": ["Precision Attack", "Riposte"],
          "fighter:L1:Skills": ["Acrobatics"],
        },
      }),
    ).toEqual(["Acrobatics"])
  })

  it("collapses duplicates across sources", () => {
    expect(
      collectGrantedSkillNames({
        backgroundSkills: ["Stealth"],
        modifierGrantedSkills: ["stealth"],
      }),
    ).toEqual(["Stealth"])
  })
})

describe("findClassSkillOverlaps", () => {
  it("reports class picks that another source also grants", () => {
    expect(
      findClassSkillOverlaps({ fighter: ["Athletics", "Intimidation"] }, ["Athletics"]),
    ).toEqual([{ classId: "fighter", skills: ["Athletics"] }])
  })

  it("matches regardless of casing", () => {
    expect(findClassSkillOverlaps({ rogue: ["Stealth"] }, ["stealth"])).toEqual([
      { classId: "rogue", skills: ["Stealth"] },
    ])
  })

  it("reports nothing when picks are unique", () => {
    expect(findClassSkillOverlaps({ fighter: ["Athletics"] }, ["Arcana"])).toEqual([])
  })
})

describe("releaseOverlappingClassSkillPicks", () => {
  it("drops duplicated picks so the class picker asks for replacements", () => {
    const result = releaseOverlappingClassSkillPicks(
      { fighter: ["Athletics", "Intimidation", "Perception"], rogue: ["Stealth"] },
      ["Athletics", "Perception"],
    )

    expect(result.changed).toBe(true)
    expect(result.classSkillPicks).toEqual({
      fighter: ["Intimidation"],
      rogue: ["Stealth"],
    })
    expect(result.released).toEqual([
      { classId: "fighter", skills: ["Athletics", "Perception"] },
    ])
  })

  it("frees one pick per duplicate so the replacement count matches the grant", () => {
    const result = releaseOverlappingClassSkillPicks({ bard: ["Deception", "Persuasion", "Performance"] }, [
      "Deception",
      "Persuasion",
    ])

    expect(result.classSkillPicks.bard).toHaveLength(1)
    expect(result.released[0].skills).toHaveLength(2)
  })

  it("leaves untouched picks by reference when nothing overlaps", () => {
    const picks = { fighter: ["Athletics"] }
    const result = releaseOverlappingClassSkillPicks(picks, ["Arcana"])

    expect(result.changed).toBe(false)
    expect(result.classSkillPicks).toBe(picks)
  })

  it("is stable when re-run on its own output", () => {
    const first = releaseOverlappingClassSkillPicks({ fighter: ["Athletics", "Survival"] }, ["Athletics"])
    const second = releaseOverlappingClassSkillPicks(first.classSkillPicks, ["Athletics"])

    expect(second.changed).toBe(false)
  })
})

describe("describeReleasedClassSkills", () => {
  it("explains a single freed pick", () => {
    expect(describeReleasedClassSkills(["Athletics"])).toContain("Athletics is already granted")
  })

  it("lists multiple freed picks", () => {
    const message = describeReleasedClassSkills(["Athletics", "Stealth"])
    expect(message).toContain("Athletics and Stealth")
    expect(message).toContain("2 other skills")
  })
})

describe("isSkillProficiencyChoice", () => {
  it("matches skill proficiency choices", () => {
    expect(isSkillProficiencyChoice({ category: "Skill Proficiency" })).toBe(true)
    expect(isSkillProficiencyChoice({ category: "", featureName: "Bonus Skills" })).toBe(true)
  })

  it("skips expertise choices, which target skills you already have", () => {
    expect(isSkillProficiencyChoice({ category: "Skill", featureName: "Expertise" })).toBe(false)
  })

  it("skips unrelated choices", () => {
    expect(isSkillProficiencyChoice({ category: "Fighting Style" })).toBe(false)
  })
})

describe("resolveSkillChoiceOptions", () => {
  const options = [
    { name: "Athletics" },
    { name: "Perception" },
    { name: "Survival" },
  ]

  it("hides skills the character already has", () => {
    expect(
      resolveSkillChoiceOptions(options, { heldSkills: ["Athletics"], required: 1 }),
    ).toEqual([{ name: "Perception" }, { name: "Survival" }])
  })

  it("keeps the current selection visible so it can be changed", () => {
    expect(
      resolveSkillChoiceOptions(options, {
        heldSkills: ["Athletics", "Perception"],
        currentSelection: ["Athletics"],
        required: 1,
      }),
    ).toEqual([{ name: "Athletics" }, { name: "Survival" }])
  })

  it("tops the pool up from the class list when the grant cannot be filled", () => {
    const resolved = resolveSkillChoiceOptions(options, {
      heldSkills: ["Athletics", "Perception", "Survival"],
      required: 2,
      fallbackOptions: ["Acrobatics", "Athletics", "Insight"],
    })

    expect(resolved).toEqual([{ name: "Acrobatics" }, { name: "Insight" }])
  })

  it("leaves the pool alone when enough options survive", () => {
    const resolved = resolveSkillChoiceOptions(options, {
      heldSkills: [],
      required: 2,
      fallbackOptions: ["Acrobatics"],
    })

    expect(resolved).toEqual(options)
  })
})

describe("mergeSkillProficiencyNames", () => {
  it("appends new skills and ignores ones already held, whatever the casing", () => {
    expect(mergeSkillProficiencyNames(["Athletics"], ["Stealth", "athletics"])).toEqual([
      "Athletics",
      "Stealth",
    ])
  })

  it("handles a missing starting list", () => {
    expect(mergeSkillProficiencyNames(null, ["Arcana"])).toEqual(["Arcana"])
  })
})
