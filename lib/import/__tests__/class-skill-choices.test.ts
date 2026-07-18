import { describe, expect, it } from "vitest"
import { enrichImportedClassRow } from "@/lib/import/enrich-import-classes"
import { enrichImportChoiceFeatures } from "@/lib/import/enrich-import-choices"
import { fixedClassSkillProficiencies } from "@/lib/builder/multiclass-proficiencies"
import type { DndClass } from "@/lib/types"
import type { ImportContent } from "@/lib/import/content-schema"

describe("class skill_choices wiring", () => {
  it("recovers Inventor-style Choose N from … from class description on enrich", () => {
    const enriched = enrichImportedClassRow(
      {
        name: "Inventor",
        description:
          "Skills: Choose three from Arcana, Deception, History, Investigation, Medicine, Nature, Religion, Sleight of Hand\nEquipment\nYou start with…",
        hit_die: 8,
        features: [],
      },
      undefined,
    )
    expect(enriched.skill_choices).toEqual({
      count: 3,
      options: [
        "Arcana",
        "Deception",
        "History",
        "Investigation",
        "Medicine",
        "Nature",
        "Religion",
        "Sleight of Hand",
      ],
    })
  })

  it("recovers Psion fixed + choose skills and wires Psionics custom_skill", () => {
    const content = {
      classes: [
        {
          name: "Psion",
          hit_die: 6,
          description:
            "Skills: Psionics, and choose two from Deception, History, Insight, Intimidation, Investigation, Medicine, Perception, or Religion.\nEquipment",
          features: [
            {
              level: 1,
              name: "Psionics",
              description: "Your psionic ability is Intelligence.",
            },
          ],
        },
      ],
    } as unknown as ImportContent

    const enriched = enrichImportChoiceFeatures(content)
    expect(enriched.classes?.[0]?.skill_choices).toEqual({
      count: 2,
      fixed: ["Psionics"],
      options: expect.arrayContaining(["Deception", "Religion"]),
    })

    const psionics = enriched.classes?.[0]?.features?.find((feature) => feature.name === "Psionics") as
      | import("@/lib/types").Feature
      | undefined
    expect(
      psionics?.linkedModifiers?.some((mod) =>
        mod.characteristics?.some(
          (char) => char.type === "custom_skill" && char.name === "Psionics",
        ),
      ),
    ).toBe(true)
  })

  it("exposes fixed class skills for primary class characters", () => {
    const cls = {
      id: "psion-1",
      name: "Psion",
      skill_choices: {
        count: 2,
        fixed: ["Psionics"],
        options: ["Deception", "History"],
      },
    } as DndClass

    expect(
      fixedClassSkillProficiencies({
        classLevels: [{ classId: "psion-1", level: 3 }],
        classes: [cls],
        primaryClassId: "psion-1",
      }),
    ).toEqual(["Psionics"])
  })
})
