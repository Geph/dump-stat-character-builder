import { describe, expect, it } from "vitest"
import { enrichImportChoiceFeatures } from "@/lib/import/enrich-import-choices"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { collectImportModifierReview } from "@/lib/import/import-modifier-previews"
import { aiMechanicsToDetections } from "@/lib/import/parse-ai-mechanics"
import type { ImportContent } from "@/lib/import/content-schema"
import {
  enrichPsionicTalentGrantFeatures,
  parsePsionicTalentChoiceCountByLevel,
} from "@/lib/builder/aggregate-psionic-talents"

describe("Psion class feature enrichment", () => {
  it("parses talent pick progression from description", () => {
    const tiers = parsePsionicTalentChoiceCountByLevel(
      "Pick two psionic talents. You gain additional talents at 5th, 7th, 9th, 12th, 15th, and 18th level.",
    )
    expect(tiers).toEqual([
      { level: 2, count: 2 },
      { level: 5, count: 3 },
      { level: 7, count: 4 },
      { level: 9, count: 5 },
      { level: 12, count: 6 },
      { level: 15, count: 7 },
      { level: 18, count: 8 },
    ])
  })

  it("wires turn_start_bonus_grant mechanics into a turn_start_trigger", () => {
    const detections = aiMechanicsToDetections(
      [
        {
          kind: "turn_start_bonus_grant",
          grantResourceKey: "psi_points",
          grantAmountByLevel: [
            { level: 5, amount: 1 },
            { level: 11, amount: 2 },
            { level: 17, amount: 3 },
          ],
          expiresEndOfTurn: true,
          usageRestriction: "Can only be spent to empower psionic disciplines",
          sourcePhrase: "At the start of your turn you get 1 free psi point.",
          confidence: "high",
        },
      ],
      { contentKind: "class_feature", sourceName: "Psion", featureName: "Psionic Mastery" },
    )
    expect(detections).toHaveLength(1)
    const char = detections[0]?.instance.characteristics?.[0]
    expect(char).toMatchObject({
      type: "turn_start_trigger",
      accrueResourceKey: "psi_points",
      expiresEndOfTurn: true,
    })
  })

  it("marks talent and discipline pickers + innate abilities as wired on import review", () => {
    const content = {
      classes: [
        {
          name: "Psion",
          hit_die: 6,
          features: [
            {
              level: 1,
              name: "Psionic Archetype",
              description: "Choose a Psionic Archetype.",
            },
            {
              level: 1,
              name: "Psionics",
              description: "Your psionic ability is Intelligence.",
            },
            {
              level: 1,
              name: "Primary Discipline",
              description: "Choose a psionic discipline.",
              isChoice: true,
              choices: { category: "Psionic Discipline", count: 1, options: [] },
            },
            {
              level: 2,
              name: "Psionic Talents",
              description:
                "Pick two psionic talents. You gain additional talents at 5th, 7th, 9th, 12th, 15th, and 18th level.",
              isChoice: true,
              choices: { category: "Psionic Talent", count: 2, options: [] },
            },
            {
              level: 3,
              name: "Secondary Discipline",
              description: "Choose a second psionic discipline.",
              isChoice: true,
              choices: { category: "Psionic Discipline", count: 1, options: [] },
            },
            {
              level: 5,
              name: "Psionic Mastery",
              description: "At the start of each of your turns, you gain 1 free psi point.",
              mechanics: [
                {
                  kind: "turn_start_bonus_grant",
                  grantResourceKey: "psi_points",
                  grantAmountByLevel: [
                    { level: 5, amount: 1 },
                    { level: 11, amount: 2 },
                    { level: 17, amount: 3 },
                  ],
                  expiresEndOfTurn: true,
                  usageRestriction: "empower disciplines only",
                  sourcePhrase: "gain 1 free psi point",
                  confidence: "high",
                },
              ],
            },
            {
              level: 6,
              name: "Psionic Archetype Feature",
              description: "Gain a feature from your chosen Psionic Archetype.",
            },
            {
              level: 13,
              name: "Innate Psionic Ability (7th level)",
              description: "Choose one 7th-level spell from the psion spell list as an innate ability. You can cast it once per long rest.",
            },
            {
              level: 18,
              name: "Third Discipline",
              description: "Choose a third psionic discipline.",
              isChoice: true,
              choices: { category: "Psionic Discipline", count: 1, options: [] },
            },
            {
              level: 20,
              name: "Ascension",
              description: "If you die, you can become an incorporeal entity.",
            },
          ],
        },
      ],
    } as unknown as ImportContent

    const enriched = enrichImportContentModifiers(enrichImportChoiceFeatures(content))
    const review = collectImportModifierReview(enriched)
    const byName = Object.fromEntries(review.map((row) => [row.featureName, row.status]))

    expect(byName["Psionic Archetype"]).toBe("structural")
    expect(byName["Psionic Archetype Feature"]).toBe("structural")
    expect(byName.Ascension).toBe("structural")
    expect(byName.Psionics).toBe("wired")
    expect(byName["Psionic Talents"]).toBe("wired")
    // Primary comes from archetype grant — not a free pick.
    expect(byName["Primary Discipline"]).toBe("structural")
    expect(byName["Secondary Discipline"]).toBe("wired")
    expect(byName["Third Discipline"]).toBe("wired")
    expect(byName["Psionic Mastery"]).toBe("wired")
    expect(byName["Innate Psionic Ability (7th level)"]).toBe("wired")

    const psionics = enriched.classes![0]!.features!.find((feature) => feature.name === "Psionics") as
      | import("@/lib/types").Feature
      | undefined
    expect(
      psionics?.linkedModifiers?.some((mod) =>
        mod.characteristics?.some(
          (char) => char.type === "custom_skill" && char.name === "Psionics",
        ),
      ),
    ).toBe(true)
    const features = enrichPsionicTalentGrantFeatures(
      enriched.classes![0]!.features as import("@/lib/types").Feature[],
    )
    const talents = features.find((feature) => feature.name === "Psionic Talents")
    expect(talents?.choices?.optionsSource).toBe("known_discipline_talents")
    expect(talents?.choices?.choiceCountByLevel?.length).toBeGreaterThan(1)

    const primary = features.find((feature) => feature.name === "Primary Discipline")
    expect(primary?.isChoice).toBe(false)
    expect(primary?.choices?.optionsSource).toBeUndefined()

    const secondary = features.find((feature) => feature.name === "Secondary Discipline")
    expect(secondary?.choices?.optionsSource).toBe("class_disciplines")
    expect(secondary?.isChoice).toBe(true)

    const third = features.find((feature) => feature.name === "Third Discipline")
    expect(third?.choices?.optionsSource).toBe("class_disciplines")
  })

  it("wires archetype prose into grant_custom_ability for the primary discipline", () => {
    const content = {
      subclasses: [
        {
          name: "Awakened Mind",
          class_name: "Psion",
          description: null,
          features: [
            {
              level: 1,
              name: "Awakened Mind",
              description:
                "When you choose this archetype, you gain heightened telepathic awareness, granting the psionic discipline of Telepathy.",
            },
          ],
        },
      ],
    } as unknown as ImportContent

    const enriched = enrichImportContentModifiers(content)
    const feature = enriched.subclasses![0]!.features![0] as import("@/lib/types").Feature
    const grant = (feature.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "grant_custom_ability")
    expect(grant).toMatchObject({
      type: "grant_custom_ability",
      abilityNames: ["Telepathy Discipline"],
    })
  })

  it("wires Innate Psionics as spells_known on the class feature", () => {
    const content = {
      classes: [
        {
          name: "Psion",
          hit_die: 6,
          features: [
            {
              level: 1,
              name: "Innate Psionics",
              description: "You know minor psionic spells.",
              isChoice: true,
              choices: {
                category: "Innate Psionics",
                count: 1,
                options: [{ name: "Mind Thrust", description: "Psychic cantrip." }],
              },
            },
          ],
        },
      ],
    } as unknown as ImportContent

    const enriched = enrichImportChoiceFeatures(content)
    const innate = (enriched.classes![0]!.features as import("@/lib/types").Feature[])[0]
    expect(innate.isChoice).toBe(false)
    expect(
      (innate.linkedModifiers ?? []).some((mod) =>
        mod.characteristics?.some((char) => char.type === "spells_known"),
      ),
    ).toBe(true)
  })
})
