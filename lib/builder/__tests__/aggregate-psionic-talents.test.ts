import { describe, expect, it } from "vitest"

import {
  aggregatePsionicTalentOptions,
  collectKnownDisciplineNames,
  enrichPsionicTalentGrantFeatures,
  resolveFeatureChoiceOptions,
} from "@/lib/builder/aggregate-psionic-talents"
import type { CustomAbility, Feature } from "@/lib/types"

function discipline(
  name: string,
  talents: { name: string; description?: string; prerequisite?: string | null }[],
): CustomAbility {
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
    choices: {
      category: "Talents",
      count: 1,
      options: talents.map((talent) => ({
        name: talent.name,
        description: talent.description ?? "",
        prerequisite: talent.prerequisite ?? null,
      })),
    },
    icon: null,
    source: "Test",
    creator_url: null,
    created_at: "",
    updated_at: "",
  }
}

function classTalent(
  name: string,
  partial: Partial<CustomAbility> = {},
): CustomAbility {
  return {
    id: `talent-${name}`,
    name,
    description: partial.description ?? "",
    prerequisites: partial.prerequisites ?? null,
    level_requirement: partial.level_requirement ?? null,
    characteristics: null,
    attached_to_type: "class",
    attached_to_id: "psion",
    uses: null,
    show_in_builder: true,
    ability_role: "class_talent",
    icon: null,
    source: "Test",
    creator_url: null,
    created_at: "",
    updated_at: "",
    ...partial,
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
    expect(options[0]?.sourceLabel).toBe("Telekinetic Discipline")
  })

  it("returns no discipline talents until a discipline is known", () => {
    const options = aggregatePsionicTalentOptions({
      customAbilities: [
        discipline("Telekinetic Discipline", [{ name: "Force Push" }]),
      ],
      featureChoicePicks: {},
      classNames: ["Psion"],
    })
    expect(options.map((row) => row.name)).toEqual([])
  })

  it("includes general psionic talents even without a known discipline", () => {
    const options = aggregatePsionicTalentOptions({
      customAbilities: [
        discipline("Telekinetic Discipline", [{ name: "Force Push" }]),
        classTalent("Astral Arms", { description: "Spectral arms." }),
        classTalent("Awaken Mind", {
          prerequisites: "9th-level Psion",
          level_requirement: 9,
        }),
      ],
      featureChoicePicks: {},
      classNames: ["Psion"],
    })
    expect(options.map((row) => row.name).sort()).toEqual(["Astral Arms", "Awaken Mind"])
    expect(options.every((row) => row.sourceLabel === "General Talent")).toBe(true)
  })

  it("unions known-discipline talents with general psionic talents", () => {
    const options = aggregatePsionicTalentOptions({
      customAbilities: [
        discipline("Telekinetic Discipline", [{ name: "Force Push" }]),
        classTalent("Schism"),
      ],
      featureChoicePicks: { "class:Primary Discipline": ["Telekinetic Discipline"] },
      classNames: ["Psion"],
    })
    expect(options.map((row) => row.name).sort()).toEqual(["Force Push", "Schism"])
    expect(options.find((row) => row.name === "Force Push")?.sourceLabel).toBe(
      "Telekinetic Discipline",
    )
    expect(options.find((row) => row.name === "Schism")?.sourceLabel).toBe("General Talent")
  })

  it("includes archetype-granted disciplines", () => {
    const options = aggregatePsionicTalentOptions({
      customAbilities: [
        discipline("Psychokinesis Discipline", [{ name: "Elemental Aegis" }]),
        discipline("Telekinetic Discipline", [{ name: "Force Push" }]),
      ],
      featureChoicePicks: {},
      grantedAbilityNames: ["Psychokinesis Discipline"],
      classNames: ["Psion"],
    })
    expect(options.map((row) => row.name)).toEqual(["Elemental Aegis"])
  })

  it("unions archetype grant and Secondary Discipline pick for talent options", () => {
    const options = aggregatePsionicTalentOptions({
      customAbilities: [
        discipline("Telepathy Discipline", [{ name: "Mind Reader" }]),
        discipline("Telekinesis Discipline", [{ name: "Force Push" }]),
        discipline("Enhancement Discipline", [{ name: "Physical Surge" }]),
      ],
      featureChoicePicks: {
        "psion:L3:Secondary Discipline": ["Telekinesis Discipline"],
      },
      grantedAbilityNames: ["Telepathy Discipline"],
      classNames: ["Psion"],
    })
    expect(options.map((row) => row.name).sort()).toEqual(["Force Push", "Mind Reader"].sort())
  })

  it("ignores Specialization options when aggregating discipline talents", () => {
    const psycho: CustomAbility = {
      ...discipline("Psychokinesis Discipline", [
        { name: "Elemental Aegis", description: "Shield." },
      ]),
      choices: {
        category: "Discipline Talents",
        count: 1,
        options: [{ name: "Elemental Aegis", description: "Shield." }],
      },
      specialization_choices: {
        category: "Specialization",
        count: 1,
        options: [{ name: "Cryokinetic", description: "Cold AE." }],
      },
    }
    const mishmashed: CustomAbility = {
      ...discipline("Broken Discipline", [{ name: "Cryokinetic", description: "oops" }]),
      choices: {
        category: "Specialization",
        count: 1,
        options: [{ name: "Cryokinetic", description: "Should not be a talent." }],
      },
    }
    const options = aggregatePsionicTalentOptions({
      customAbilities: [psycho, mishmashed],
      featureChoicePicks: {
        "class:Primary Discipline": ["Psychokinesis Discipline", "Broken Discipline"],
      },
      classNames: ["Psion"],
    })
    expect(options.map((row) => row.name)).toEqual(["Elemental Aegis"])
  })
})

