import { describe, expect, it } from "vitest"
import {
  enrichWildcardFeaturePresets,
  sanitizeBonusProficienciesFeature,
} from "@/lib/compendium/enrich-srd-class-features"
import type { Feature } from "@/lib/types"

describe("Bonus Proficiencies wildcard sanitization", () => {
  it("strips Lore-style any-skill picks from Mutagenist-style Bonus Proficiencies", () => {
    const feature: Feature = {
      level: 3,
      name: "Bonus Proficiencies",
      description: "You gain proficiency in your choice of the Acrobatics or Athletics skill.",
      isChoice: true,
      choices: {
        category: "Skill Proficiency",
        count: 1,
        options: [
          { name: "Acrobatics", description: "Acrobatics" },
          { name: "Athletics", description: "Athletics" },
        ],
      },
      linkedModifiers: [
        {
          instanceId: "bad",
          catalogRefId: "cat_char_skills",
          characteristics: [
            {
              id: "bad_skills",
              type: "skills",
              entries: [],
              allowAnySkill: true,
              choiceCount: 3,
              label: "Bonus skill proficiencies",
            },
          ],
        },
      ],
    }

    const sanitized = sanitizeBonusProficienciesFeature(feature)
    expect(sanitized.linkedModifiers ?? []).toEqual([])
    expect(sanitized.isChoice).toBe(true)
    expect(sanitized.choices?.options?.map((o) => o.name)).toEqual(["Acrobatics", "Athletics"])
  })

  it("does not strip College of Lore Bonus Proficiencies", () => {
    const feature: Feature = {
      level: 3,
      name: "Bonus Proficiencies",
      description: "You gain proficiency with three skills of your choice.",
      linkedModifiers: [
        {
          instanceId: "lore",
          catalogRefId: "cat_char_skills",
          characteristics: [
            {
              id: "lore_skills",
              type: "skills",
              entries: [],
              allowAnySkill: true,
              choiceCount: 3,
              label: "Bonus skill proficiencies",
            },
          ],
        },
      ],
    }

    const sanitized = sanitizeBonusProficienciesFeature(feature)
    expect(sanitized.linkedModifiers).toHaveLength(1)
  })

  it("does not re-apply the Lore wildcard when enriching Mutagenist Bonus Proficiencies", () => {
    const feature: Feature = {
      level: 3,
      name: "Bonus Proficiencies",
      description: "You gain proficiency in your choice of the Acrobatics or Athletics skill.",
      isChoice: true,
      choices: {
        category: "Skill Proficiency",
        count: 1,
        options: [
          { name: "Acrobatics", description: "Acrobatics" },
          { name: "Athletics", description: "Athletics" },
        ],
      },
    }

    const enriched = enrichWildcardFeaturePresets(feature, {
      className: "Alchemist",
      subclassName: "Mutagenist",
    })
    const skillMods =
      enriched.linkedModifiers?.flatMap((m) => m.characteristics ?? []).filter((c) => c.type === "skills") ??
      []
    expect(skillMods).toEqual([])
  })
})
