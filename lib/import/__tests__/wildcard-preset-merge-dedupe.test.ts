import { describe, expect, it } from "vitest"
import { enrichWildcardFeaturePresets } from "@/lib/compendium/enrich-srd-class-features"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import {
  mergeFeatureModifierDetections,
  modifierInstanceFingerprint,
} from "@/lib/import/detect-feature-modifiers"
import { aiMechanicsToDetections } from "@/lib/import/parse-ai-mechanics"
import type { Feature } from "@/lib/types"

function armorProficiencyInstances(feature: Feature | undefined) {
  return (
    feature?.linkedModifiers?.filter(
      (instance) =>
        instance.catalogRefId === "cat_char_armor_proficiencies" ||
        instance.characteristics?.some((char) => char.type === "armor_proficiencies"),
    ) ?? []
  )
}

function extraAttackEffects(feature: Feature | undefined) {
  return (
    feature?.linkedModifiers?.flatMap(
      (instance) =>
        instance.activation?.effects?.filter((effect) => effect.kind === "extra_attack") ?? [],
    ) ?? []
  )
}

describe("wildcard preset merge dedupes against AI mechanics", () => {
  it("keeps a single armor_proficiencies when AI casing differs from the Martial Training preset", () => {
    const enriched = enrichImportContentModifiers({
      subclasses: [
        {
          name: "College of Valor",
          class_name: "Bard",
          description: null,
          features: [
            {
              level: 3,
              name: "Martial Training",
              description: "You gain proficiency with Medium Armor and Shields.",
              mechanics: [
                {
                  kind: "armor_proficiencies",
                  armor: ["Medium Armor", "Shields"],
                  sourcePhrase: "proficiency with Medium Armor and Shields",
                  confidence: "high",
                },
              ],
            },
          ],
        },
      ],
    })

    const feature = enriched.subclasses?.[0]?.features?.[0] as Feature | undefined
    expect(armorProficiencyInstances(feature)).toHaveLength(1)

    const values =
      (
        armorProficiencyInstances(feature)[0]?.characteristics?.find(
          (char) => char.type === "armor_proficiencies",
        ) as { values?: string[] } | undefined
      )?.values ?? []
    expect(values.map((value) => value.toLowerCase()).sort()).toEqual([
      "medium armor",
      "shields",
    ])
  })

  it("keeps a single extra_attack when AI mechanics and Extra Attack preset both apply", () => {
    const enriched = enrichImportContentModifiers({
      subclasses: [
        {
          name: "College of Valor",
          class_name: "Bard",
          description: null,
          features: [
            {
              level: 6,
              name: "Extra Attack",
              description: "You can attack twice, instead of once, whenever you take the Attack action on your turn.",
              mechanics: [
                {
                  kind: "extra_attack",
                  sourcePhrase: "You can attack twice",
                  confidence: "high",
                },
              ],
            },
          ],
        },
      ],
    })

    const feature = enriched.subclasses?.[0]?.features?.[0] as Feature | undefined
    const effects = extraAttackEffects(feature)
    expect(effects).toHaveLength(1)
    expect(effects[0]?.extraAttackCount ?? 1).toBe(1)
  })

  it("still applies Martial Training preset armor when there is no AI-side detection", () => {
    const feature = enrichWildcardFeaturePresets({
      level: 3,
      name: "Martial Training",
      description: "You gain proficiency with martial weapons and with medium armor and shields.",
    })

    expect(armorProficiencyInstances(feature)).toHaveLength(1)
    expect(
      feature.linkedModifiers?.some(
        (instance) => instance.catalogRefId === "cat_char_weapon_proficiencies",
      ),
    ).toBe(true)
  })

  it("treats Medium Armor and Medium armor as the same armor_proficiencies fingerprint", () => {
    const ai = aiMechanicsToDetections(
      [
        {
          kind: "armor_proficiencies",
          armor: ["Medium Armor", "Shields"],
          confidence: "high",
        },
      ],
      { contentKind: "subclass_feature", featureName: "Martial Training" },
    )
    expect(ai).toHaveLength(1)

    const withAi = mergeFeatureModifierDetections(
      { level: 3, name: "Martial Training", description: "" },
      ai,
      [],
    )
    const withPreset = enrichWildcardFeaturePresets(withAi)

    expect(armorProficiencyInstances(withPreset)).toHaveLength(1)
    expect(modifierInstanceFingerprint(ai[0]!.instance)).toBe(
      modifierInstanceFingerprint(
        armorProficiencyInstances(withPreset)[0]!,
      ),
    )
  })
})
