import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { aggregateCharacteristics } from "@/lib/compendium/characteristic-modifiers"
import { enrichImportChoiceFeatures } from "@/lib/import/enrich-import-choices"
import { collectImportProposals } from "@/lib/import/import-proposals"
import { parseClassProgressionTable } from "@/lib/import/parse-class-progression-table"
import { detectFeatureModifiers } from "@/lib/import/detect-feature-modifiers"
import type { ImportContent } from "@/lib/import/content-schema"

const tableHtml = readFileSync(join(__dirname, "fixtures/inventor-table.html"), "utf8")

const inventorCtx = {
  contentKind: "class_feature" as const,
  sourceName: "Inventor",
  featureName: "Wondrous Item Proficiency",
}

describe("Inventor progression table", () => {
  it("parses spell slots, Spells Known, and Upgrades columns", () => {
    const parsed = parseClassProgressionTable(tableHtml)
    expect(parsed).not.toBeNull()
    expect(parsed!.spellSlotProgression?.casterType).toBe("half")
    expect(parsed!.spellSlotProgression?.byLevel.some((row) => row.level === 2 && row.slots[0] === 2)).toBe(
      true,
    )
    expect(parsed!.spellSlotProgression?.byLevel.some((row) => row.level === 19 && row.slots[4] === 1)).toBe(
      true,
    )

    const spellsKnown = parsed!.columns.find((col) => col.resourceKey === "spells_known")
    expect(spellsKnown?.valuesByLevel).toContainEqual({ level: 3, count: 4 })
    expect(spellsKnown?.valuesByLevel).toContainEqual({ level: 20, count: 21 })

    const upgrades = parsed!.columns.find((col) => col.resourceKey === "upgrades")
    expect(upgrades?.valuesByLevel).toContainEqual({ level: 3, count: 1 })
    expect(upgrades?.valuesByLevel).toContainEqual({ level: 19, count: 9 })
  })
})

describe("Inventor import proposals", () => {
  it("splits upgrade options into one custom ability per Upgrade", () => {
    const content = {
      import_proposals: {
        custom_abilities: [
          {
            proposal_id: "generic_upgrades",
            name: "Generic Unrestricted Upgrades",
            definition: "Inventor upgrades available to all specializations.",
            description: "Shield and tool upgrade options.",
            source_type: "class",
            source_name: "Inventor",
            level_requirement: 3,
            ability_role: "upgrade",
            choices: {
              category: "Upgrade",
              count: 1,
              options: [
                { name: "Shield Proficiency", description: "Gain shield proficiency.", prerequisite: null },
                {
                  name: "Tool Proficiency",
                  description: "Gain one tool proficiency of your choice.",
                  prerequisite: null,
                  repeatable: false,
                },
              ],
            },
          },
        ],
      },
    }
    const proposals = collectImportProposals(content as unknown as ImportContent)
    expect(proposals.customAbilities.filter((row) => row.abilityRole === "upgrade")).toHaveLength(2)
    expect(proposals.customAbilities.find((row) => row.name === "Shield Proficiency")?.abilityRole).toBe(
      "upgrade",
    )
  })
})

describe("Inventor class enrich", () => {
  it("wires Specialization Upgrade picker with class_upgrades source", () => {
    const content = enrichImportChoiceFeatures({
      classes: [
        {
          name: "Inventor",
          description: tableHtml,
          hit_die: 8,
          primary_ability: ["Intelligence"],
          features: [
            {
              level: 3,
              name: "Specialization Upgrade",
              description: "You can exchange one upgrade when you level up.",
            },
          ],
        },
      ],
    })
    const upgrade = content.classes?.[0]?.features.find((f) => f.name === "Specialization Upgrade")
    expect(upgrade?.choices?.resourceKey).toBe("upgrades")
    expect(upgrade?.choices?.optionsSource).toBe("class_upgrades")
  })
})

describe("Inventor attunement import", () => {
  it("imports Wondrous Item Proficiency as four attunement slots", () => {
    const description =
      "You can now attune to up to four magic items at once, instead of the usual three."
    const detected = detectFeatureModifiers(description, inventorCtx)
    expect(detected.some((row) => row.ruleId === "attunement.slots.total")).toBe(true)
    const chars = detected.flatMap((row) => row.instance.characteristics ?? [])
    const attune = chars.find((char) => char.type === "attunement_slots")
    expect(attune).toMatchObject({ totalSlots: 4 })

    const aggregated = aggregateCharacteristics(chars)
    expect(aggregated.attunementSlots).toBe(4)
  })
})
