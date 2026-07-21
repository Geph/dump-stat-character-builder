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

function usesInstances(feature: Feature | undefined) {
  return (
    feature?.linkedModifiers?.filter((instance) =>
      instance.characteristics?.some((char) => char.type === "uses"),
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

  it("War Priest preset matches the 2024 short-or-long-rest recharge (Cleric domains audit)", () => {
    // The 2024 PHB grants War Priest's uses back on a Short OR Long Rest. The preset
    // previously hardcoded long_rest only; since presets merge before AI mechanics and the
    // `uses` fingerprint ignores recharge, a stale preset would silently beat a correct
    // AI-mechanics recharge hint. Assert the preset itself is correct — not just that AI wins.
    const feature = enrichWildcardFeaturePresets({
      level: 3,
      name: "War Priest",
      description:
        "As a Bonus Action, you can make one attack with a weapon or an Unarmed Strike. You can use this Bonus Action a number of times equal to your Wisdom modifier (minimum of once). You regain all expended uses when you finish a Short or Long Rest.",
    })

    const uses = usesInstances(feature)
    expect(uses).toHaveLength(1)
    const char = uses[0]?.characteristics?.find((c) => c.type === "uses") as
      | { uses?: { recharges?: { rest: string }[] } }
      | undefined
    expect(char?.uses?.recharges).toEqual([{ rest: "short_rest" }, { rest: "long_rest" }])
  })

  it("AI uses recharge patches a stale preset uses pool instead of being dropped", () => {
    const base: Feature = {
      level: 3,
      name: "War Priest",
      description: "Bonus Action weapon attack.",
      limitedUses: {
        type: "ability_modifier",
        abilityModifier: "WIS",
        recharges: [{ rest: "long_rest" }],
      },
      linkedModifiers: [
        {
          instanceId: "modinst_stale_war_priest_uses",
          catalogRefId: "cat_char_uses",
          characteristics: [
            {
              id: "char_stale_war_priest_uses",
              type: "uses",
              uses: {
                type: "ability_modifier",
                abilityModifier: "WIS",
                recharges: [{ rest: "long_rest" }],
              },
              label: "War Priest",
            },
          ],
        },
      ],
    }

    const ai = aiMechanicsToDetections(
      [
        {
          kind: "uses",
          usesAbility: "WIS",
          usesRecharge: "both",
          sourcePhrase: "regain all expended uses when you finish a Short or Long Rest",
          confidence: "high",
        },
      ],
      { contentKind: "subclass_feature", featureName: "War Priest" },
    )
    expect(ai).toHaveLength(1)

    const merged = mergeFeatureModifierDetections(base, ai, [])
    const uses = usesInstances(merged)
    expect(uses).toHaveLength(1)
    const char = uses[0]?.characteristics?.find((c) => c.type === "uses") as
      | { uses?: { recharges?: { rest: string }[] } }
      | undefined
    expect(char?.uses?.recharges).toEqual([{ rest: "short_rest" }, { rest: "long_rest" }])
    expect(merged.limitedUses?.recharges).toEqual([{ rest: "short_rest" }, { rest: "long_rest" }])
  })

  it("wires Guided Strike and Channel Divinity narrative actions via wildcards", () => {
    const guided = enrichWildcardFeaturePresets({
      level: 3,
      name: "Guided Strike",
      description:
        "When you or a creature within 30 feet of you misses with an attack roll, you can expend Channel Divinity to give that roll a +10 bonus.",
    })
    expect(
      guided.linkedModifiers?.some((instance) =>
        instance.characteristics?.some((char) => char.type === "failed_roll_trigger"),
      ),
    ).toBe(true)
    expect(guided.activation?.reaction).toBe(true)

    const radiance = enrichWildcardFeaturePresets({
      level: 3,
      name: "Radiance of the Dawn",
      description: "Channel Divinity: radiant emanation.",
    })
    expect(radiance.activation?.action).toBe(true)
    expect(
      radiance.linkedModifiers?.some((instance) =>
        instance.characteristics?.some((char) => char.type === "special_attack"),
      ),
    ).toBe(true)
    expect(radiance.limitedUses?.type).toBe("class_resource")
    expect(radiance.limitedUses?.classResourceKey).toBe("channel_divinity")
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
