import { describe, expect, it } from "vitest"
import {
  applyProposalSelections,
  collectImportProposals,
  defaultProposalSelections,
  importProposalsNeedConfirmation,
} from "@/lib/import/import-proposals"
import type { ImportContent } from "@/lib/import/content-schema"

const psionTableDescription = `1st 	+2 	1 	1 	Psionic Archetype, Psionics
3rd 	+2 	3 	2 	Secondary Discipline
20th 	+6 	20 	10 	Ascension`

describe("collectImportProposals", () => {
  it("detects psi resources from class level table and discipline features", () => {
    const content: ImportContent = {
      classes: [
        {
          name: "Psion",
          description: psionTableDescription,
          hit_die: 6,
          primary_ability: ["Intelligence"],
          saving_throws: ["Intelligence", "Wisdom"],
          features: [
            {
              level: 1,
              name: "Primary Discipline",
              description: "Choose a psionic discipline.",
              isChoice: true,
              choices: {
                category: "Discipline",
                count: 1,
                options: [
                  { name: "Telekinetic", description: "Move objects with your mind." },
                  { name: "Telepathic", description: "Reach into minds." },
                ],
              },
            },
          ],
        },
      ],
    }

    const proposals = collectImportProposals(content)
    expect(importProposalsNeedConfirmation(proposals)).toBe(true)
    expect(proposals.classResources.map((row) => row.name)).toEqual(["Psi Points", "Psi Limit"])
    expect(proposals.classResources[0].definition.toLowerCase()).toContain("psionic")
    expect(proposals.customAbilities.some((row) => row.name === "Primary Discipline")).toBe(true)
    expect(proposals.customAbilities[0].talentCount).toBe(2)
  })

  it("merges AI proposals with definitions", () => {
    const content: ImportContent = {
      classes: [{ name: "Psion", description: null, hit_die: 6, primary_ability: ["Intelligence"], features: [] }],
      import_proposals: {
        class_resources: [
          {
            proposal_id: "psi_points",
            class_name: "Psion",
            resource_key: "psi_points",
            name: "Psi Points",
            definition: "Your psionic fuel used to activate disciplines and talents.",
            uses: {
              type: "at_level",
              atLevelMode: "tier",
              atLevelTable: [{ level: 1, count: 1 }],
              recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
            },
          },
        ],
        custom_abilities: [
          {
            proposal_id: "telekinetic_discipline",
            name: "Telekinetic Discipline",
            definition: "A discipline focused on moving matter.",
            description: "Full discipline rules text.",
            source_type: "class",
            source_name: "Psion",
            level_requirement: 1,
            choices: {
              category: "Talents",
              count: 2,
              options: [
                { name: "Kinetic Grasp", description: "Spend 1 psi point." },
                { name: "Force Burst", description: "Spend 2 psi points." },
              ],
            },
          },
        ],
      },
    }

    const proposals = collectImportProposals(content)
    expect(proposals.classResources[0].definition).toContain("psionic fuel")
    expect(proposals.customAbilities[0].definition).toContain("moving matter")
    expect(proposals.customAbilities[0].talentCount).toBe(2)
  })
})

describe("applyProposalSelections", () => {
  it("creates only selected class resources and abilities", () => {
    const content: ImportContent = {
      classes: [
        {
          name: "Psion",
          description: psionTableDescription,
          hit_die: 6,
          primary_ability: ["Intelligence"],
          features: [
            {
              level: 1,
              name: "Primary Discipline",
              description: "Choose a discipline.",
              isChoice: true,
              choices: {
                category: "Discipline",
                count: 1,
                options: [{ name: "Telekinetic", description: "TK" }],
              },
            },
          ],
        },
      ],
    }

    const proposals = collectImportProposals(content)
    const psiPointsId = proposals.classResources.find((row) => row.name === "Psi Points")!.id
    const selections = {
      classResourceIds: [psiPointsId],
      customAbilityIds: [],
    }

    const merged = applyProposalSelections(content, proposals, selections)
    expect(merged.class_resources?.map((row) => row.name)).toEqual(["Psi Points"])
    expect(merged.abilities).toBeUndefined()
    expect(merged.import_proposals).toBeUndefined()
    expect(defaultProposalSelections(proposals).classResourceIds.length).toBe(2)
  })
})

describe("Battle Master maneuvers", () => {
  it("proposes superiority-dice maneuvers as custom abilities", () => {
    const content: ImportContent = {
      subclasses: [
        {
          name: "Battle Master",
          class_name: "Fighter",
          description: "",
          features: [
            {
              level: 3,
              name: "Trip Attack",
              description:
                "When you hit a creature with an attack roll, you can expend one Superiority Die to add the die to the attack's damage roll. The target must succeed on a Strength saving throw or have the Prone condition.",
            },
            {
              level: 3,
              name: "Combat Superiority",
              description: "You learn maneuvers fueled by Superiority Dice.",
            },
          ],
        },
      ],
    }

    const proposals = collectImportProposals(content)
    const trip = proposals.customAbilities.find((row) => row.name === "Trip Attack")
    expect(trip).toBeDefined()
    expect(trip?.resourceKey).toBe("superiority_dice")
    expect(trip?.definition).toMatch(/Superiority Die/i)
    expect(proposals.customAbilities.some((row) => row.name === "Combat Superiority")).toBe(false)
  })
})

describe("companion stat blocks", () => {
  it("proposes companion features as custom abilities with companionStatBlock flag", () => {
    const content: ImportContent = {
      subclasses: [
        {
          name: "Battle Smith",
          class_name: "Artificer",
          description: "",
          features: [
            {
              level: 3,
              name: "Steel Defender",
              description:
                "Medium Construct, Neutral\n\nAC 12 plus your Intelligence modifier\n\nActions\n\nForce-Empowered Rend. Melee Attack Roll...",
            },
          ],
        },
      ],
    }

    const proposals = collectImportProposals(content)
    const defender = proposals.customAbilities.find((row) => row.name === "Steel Defender")
    expect(defender).toBeDefined()
    expect(defender?.companionStatBlock).toBeTruthy()
    expect(defender?.companionStatBlock?.actions?.length).toBeGreaterThan(0)
    expect(defender?.definition).toMatch(/Companions tab/i)
  })
})