describe("collectKnownDisciplineNames", () => {
  it("merges picks and granted disciplines", () => {
    const names = collectKnownDisciplineNames({
      customAbilities: [
        discipline("Psychokinesis Discipline", []),
        discipline("Telepathy Discipline", []),
      ],
      featureChoicePicks: { "psion:L3:Secondary Discipline": ["Telepathy Discipline"] },
      grantedAbilityNames: ["Psychokinesis Discipline", "Some Power"],
    })
    expect(names.sort()).toEqual(["Psychokinesis Discipline", "Telepathy Discipline"].sort())
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

describe("resolveFeatureChoiceOptions talent filtering", () => {
  const talentFeature = {
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
  } satisfies Feature

  it("filters discipline talents by level prerequisite text", () => {
    const options = resolveFeatureChoiceOptions(talentFeature, {
      customAbilities: [
        discipline("Enhancement Discipline", [
          { name: "Physical Surge" },
          { name: "Body Control", prerequisite: "5th-level Psion" },
          { name: "Transcendent Life", prerequisite: "9th-level Psion" },
        ]),
      ],
      featureChoicePicks: { discipline: ["Enhancement Discipline"] },
      classNames: ["Psion"],
      classLevel: 3,
    })
    expect(options.map((row) => row.name)).toEqual(["Physical Surge"])
  })

  it("filters general talents by level_requirement and freeform text", () => {
    const feature = {
      level: 1,
      name: "Class Talents",
      description: "",
      isChoice: true,
      choices: {
        category: "General Psionic Talents",
        count: 1,
        options: [],
        optionsSource: "class_talents" as const,
      },
    } satisfies Feature

    const optionsAt1 = resolveFeatureChoiceOptions(feature, {
      customAbilities: [
        classTalent("Open Mind"),
        classTalent("Awaken Mind", {
          prerequisites: "9th-level Psion",
          level_requirement: 9,
        }),
        classTalent("Empowered Strike", {
          prerequisites: "Psychokinesis or Telekinesis Discipline",
        }),
      ],
      featureChoicePicks: {},
      classNames: ["Psion"],
      classLevel: 1,
      grantedCustomAbilityNames: ["Psychokinesis Discipline"],
    })
    expect(optionsAt1.map((row) => row.name).sort()).toEqual(["Empowered Strike", "Open Mind"])

    const optionsAt9 = resolveFeatureChoiceOptions(feature, {
      customAbilities: [
        classTalent("Open Mind"),
        classTalent("Awaken Mind", {
          prerequisites: "9th-level Psion",
          level_requirement: 9,
        }),
      ],
      featureChoicePicks: {},
      classNames: ["Psion"],
      classLevel: 9,
    })
    expect(optionsAt9.map((row) => row.name).sort()).toEqual(["Awaken Mind", "Open Mind"])
  })

  it("hides discipline-talent picks when no discipline is known but keeps eligible general talents", () => {
    const options = resolveFeatureChoiceOptions(talentFeature, {
      customAbilities: [
        discipline("Telekinetic Discipline", [{ name: "Force Push" }]),
        classTalent("Open Mind"),
        classTalent("Awaken Mind", {
          prerequisites: "9th-level Psion",
          level_requirement: 9,
        }),
      ],
      featureChoicePicks: {},
      classNames: ["Psion"],
      classLevel: 5,
    })
    expect(options.map((row) => row.name)).toEqual(["Open Mind"])
  })
})
