import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { enrichCustomFeatRow } from "@/lib/compendium/enrich-custom-feats"
import { enrichImportedClassRow } from "@/lib/import/enrich-import-classes"
import { enrichImportChoiceFeatures } from "@/lib/import/enrich-import-choices"
import { applyProposalSelections, collectImportProposals } from "@/lib/import/import-proposals"
import { parseClassProgressionTable } from "@/lib/import/parse-class-progression-table"
import { parseMulticlassSection } from "@/lib/import/parse-multiclass-section"
import type { ImportContent } from "@/lib/import/content-schema"

const tableHtml = readFileSync(
  join(__dirname, "fixtures/alternate-ranger-table.html"),
  "utf8",
)

describe("Alternate Ranger progression table", () => {
  it("parses spell slots, Quarry Die, and Knacks Known", () => {
    const parsed = parseClassProgressionTable(tableHtml)
    expect(parsed).not.toBeNull()
    expect(parsed!.spellSlotProgression?.casterType).toBe("half")
    expect(parsed!.spellSlotProgression?.byLevel.some((row) => row.level === 2 && row.slots[0] === 2)).toBe(
      true,
    )
    expect(parsed!.spellSlotProgression?.byLevel.some((row) => row.level === 20 && row.slots[4] === 2)).toBe(
      true,
    )

    const quarryDie = parsed!.columns.find((col) => col.resourceKey === "quarry_die")
    expect(quarryDie?.dieSidesByLevel).toContainEqual({ level: 1, count: 4 })
    expect(quarryDie?.dieSidesByLevel).toContainEqual({ level: 20, count: 12 })

    const knacksKnown = parsed!.columns.find((col) => col.resourceKey === "knacks_known")
    expect(knacksKnown?.valuesByLevel).toContainEqual({ level: 9, count: 6 })
    expect(knacksKnown?.valuesByLevel).toContainEqual({ level: 20, count: 10 })
  })
})

describe("Alternate Ranger import proposals", () => {
  it("splits knack options into one custom ability per Knack", () => {
    const content: ImportContent = {
      import_proposals: {
        custom_abilities: [
          {
            proposal_id: "knacks",
            name: "Knack options",
            definition: "Alternate Ranger Knacks",
            description: "Knack list",
            source_type: "class",
            source_name: "Alternate Ranger",
            level_requirement: 2,
            ability_role: "knack",
            choices: {
              category: "Knack",
              count: 1,
              options: [
                { name: "Slayer I", description: "First slayer knack.", prerequisite: null },
                {
                  name: "Slayer II",
                  description: "Second slayer knack.",
                  prerequisite: "Slayer I",
                },
                { name: "Favored Foe", description: "Repeatable.", prerequisite: null, repeatable: true },
              ],
            },
          },
        ],
      },
    }
    const proposals = collectImportProposals(content)
    expect(proposals.customAbilities.filter((row) => row.abilityRole === "knack")).toHaveLength(3)
    const slayerIi = proposals.customAbilities.find((row) => row.name === "Slayer II")
    expect(slayerIi?.prerequisite).toBe("Slayer I")
    const favored = proposals.customAbilities.find((row) => row.name === "Favored Foe")
    expect(favored?.repeatable).toBe(true)
  })
})

describe("Alternate Ranger class enrich", () => {
  it("wires Knacks feature picker and spell slot progression", () => {
    const row = enrichImportedClassRow(
      {
        name: "Alternate Ranger",
        description: `${tableHtml}\nSpell save DC = 8 + your proficiency bonus + your Wisdom modifier.`,
        features: [{ level: 2, name: "Knacks", description: "Replace one Knack when you level up." }],
        hit_die: 10,
      },
      [],
    )
    const content = enrichImportChoiceFeatures({
      classes: [
        {
          name: "Alternate Ranger",
          description: row.description as string,
          hit_die: 10,
          primary_ability: ["Wisdom"],
          features: (row.features ?? []) as NonNullable<ImportContent["classes"]>[number]["features"],
        },
      ],
    })
    const knacks = content.classes?.[0]?.features.find((feature) => feature.name === "Knacks")
    expect(knacks?.choices?.resourceKey).toBe("knacks_known")
    expect(knacks?.choices?.optionsSource).toBe("class_knacks")
    expect(row.spellcasting).toMatchObject({ caster_progression: "half", ability: "Wisdom" })
  })

  it("parses multiclass OR prerequisites", () => {
    const parsed = parseMulticlassSection(`
Multiclassing
Prerequisites: Wisdom 13 and Dexterity or Strength 13
Proficiencies Gained: Light armor
`)
    expect(parsed?.multiclass_prerequisite_groups).toEqual([
      { options: [{ ability: "Wisdom", minimum: 13 }] },
      {
        options: expect.arrayContaining([
          { ability: "Dexterity", minimum: 13 },
          { ability: "Strength", minimum: 13 },
        ]),
      },
    ])
  })
})

describe("Alternate Ranger Archery feat preset guard", () => {
  it("does not apply SRD +2 Archery when description says +1", () => {
    const row = enrichCustomFeatRow({
      name: "Archery",
      source: "laserllama",
      description:
        "You gain a +1 bonus to attack rolls you make with ranged weapons. Your ranged weapon attacks ignore half cover, and three-quarters cover counts as half cover for you.",
      linked_modifiers: [],
      modifier_refs: [],
    })
    const json = JSON.stringify(row.linkedModifiers ?? row.linked_modifiers ?? [])
    expect(json).not.toContain('"bonus":2')
    expect(json.includes("+1") || json.includes('"bonus":1')).toBe(true)
  })
})
