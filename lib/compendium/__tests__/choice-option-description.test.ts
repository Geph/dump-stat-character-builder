import { describe, expect, it } from "vitest"

import {
  choiceOptionWantsReadableSummary,
  isSelfExplanatoryChoiceOptionName,
  resolveChoiceOptionDescription,
  shouldShowNamedChoiceSummaries,
} from "@/lib/compendium/choice-option-description"
import { enrichCustomSpeciesRow } from "@/lib/compendium/enrich-custom-species"
import { enrichSrdSpeciesRow } from "@/lib/compendium/enrich-srd-species"
import { SRD_SOURCE } from "@/lib/srd/source"
import type { Trait } from "@/lib/types"

function traitOptions(row: Record<string, unknown>, traitName: string) {
  const traits = (row.traits as Trait[] | undefined) ?? []
  const trait = traits.find((entry) => entry.name === traitName)
  return trait?.choices?.options ?? []
}

describe("choice option descriptions", () => {
  it("treats skills, sizes, and damage types as self-explanatory", () => {
    expect(isSelfExplanatoryChoiceOptionName("Insight")).toBe(true)
    expect(isSelfExplanatoryChoiceOptionName("Medium")).toBe(true)
    expect(isSelfExplanatoryChoiceOptionName("Necrotic")).toBe(true)
    expect(isSelfExplanatoryChoiceOptionName("Drain")).toBe(false)
    expect(isSelfExplanatoryChoiceOptionName("Strengthen")).toBe(false)
  })

  it("fills Dhampir Drain and Strengthen from preset notes", () => {
    const enriched = enrichCustomSpeciesRow({
      name: "Dhampir",
      source: "motm",
      traits: [
        {
          name: "Vampiric Bite",
          description: "",
          isChoice: true,
          choices: {
            category: "Vampiric Bite Empowerment",
            count: 1,
            options: [
              { name: "Drain", description: "" },
              { name: "Strengthen", description: "" },
            ],
          },
        },
      ],
    })
    const options = traitOptions(enriched, "Vampiric Bite")
    const drain = options.find((option) => option.name === "Drain")
    const strengthen = options.find((option) => option.name === "Strengthen")
    expect(drain?.description).toMatch(/regain hp/i)
    expect(strengthen?.description).toMatch(/ability check or attack roll/i)
    expect(choiceOptionWantsReadableSummary(drain!)).toBe(true)
    expect(shouldShowNamedChoiceSummaries({ options })).toBe(true)
  })

  it("fills Eladrin Fey Step seasons from preset notes", () => {
    const enriched = enrichCustomSpeciesRow({
      name: "Eladrin",
      source: "motm",
      traits: [
        {
          name: "Fey Step",
          description: "",
          isChoice: true,
          choices: {
            category: "Season",
            count: 1,
            options: [
              { name: "Autumn", description: "" },
              { name: "Winter", description: "" },
              { name: "Spring", description: "" },
              { name: "Summer", description: "" },
            ],
          },
        },
      ],
    })
    const options = traitOptions(enriched, "Fey Step")
    expect(options.find((option) => option.name === "Autumn")?.description).toMatch(/charmed/i)
    expect(options.find((option) => option.name === "Winter")?.description).toMatch(/frightened/i)
    expect(options.find((option) => option.name === "Spring")?.description).toMatch(/willing/i)
    expect(options.find((option) => option.name === "Summer")?.description).toMatch(/fire damage/i)
  })

  it("does not invent skill-choice copy", () => {
    const enriched = enrichSrdSpeciesRow({
      name: "Elf",
      source: SRD_SOURCE,
      traits: [
        {
          name: "Keen Senses",
          description: "You have proficiency in one of Insight, Perception, or Survival.",
          isChoice: true,
          choices: {
            category: "Skill",
            count: 1,
            options: [
              { name: "Insight", description: "" },
              { name: "Perception", description: "" },
              { name: "Survival", description: "" },
            ],
          },
        },
      ],
    })
    const options = traitOptions(enriched, "Keen Senses")
    expect(options.every((option) => !choiceOptionWantsReadableSummary(option))).toBe(true)
    expect(shouldShowNamedChoiceSummaries({ options })).toBe(false)
  })

  it("reads choose-one prose when modifiers have no note", () => {
    expect(
      resolveChoiceOptionDescription(
        { name: "Assault", description: "" },
        "Once per turn, choose one of the following benefits.\n\nAssault. As a Bonus Action, you can move up to 15 feet.\n\nBreak Spells. Ongoing effects end.",
      ),
    ).toMatch(/bonus action/i)
  })

  it("skips catalog lists that use optionsSource", () => {
    expect(
      shouldShowNamedChoiceSummaries({
        optionsSource: "class_knacks",
        options: [{ name: "Hidden Paths", description: "Teleport 60 feet." }],
      }),
    ).toBe(false)
  })
})
