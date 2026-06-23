import { describe, expect, it } from "vitest"
import {
  detectFeatureModifiers,
  mergeDetectionsIntoFeature,
} from "@/lib/import/detect-feature-modifiers"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import type { ImportContent } from "@/lib/import/content-schema"

const baseCtx = {
  contentKind: "class_feature" as const,
  sourceName: "Test Class",
  featureName: "Test Feature",
}

describe("detectFeatureModifiers", () => {
  const positiveCases: Array<{
    label: string
    text: string
    ruleId: string
    assert?: (detections: ReturnType<typeof detectFeatureModifiers>) => void
  }> = [
    {
      label: "skill proficiency list",
      text: "You gain proficiency in Stealth and Perception.",
      ruleId: "proficiency.skills.list",
      assert: (detections) => {
        const char = detections[0]?.instance.characteristics?.[0]
        expect(char?.type).toBe("skills")
        if (char?.type === "skills") {
          expect(char.entries?.map((entry) => entry.skill).sort()).toEqual(["Perception", "Stealth"])
        }
      },
    },
    {
      label: "unarmored AC formula",
      text: "While you are not wearing armor, your AC equals 10 + your Dexterity modifier + your Wisdom modifier.",
      ruleId: "ac.unarmored.ability",
      assert: (detections) => {
        const entry = detections.find((row) => row.ruleId.startsWith("ac.unarmored"))
        const char = entry?.instance.characteristics?.[0]
        expect(char?.type).toBe("ac")
        if (char?.type === "ac") {
          expect(char.mode).toBe("ability_modifiers")
          expect(char.base).toBe(10)
          expect(char.abilities).toEqual(["dexterity", "wisdom"])
        }
      },
    },
    {
      label: "extra damage rider",
      text: "When you hit with a melee weapon, you deal an extra 1d6 fire damage.",
      ruleId: "damage.rider.dice",
      assert: (detections) => {
        const char = detections[0]?.instance.characteristics?.[0]
        expect(char?.type).toBe("damage_roll_modifiers")
      },
    },
    {
      label: "damage resistance",
      text: "You have resistance to fire and cold damage.",
      ruleId: "resistance.damage",
      assert: (detections) => {
        const char = detections[0]?.instance.characteristics?.[0]
        if (char?.type === "damage_resistance") {
          expect(char.damageTypes?.slice().sort()).toEqual(["Cold", "Fire"])
        }
      },
    },
    {
      label: "fixed uses per long rest",
      text: "You can use this feature 3 times, regaining all expended uses when you finish a long rest.",
      ruleId: "uses.fixed_rest",
      assert: (detections) => {
        const char = detections[0]?.instance.characteristics?.[0]
        expect(char?.type).toBe("uses")
        if (char?.type === "uses") {
          expect(char.uses?.type).toBe("fixed")
          expect(char.uses?.fixedAmount).toBe(3)
        }
      },
    },
    {
      label: "darkvision",
      text: "You have darkvision within 60 feet.",
      ruleId: "vision.darkvision",
    },
    {
      label: "extra attack",
      text: "Beginning at 5th level, you can attack twice whenever you take the Attack action.",
      ruleId: "attack.extra",
    },
    {
      label: "save advantage",
      text: "You have advantage on Constitution saving throws.",
      ruleId: "save.advantage",
    },
    {
      label: "fighting style feat grant",
      text:
        "You gain a Fighting Style feat of your choice. If you choose a feat, such as Great Weapon Fighting, that requires you to hold a Melee weapon in one or two hands, you can use that feat with Ranged weapons.",
      ruleId: "grant.fighting_style",
      assert: (detections) => {
        expect(detections[0]?.instance.catalogRefId).toBe("cat_char_grant_feat")
        const char = detections[0]?.instance.characteristics?.[0]
        expect(char?.type).toBe("grant_feat")
      },
    },
  ]

  it.each(positiveCases)("detects $label ($ruleId)", ({ text, ruleId, assert }) => {
    const detections = detectFeatureModifiers(text, baseCtx)
    expect(detections.some((entry) => entry.ruleId === ruleId)).toBe(true)
    expect(detections[0]?.instance.catalogRefId).toMatch(/^cat_(char|fx)_/)
    assert?.(detections)
  })

  const negativeCases = [
    "You learn two languages of your choice.",
    "As a bonus action, you can dash.",
    "Your spellcasting ability is Intelligence.",
    "You can cast the detect magic spell at will.",
  ]

  it.each(negativeCases)("does not invent modifiers from: %s", (text) => {
    expect(detectFeatureModifiers(text, baseCtx)).toEqual([])
  })

  it("dedupes identical detections across clauses", () => {
    const text =
      "You gain proficiency in Athletics. You also gain proficiency in Athletics when using shields."
    const detections = detectFeatureModifiers(text, baseCtx)
    const skillDetections = detections.filter((entry) => entry.ruleId === "proficiency.skills.list")
    expect(skillDetections).toHaveLength(1)
  })

  it("mergeDetectionsIntoFeature preserves existing linked modifiers", () => {
    const feature = {
      name: "Existing",
      description: "You gain proficiency in Stealth.",
      linkedModifiers: [
        {
          id: "existing_mod",
          catalogRefId: "cat_char_skills",
          characteristics: [
            {
              id: "existing_char",
              type: "skills" as const,
              entries: [{ skill: "Athletics", expertise: false }],
            },
          ],
        },
      ],
      modifierRefs: ["cat_char_skills"],
    }
    const detections = detectFeatureModifiers(feature.description, baseCtx)
    const merged = mergeDetectionsIntoFeature(feature, detections)
    expect(merged.linkedModifiers).toHaveLength(2)
    expect(merged.modifierRefs).toContain("cat_char_skills")
  })
})

describe("enrichImportContentModifiers", () => {
  it("walks class features and persists linked modifiers on feats", () => {
    const content: ImportContent = {
      classes: [
        {
          name: "Skirmisher",
          description: null,
          hit_die: 8,
          primary_ability: ["Dexterity"],
          features: [
            {
              level: 1,
              name: "Fleet Footwork",
              description: "Your walking speed increases by 10 feet.",
            },
          ],
        },
      ],
      feats: [
        {
          name: "Hardy",
          description: "You have resistance to poison damage.",
          prerequisite: null,
        },
      ],
    }

    const enriched = enrichImportContentModifiers(content)
    const classFeature = enriched.classes?.[0]?.features?.[0] as {
      linkedModifiers?: unknown[]
      modifierRefs?: string[]
    }
    expect(classFeature.linkedModifiers?.length).toBeGreaterThan(0)
    expect(classFeature.modifierRefs?.length).toBeGreaterThan(0)

    const feat = enriched.feats?.[0] as {
      linkedModifiers?: unknown[]
      modifierRefs?: string[]
    }
    expect(feat.linkedModifiers?.length).toBeGreaterThan(0)
    expect(feat.modifierRefs).toContain("cat_char_damage_resistance")
  })
})
