import { describe, expect, it } from "vitest"
import {
  getSkillsAlphabetical,
  getSkillsInAbilityOrder,
  getSkillsSorted,
  orderSkillsWithPins,
} from "@/lib/compendium/skills"

describe("skill sort and pins", () => {
  it("sorts alphabetically and by ability", () => {
    const alpha = getSkillsAlphabetical()
    expect(alpha[0]?.name).toBe("Acrobatics")
    expect(alpha.map((s) => s.name)).toContain("Stealth")

    const byAbility = getSkillsInAbilityOrder()
    expect(byAbility[0]?.ability).toBe("strength")
    expect(getSkillsSorted("alpha")[0]?.name).toBe(alpha[0]?.name)
  })

  it("pins selected skills to the top in pin order", () => {
    const skills = getSkillsAlphabetical()
    const ordered = orderSkillsWithPins(skills, ["Stealth", "Athletics"])
    expect(ordered.slice(0, 2).map((s) => s.name)).toEqual(["Stealth", "Athletics"])
    expect(ordered.filter((s) => s.name === "Stealth")).toHaveLength(1)
  })
})
