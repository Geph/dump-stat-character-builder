import { describe, expect, it } from "vitest"

import {
  aggregatePsionicTalentOptions,
  enrichPsionicTalentGrantFeatures,
  resolveFeatureChoiceOptions,
} from "@/lib/builder/aggregate-psionic-talents"
import type { CustomAbility, Feature } from "@/lib/types"

function discipline(name: string, talents: { name: string; description: string }[]): CustomAbility {
  return {
    id: `disc-${name}`,
    name,
    description: null,
    prerequisites: null,
    characteristics: null,
    attached_to_type: "class",
    attached_to_id: "psion",
    uses: null,
    show_in_builder: true,
    ability_role: "discipline",
    isChoice: true,
    choices: { category: "Talents", count: 1, options: talents },
    icon: null,
    source: "Test",
    creator_url: null,
    created_at: "",
    updated_at: "",
  }
}

describe("aggregatePsionicTalentOptions", () => {
  it("unions talent options from known disciplines", () => {
    const options = aggregatePsionicTalentOptions({
      customAbilities: [
        discipline("Telekinetic Discipline", [
          { name: "Force Push", description: "Push a creature." },
        ]),
        discipline("Telepathic Discipline", [
          { name: "Mind Probe", description: "Read thoughts." },
        ]),
      ],
      featureChoicePicks: { "class:Primary Discipline": ["Telekinetic Discipline"] },
      classNames: ["KibblesTasty Psion"],
    })
    expect(options.map((row) => row.name)).toEqual(["Force Push"])
  })
})

describe("enrichPsionicTalentGrantFeatures", () => {
  it("marks Psionic Talents features for dynamic aggregation", () => {
    const features = enrichPsionicTalentGrantFeatures([
      {
        level: 2,
        name: "Psionic Talents",
        description: "Choose talents.",
        isChoice: true,
        choices: { category: "Psionic Talents", count: 1, options: [] },
      } as unknown as Feature,
    ])
    expect(features[0].choices?.optionsSource).toBe("known_discipline_talents")
  })
})

describe("resolveFeatureChoiceOptions", () => {
  it("returns aggregated options when optionsSource is known_discipline_talents", () => {
    const feature = {
      level: 2,
      name: "Psionic Talents",
      description: "Choose talents.",
      isChoice: true,
      choices: {
        category: "Psionic Talents",
        count: 1,
        options: [],
        optionsSource: "known_discipline_talents" as const,
      },
    } satisfies import("@/lib/types").Feature
    const options = resolveFeatureChoiceOptions(feature, {
      customAbilities: [
        discipline("Telekinetic Discipline", [
          { name: "Force Push", description: "Push a creature." },
        ]),
      ],
      featureChoicePicks: { discipline: ["Telekinetic Discipline"] },
      classNames: ["KibblesTasty Psion"],
    })
    expect(options.map((row) => row.name)).toContain("Force Push")
  })
})
