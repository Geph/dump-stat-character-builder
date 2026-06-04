import { z } from "zod"

export const ChoiceOptionsSchema = z.object({
  category: z.string(),
  count: z.number(),
  options: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
    }),
  ),
})

export const SpeciesTraitSchema = z.object({
  name: z.string(),
  description: z.string(),
  isChoice: z.boolean().optional(),
  choices: ChoiceOptionsSchema.optional(),
})

export const ClassFeatureSchema = z.object({
  level: z.number(),
  name: z.string(),
  description: z.string(),
  isChoice: z.boolean().optional(),
  choices: ChoiceOptionsSchema.optional(),
})

export const CHOICE_EXTRACTION_HINT = `When content requires a player to choose between options (species lineage/ancestry/legacy, fighting style, skill from a list, subclass, etc.):
- Set isChoice: true on the trait or class feature
- Populate choices with { category, count, options: [{ name, description }] }
- Keep rules text in description; list each selectable option in choices.options`
