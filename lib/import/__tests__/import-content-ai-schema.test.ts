import { describe, expect, it } from "vitest"
import {
  buildImportContentAiOutputSchema,
  buildImportContentAiSchema,
  normalizeAiImportContent,
} from "@/lib/import/import-content-ai-schema"
import { zodSchema } from "ai"

type JsonSchemaObject = Record<string, unknown>

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
    const jsonSchema = (await zodSchema(schema).jsonSchema) as JsonSchemaObject
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

  it("normalizes null placeholders out of AI output", () => {
    const normalized = normalizeAiImportContent({
      species: null,
      classes: [
        {
          name: "Gunslinger",
          description: "A daring shooter.",
          card_blurb: null,
          hit_die: 8,
          primary_ability: ["Dexterity"],
          saving_throws: ["Dexterity", "Charisma"],
          armor_proficiencies: ["Light armor"],
          weapon_proficiencies: null,
          skill_choices: { count: 2, options: ["Acrobatics", "Stealth"] },
          spellcasting: null,
          spell_list: null,
          features: [
            {
              level: 1,
              name: "Quick Draw",
              description: "You have Advantage on Initiative rolls.",
              isChoice: null,
              choices: null,
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
    })

    expect(normalized.classes?.[0]?.card_blurb).toBeUndefined()
    expect(normalized.classes?.[0]?.features?.[0]?.isChoice).toBeUndefined()
    expect(normalized.classes?.[0]?.name).toBe("Gunslinger")
  })
})
