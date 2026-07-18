import { describe, expect, it } from "vitest"
import {
  abilityNameIsSelected,
  collectSelectedCustomAbilityNames,
  filterUnlockedCustomAbilities,
  isPickGatedCustomAbility,
} from "@/lib/builder/picked-custom-abilities"
import { collectBuilderModifierRefIds } from "@/lib/compendium/builder-modifier-refs"
import { enrichPsionicTalentGrantFeatures } from "@/lib/builder/aggregate-psionic-talents"
import type { CustomAbility, DndClass, Feature } from "@/lib/types"

function ability(
  partial: Partial<CustomAbility> & Pick<CustomAbility, "id" | "name">,
): CustomAbility {
  return {
    description: null,
    prerequisites: null,
    characteristics: null,
    attached_to_type: "class",
    attached_to_id: "psion-1",
    uses: null,
    show_in_builder: true,
    icon: null,
    source: "Custom",
    creator_url: null,
    created_at: "",
    updated_at: "",
    ...partial,
  }
}

describe("picked custom abilities", () => {
  it("treats disciplines and talents as pick-gated", () => {
    expect(
      isPickGatedCustomAbility(ability({ id: "1", name: "Telepathy Discipline", ability_role: "discipline" })),
    ).toBe(true)
    expect(
      isPickGatedCustomAbility(ability({ id: "2", name: "Far Hearing", ability_role: "class_talent" })),
    ).toBe(true)
    expect(
      isPickGatedCustomAbility(ability({ id: "3", name: "Mind Blast", ability_role: "psionic_power" })),
    ).toBe(false)
  })

  it("unlocks only selected / granted pick-gated abilities", () => {
    const rows = [
      ability({ id: "d1", name: "Telepathy Discipline", ability_role: "discipline" }),
      ability({ id: "d2", name: "Psychokinesis Discipline", ability_role: "discipline" }),
      ability({ id: "p1", name: "Mind Blast", ability_role: "psionic_power" }),
    ]
    const unlocked = filterUnlockedCustomAbilities(rows, ["Telepathy Discipline"])
    expect(unlocked.map((row) => row.name)).toEqual(["Telepathy Discipline", "Mind Blast"])
  })

  it("collects picks and grants", () => {
    expect(
      collectSelectedCustomAbilityNames({
        featureChoicePicks: { "class:Secondary Discipline": ["Psychokinesis Discipline"] },
        grantedCustomAbilityNames: ["Telepathy Discipline"],
      }),
    ).toEqual(["Psychokinesis Discipline", "Telepathy Discipline"])
  })

  it("matches fuzzy ability names", () => {
    expect(abilityNameIsSelected("Telepathy Discipline", ["Telepathy"])).toBe(true)
  })
})

describe("discipline/talent pick grants modifiers", () => {
  it("applies discipline linkedModifiers only after pick or grant", () => {
    const telepathy = ability({
      id: "d1",
      name: "Telepathy Discipline",
      ability_role: "discipline",
      linked_modifiers: [
        {
          instanceId: "inst-1",
          catalogRefId: "cat_char_skills",
          characteristics: [
            {
              id: "mod-1",
              type: "skills",
              entries: [{ skill: "Insight", expertise: false }],
              label: "Telepathy Insight",
            },
          ],
        },
      ],
    })
    const psychokinesis = ability({
      id: "d2",
      name: "Psychokinesis Discipline",
      ability_role: "discipline",
      linked_modifiers: [
        {
          instanceId: "inst-2",
          catalogRefId: "cat_char_skills",
          characteristics: [
            {
              id: "mod-2",
              type: "skills",
              entries: [{ skill: "Athletics", expertise: false }],
              label: "Psychokinesis Athletics",
            },
          ],
        },
      ],
    })

    const features = enrichPsionicTalentGrantFeatures([
      {
        level: 3,
        name: "Secondary Discipline",
        description: "Choose a second discipline.",
        isChoice: true,
        choices: { category: "Psionic Discipline", count: 1, options: [] },
      },
    ] as Feature[])

    const cls = {
      id: "psion-1",
      name: "Psion",
      features,
    } as DndClass

    const withoutPick = collectBuilderModifierRefIds({
      catalog: [],
      speciesTraitPicks: {},
      feats: [],
      selectedFeatIds: [],
      classLevels: [{ classId: "psion-1", level: 3 }],
      classes: [cls],
      subclasses: [],
      subclassByClassId: {},
      featureChoicePicks: {},
      customAbilities: [telepathy, psychokinesis],
    })
    expect(withoutPick.some((mod) => mod.type === "skills")).toBe(false)

    const withPick = collectBuilderModifierRefIds({
      catalog: [],
      speciesTraitPicks: {},
      feats: [],
      selectedFeatIds: [],
      classLevels: [{ classId: "psion-1", level: 3 }],
      classes: [cls],
      subclasses: [],
      subclassByClassId: {},
      featureChoicePicks: {
        "psion-1:L3:Secondary Discipline": ["Telepathy Discipline"],
      },
      customAbilities: [telepathy, psychokinesis],
    })
    const skills = withPick.filter((mod) => mod.type === "skills")
    expect(skills).toHaveLength(1)
    expect(JSON.stringify(skills[0])).toContain("Insight")
    expect(JSON.stringify(skills[0])).not.toContain("Athletics")
  })

  it("strips legacy feature_option_picker when enriching talent features", () => {
    const [feature] = enrichPsionicTalentGrantFeatures([
      {
        level: 2,
        name: "Psionic Talents",
        description: "Pick two psionic talents.",
        linkedModifiers: [
          {
            instanceId: "legacy",
            catalogRefId: "cat_char_feature_option_picker",
            characteristics: [
              {
                id: "picker",
                type: "feature_option_picker",
                optionsSource: "known_discipline_talents",
                choiceCount: 2,
              } as unknown as import("@/lib/compendium/characteristic-modifiers").CharacteristicModifier,
            ],
          },
        ],
      } as Feature,
    ])
    expect(feature.choices?.optionsSource).toBe("known_discipline_talents")
    expect(
      feature.linkedModifiers?.some((mod) =>
        mod.characteristics?.some((char) => (char as { type?: string }).type === "feature_option_picker"),
      ),
    ).toBeFalsy()
  })
})
