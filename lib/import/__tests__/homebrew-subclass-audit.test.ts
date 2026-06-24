import { describe, expect, it } from "vitest"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { collectImportModifierReview } from "@/lib/import/import-modifier-previews"

function unwiredFeatureNames(
  features: { level: number; name: string; description: string }[],
  sourceName: string,
  kind: "class" | "subclass",
) {
  const content =
    kind === "subclass"
      ? {
          subclasses: [
            { name: sourceName, class_name: "Fighter", description: null, features },
          ],
        }
      : {
          classes: [
            {
              name: sourceName,
              description: null,
              hit_die: 10,
              primary_ability: ["Dexterity"],
              features,
            },
          ],
        }

  const enriched = enrichImportContentModifiers(content)
  return collectImportModifierReview(enriched)
    .filter((row) => row.status === "unwired")
    .map((row) => `L${row.featureLevel ?? "?"} ${row.featureName}`)
}

describe("homebrew subclass modifier audit", () => {
  it("reports unwired Alternate Fighter Champion features", () => {
    const unwired = unwiredFeatureNames(
      [
        {
          level: 3,
          name: "Mighty Warrior",
          description:
            "Your weapon attacks score a critical hit on a roll of 19 or 20 on the d20. At 15th level, this critical hit range increases again and your weapon attacks score a critical hit on a d20 roll of 18 through 20 on the d20.",
        },
        {
          level: 3,
          name: "Peak Athlete",
          description:
            "You gain proficiency in Athletics, and you gain a climbing speed and swimming speed equal to your walking speed.",
        },
        {
          level: 7,
          name: "Remarkable Strength",
          description:
            "When you make a Strength or Constitution ability check or saving throw, you can use feat of strength or heroic fortitude without expending an Exploit Die.",
        },
        {
          level: 10,
          name: "Devastating Critical",
          description:
            "Whenever you score a critical hit with a weapon attack you deal bonus damage equal to your Fighter level. At 15th level, when you score a critical hit with a weapon attack, you can maximize the damage instead of rolling.",
        },
        {
          level: 18,
          name: "Legendary Champion",
          description:
            "If you begin your turn with less than half of your hit points remaining, but at least 1 hit point, you regain hit points equal to 5 + your Constitution modifier.",
        },
      ],
      "Champion",
      "subclass",
    )

    expect(unwired).not.toContain("L3 Mighty Warrior")
    expect(unwired).not.toContain("L3 Peak Athlete")
    expect(unwired).not.toContain("L10 Devastating Critical")
    expect(unwired).not.toContain("L7 Remarkable Strength")
    expect(unwired).not.toContain("L18 Legendary Champion")
    expect(unwired).toHaveLength(0)
  })

  it("wires Gunslinger-style crit and weapon damage text", () => {
    const unwired = unwiredFeatureNames(
      [
        {
          level: 9,
          name: "Deadeye",
          description:
            "Your attack rolls with Ranged weapons can score a Critical Hit on a roll of 19 or 20 on the d20. At level 9, your attack rolls with Ranged weapons score a Critical Hit on a roll of 18–20. At level 17, they score a Critical Hit on a roll of 17–20.",
        },
        {
          level: 1,
          name: "Grit",
          description:
            "When you deal damage with a Ranged weapon that doesn't add your ability modifier to the roll, you add your ability modifier nonetheless. If you already add your modifier to the damage roll, the target takes an extra 1d8 damage of the weapon's type.",
        },
      ],
      "Gunslinger",
      "class",
    )

    expect(unwired).toHaveLength(0)
  })
})
