import { describe, expect, it } from "vitest"
import {
  buildImportContentAiOutputSchema,
  buildImportContentAiSchema,
  normalizeAiImportContent,
} from "@/lib/import/import-content-ai-schema"
import { zodSchema } from "ai"

type JsonSchemaObject = Record<string, unknown> & {
  properties?: Record<string, JsonSchemaObject>
  items?: JsonSchemaObject
  anyOf?: JsonSchemaObject[]
  required?: string[]
}

function getSpeciesTraitItemsSchema(jsonSchema: JsonSchemaObject) {
  const speciesProp = jsonSchema.properties?.species as JsonSchemaObject | undefined
  if (!speciesProp) return undefined

  // OpenAI strict mode rejects optional top-level arrays; AI schema uses nullable anyOf.
  const speciesItems =
    (speciesProp.anyOf as JsonSchemaObject[] | undefined)?.[0]?.items ??
    speciesProp.items

  const traits = (speciesItems as JsonSchemaObject | undefined)?.properties?.traits as
    | JsonSchemaObject
    | undefined
  return traits?.items as JsonSchemaObject | undefined
}

describe("import content AI schema", () => {
  it("produces OpenAI-compatible required keys for trait isChoice", async () => {
    const schema = buildImportContentAiSchema()
    const jsonSchema = (await zodSchema(
      buildImportContentAiSchema() as Parameters<typeof zodSchema>[0],
    ).jsonSchema) as JsonSchemaObject
    const traitItems = getSpeciesTraitItemsSchema(jsonSchema)

    expect(jsonSchema.properties?.species).toHaveProperty("anyOf")
    expect(traitItems?.required).toEqual(
      expect.arrayContaining(["name", "description", "isChoice", "choices"]),
    )
    expect(Object.keys(traitItems?.properties ?? {})).toEqual(
      expect.arrayContaining(["name", "description", "isChoice", "choices"]),
    )
    for (const key of Object.keys(traitItems?.properties ?? {})) {
      expect(traitItems?.required).toContain(key)
    }
  })

  it("wraps output schema for Output.object()", async () => {
    const outputSchema = buildImportContentAiOutputSchema()
    const jsonSchema = (await outputSchema.jsonSchema) as JsonSchemaObject
    const traitItems = getSpeciesTraitItemsSchema(jsonSchema)

    expect(traitItems?.required).toContain("isChoice")
  })

  it("avoids OpenAI-invalid additionalProperties without type", async () => {
    const jsonSchema = (await buildImportContentAiOutputSchema().jsonSchema) as JsonSchemaObject

    function findBadAdditionalProperties(node: unknown, path = "root"): string[] {
      if (!node || typeof node !== "object") return []
      const record = node as JsonSchemaObject
      const issues: string[] = []
      const ap = record.additionalProperties
      if (
        ap &&
        typeof ap === "object" &&
        !Array.isArray(ap) &&
        !("type" in ap) &&
        !("anyOf" in ap) &&
        !("$ref" in ap)
      ) {
        issues.push(`${path}.additionalProperties`)
      }
      for (const [key, value] of Object.entries(record)) {
        if (Array.isArray(value)) {
          value.forEach((item, index) => {
            issues.push(...findBadAdditionalProperties(item, `${path}.${key}[${index}]`))
          })
        } else if (value && typeof value === "object") {
          issues.push(...findBadAdditionalProperties(value, `${path}.${key}`))
        }
      }
      return issues
    }

    expect(findBadAdditionalProperties(jsonSchema)).toEqual([])
  })

  it("scopes schema fields when contentTypeHint is classes", async () => {
    const jsonSchema = (await buildImportContentAiOutputSchema({
      contentTypeHint: "classes",
    }).jsonSchema) as JsonSchemaObject

    expect(jsonSchema.properties?.classes).toBeDefined()
    expect(jsonSchema.properties?.species).toBeUndefined()
    expect(jsonSchema.properties?.equipment).toBeUndefined()
  })

  it("normalizes null placeholders out of AI output", () => {
    const normalized = normalizeAiImportContent({
      species: null,
      classes: [
        {
          name: "Gunslinger",
          description: "A daring shooter.",
                    hit_die: 8,
          primary_ability: ["Dexterity"],
          saving_throws: ["Dexterity", "Charisma"],
          armor_proficiencies: ["Light armor"],
          weapon_proficiencies: null,
          skill_choices: { count: 2, options: ["Acrobatics", "Stealth"] },
          spellcasting: null,
          spell_list: null,
          card_blurb: null,
          starting_equipment_groups: null,
          starting_gold: null,
          features: [
            {
              level: 1,
              name: "Quick Draw",
              description: "You have Advantage on Initiative rolls.",
              isChoice: null,
              choices: null,
              mechanics: null,
            },
          ],
        },
      ],
      class_resources: null,
      subclasses: null,
      backgrounds: null,
      spells: null,
      feats: null,
      equipment: null,
      import_proposals: null,
    } as Parameters<typeof normalizeAiImportContent>[0])

    expect(normalized.classes?.[0]?.card_blurb).toBeUndefined()
    expect(normalized.classes?.[0]?.features?.[0]?.isChoice).toBeUndefined()
    expect(normalized.classes?.[0]?.name).toBe("Gunslinger")
  })

  it("coerces string rest recharges into { rest } objects", () => {
    const normalized = normalizeAiImportContent({
      species: null,
      classes: null,
      class_resources: [
        {
          class_name: "Psion",
          subclass_name: null,
          resource_key: "psi_points",
          name: "Psi Points",
          description: "Spendable pool",
          uses: {
            type: "at_level",
            fixedAmount: null,
            abilityModifier: null,
            specialDescription: null,
            atLevelTable: [{ level: 1, count: 1 }],
            atLevelMode: "tier",
            recharges: ["short_rest", "long_rest"],
          },
        },
      ],
      subclasses: null,
      backgrounds: null,
      spells: null,
      feats: null,
      equipment: null,
      import_proposals: null,
    } as unknown as Parameters<typeof normalizeAiImportContent>[0])

    expect(normalized.class_resources?.[0]?.uses?.recharges).toEqual([
      { rest: "short_rest" },
      { rest: "long_rest" },
    ])
  })

  it("preserves advanced choices, resource recovery, and subclass spellcasting", () => {
    const normalized = normalizeAiImportContent({
      classes: [
        {
          name: "Tactician",
          description: null,
          hit_die: 8,
          primary_ability: ["Intelligence"],
          features: [
            {
              level: 2,
              name: "Techniques",
              description: "Choose techniques.",
              isChoice: true,
              choices: {
                category: "Technique",
                count: 1,
                options: [{ name: "Feint", description: "Feint.", prerequisite: null, repeatable: null }],
                optionsSource: "class_knacks",
                resourceKey: "techniques_known",
                choiceCountByLevel: [{ level: 2, count: 1 }],
                swappableOnRest: true,
                swapRestType: "long",
              },
              mechanics: null,
            },
          ],
        },
      ],
      class_resources: [
        {
          class_name: "Tactician",
          subclass_name: null,
          resource_key: "technique_dice",
          name: "Technique Dice",
          description: null,
          uses: {
            type: "at_level",
            fixedAmount: null,
            abilityModifier: null,
            specialDescription: null,
            atLevelTable: [{ level: 2, count: 2 }],
            atLevelMode: "tier",
            recharges: [{ rest: "long_rest", amount: null, amountFormula: null, amountFormulaAbility: null, maxPerLongRest: null }],
            rechargeOverrides: null,
            restoreBySpellSlot: { minSpellLevel: 1, restores: 1 },
            useShareKey: "technique_dice",
            classResourceKey: null,
            classResourceAmount: null,
            dieType: "d6",
            dieSidesByLevel: [{ level: 2, count: 6 }],
            rechargeOnInitiative: 1,
            freeUseAfterLevel: null,
          },
        },
      ],
      subclasses: [
        {
          name: "Arcane House",
          class_name: "Tactician",
          description: null,
          card_blurb: null,
          prerequisite_rules: null,
          features: [],
          new_toggles: null,
          spellcasting: {
            ability: "Intelligence",
            cantrips: 2,
            spells_known: null,
            prepared: true,
            caster_progression: "third",
            progression: null,
            explicit_slot_progression: null,
            point_pool: null,
          },
        },
      ],
    } as unknown as Parameters<typeof normalizeAiImportContent>[0])

    expect(normalized.classes?.[0]?.features[0]?.choices).toMatchObject({
      optionsSource: "class_knacks",
      resourceKey: "techniques_known",
      swappableOnRest: true,
      swapRestType: "long",
    })
    expect(normalized.class_resources?.[0]?.uses).toMatchObject({
      restoreBySpellSlot: { minSpellLevel: 1, restores: 1 },
      dieType: "d6",
      rechargeOnInitiative: 1,
    })
    expect(normalized.subclasses?.[0]?.spellcasting).toMatchObject({
      ability: "Intelligence",
      caster_progression: "third",
      prepared: true,
    })
  })
})
