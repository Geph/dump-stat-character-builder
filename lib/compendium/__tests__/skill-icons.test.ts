import { describe, expect, it } from "vitest"
import {
  buildCustomSkillIconByName,
  skillIconSlug,
} from "@/lib/compendium/skill-icons"

describe("skillIconSlug", () => {
  it("maps SRD skills to bundled icon slugs", () => {
    expect(skillIconSlug("Deception")).toBe("domino-mask")
    expect(skillIconSlug("Stealth")).toBe("ninja-mask")
  })

  it("prefers custom ability icon overrides", () => {
    expect(skillIconSlug("Tactics", { Tactics: "brain" })).toBe("brain")
  })
})

describe("buildCustomSkillIconByName", () => {
  it("maps custom skill names from ability characteristics", () => {
    const map = buildCustomSkillIconByName([
      {
        name: "Battle Tactics",
        icon: "crossed-swords",
        characteristics: [
          {
            type: "custom_skill",
            name: "Tactics",
            ability: "intelligence",
            expertise: false,
          },
        ],
        linked_modifiers: null,
      },
    ])
    expect(map.Tactics).toBe("crossed-swords")
    expect(map["Battle Tactics"]).toBe("crossed-swords")
  })
})
