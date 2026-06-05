import { getDatabaseConfigError } from "@/lib/db/config"
import { getImportAiConfigError, getImportModel } from "@/lib/import/ai"
import { appendContentTypeHintToPrompt } from "@/lib/import/content-type-hints"
import {
  CHOICE_EXTRACTION_HINT,
  ClassFeatureSchema,
  SpeciesTraitSchema,
} from "@/lib/import/content-schema"
import { importDumpStatExportItems, parseDumpStatExportJson } from "@/lib/import/dump-stat-export"
import { normalizeEquipmentRows } from "@/lib/import/normalize-equipment"
import { formatFeatDescription } from "@/lib/compendium/feat-description"
import {
  deleteWhere,
  insertRows,
  listRows,
  upsertByName,
} from "@/lib/db/repository"
import { NextRequest, NextResponse } from "next/server"
import { generateText, Output } from "ai"
import { z } from "zod"

// Schema for AI extraction - same as PDF
const ContentSchema = z.object({
  species: z.array(z.object({
    name: z.string(),
    description: z.string().nullable(),
    speed: z.number().nullable(),
    size: z.string().nullable(),
    traits: z.array(SpeciesTraitSchema)
  })).optional(),
  classes: z.array(z.object({
    name: z.string(),
    description: z.string().nullable(),
    hit_die: z.number(),
    primary_ability: z.array(z.string()).nullable(),
    saving_throws: z.array(z.string()).nullable(),
    armor_proficiencies: z.array(z.string()).nullable(),
    weapon_proficiencies: z.array(z.string()).nullable(),
    skill_choices: z.object({
      count: z.number(),
      options: z.array(z.string())
    }).nullable(),
    spellcasting: z.object({
      ability: z.string(),
      cantrips: z.number().optional(),
      spells_known: z.number().optional(),
      prepared: z.boolean().optional()
    }).nullable(),
    features: z.array(ClassFeatureSchema)
  })).optional(),
  subclasses: z.array(z.object({
    name: z.string(),
    class_name: z.string(),
    description: z.string().nullable(),
    features: z.array(ClassFeatureSchema)
  })).optional(),
  backgrounds: z.array(z.object({
    name: z.string(),
    description: z.string().nullable(),
    skill_proficiencies: z.array(z.string()).nullable(),
    tool_proficiencies: z.array(z.string()).nullable().optional(),
    feat_granted: z.string().nullable(),
    ability_bonuses: z.record(z.string(), z.number()).nullable(),
    feature: z.object({ name: z.string(), description: z.string() }).nullable().optional(),
    grants_spells: z.boolean().optional(),
    granted_spells: z.record(z.string(), z.array(z.string())).nullable().optional(),
  })).optional(),
  spells: z.array(z.object({
    name: z.string(),
    level: z.number(),
    school: z.string(),
    casting_time: z.string().nullable(),
    range: z.string().nullable(),
    components: z.array(z.string()).nullable(),
    duration: z.string().nullable(),
    concentration: z.boolean(),
    description: z.string().nullable(),
    classes: z.array(z.string()).nullable()
  })).optional(),
  feats: z.array(z.object({
    name: z.string(),
    description: z.string().nullable(),
    prerequisite: z.string().nullable()
  })).optional(),
  equipment: z.array(z.object({
    name: z.string(),
    category: z.string(),
    subcategory: z.string().nullable(),
    description: z.string().nullable(),
    cost: z.object({ amount: z.number(), unit: z.string() }).nullable().optional(),
    weight: z.number().nullable().optional(),
    properties: z.record(z.unknown()).nullable().optional(),
  })).optional(),
  abilities: z.array(z.object({
    name: z.string(),
    description: z.string(),
    source_type: z.enum(["class", "subclass", "species", "background", "feat", "item"]).nullable(),
    source_name: z.string().nullable(),
    level_requirement: z.number().nullable()
  })).optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, contentType } = body
    
    const trimmedText = text?.trim() ?? ""

    const dumpStatItems = trimmedText ? parseDumpStatExportJson(trimmedText) : null
    if (dumpStatItems) {
      const configError = getDatabaseConfigError()
      if (configError) {
        return NextResponse.json({ error: configError }, { status: 503 })
      }
      const result = await importDumpStatExportItems(dumpStatItems)
      return NextResponse.json({
        success: true,
        count: result.count,
        breakdown: result.breakdown,
        source: "Dump Stat Export",
      })
    }

    if (!trimmedText || trimmedText.length < 20) {
      return NextResponse.json({ error: "Please provide more text content to parse" }, { status: 400 })
    }

    // Truncate text if too long (AI context limits)
    const maxLength = 50000
    const truncatedText = trimmedText.length > maxLength 
      ? trimmedText.slice(0, maxLength) + "\n...[truncated]" 
      : trimmedText

    // Build prompt based on content type filter
    let systemPrompt = `You are a D&D 2024 content parser. Extract game content from the provided text.
      
Important D&D 2024 rules:
- "Species" is the new term (not "Race")
- Backgrounds grant ability score bonuses (+2 to one, +1 to another, or +1/+1/+1)
- Backgrounds grant a 1st-level feat
- Species no longer grant ability score bonuses
- Class features are tied to specific levels
- Subclass features typically come at levels 3, 7, 10, 15, and 18

Extract ONLY the content types you find in the text. Return empty arrays for types not present.
Be thorough and extract all instances of each content type found.
For class features, include the level they are gained at.
For subclasses, include the parent class name in class_name field.
For equipment: use cost { amount, unit } separate from name; strip HTML/markdown from names.

${CHOICE_EXTRACTION_HINT}`

    systemPrompt = appendContentTypeHintToPrompt(systemPrompt, contentType)

    const aiConfigError = getImportAiConfigError()
    if (aiConfigError) {
      return NextResponse.json({ error: aiConfigError }, { status: 503 })
    }

    const result = await generateText({
      model: getImportModel(),
      system: systemPrompt,
      prompt: `Extract D&D content from this text:\n\n${truncatedText}`,
      output: Output.object({ schema: ContentSchema }),
    })

    const configError = getDatabaseConfigError()
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 503 })
    }

    const content = result.output
    let totalImported = 0
    const breakdown: Record<string, number> = {}

    if (content.species?.length) {
      await upsertByName("species", content.species.map((s) => ({ ...s, source: "Text Import" })))
      totalImported += content.species.length
      breakdown.species = content.species.length
    }

    if (content.classes?.length) {
      await upsertByName("classes", content.classes.map((c) => ({ ...c, source: "Text Import" })))
      totalImported += content.classes.length
      breakdown.classes = content.classes.length
    }

    if (content.subclasses?.length) {
      const classNames = [...new Set(content.subclasses.map((sc) => sc.class_name))]
      const classData = await listRows("classes", {
        filters: [{ op: "in", column: "name", values: classNames }],
      })
      const classIdMap = new Map(classData.map((c) => [c.name as string, c.id as string]))

      const subclassesWithIds = content.subclasses
        .map((sc) => ({
          name: sc.name,
          description: sc.description,
          features: sc.features,
          source: "Text Import",
          class_id: classIdMap.get(sc.class_name) || null,
        }))
        .filter((sc) => sc.class_id !== null)

      if (subclassesWithIds.length > 0) {
        for (const sc of subclassesWithIds) {
          await deleteWhere("subclasses", [
            { op: "eq", column: "name", value: sc.name },
            { op: "eq", column: "source", value: "Text Import" },
          ])
        }
        await insertRows("subclasses", subclassesWithIds)
        totalImported += subclassesWithIds.length
        breakdown.subclasses = subclassesWithIds.length
      }
    }

    if (content.backgrounds?.length) {
      await upsertByName("backgrounds", content.backgrounds.map((b) => ({ ...b, source: "Text Import" })))
      totalImported += content.backgrounds.length
      breakdown.backgrounds = content.backgrounds.length
    }

    if (content.spells?.length) {
      await upsertByName("spells", content.spells.map((s) => ({ ...s, source: "Text Import" })))
      totalImported += content.spells.length
      breakdown.spells = content.spells.length
    }

    if (content.feats?.length) {
      await upsertByName(
        "feats",
        content.feats.map((f) => ({
          ...f,
          source: "Text Import",
          description: f.description ? formatFeatDescription(f.description) : null,
        })),
      )
      totalImported += content.feats.length
      breakdown.feats = content.feats.length
    }

    if (content.equipment?.length) {
      const equipment = normalizeEquipmentRows(
        content.equipment.map((e) => ({ ...e, source: "Text Import" })) as Record<string, unknown>[],
      )
      await upsertByName("equipment", equipment)
      totalImported += equipment.length
      breakdown.equipment = equipment.length
    }

    if (content.abilities?.length) {
      await upsertByName(
        "custom_abilities",
        content.abilities.map((a) => ({ ...a, source: "Text Import", show_in_builder: true })),
      )
      totalImported += content.abilities.length
      breakdown.abilities = content.abilities.length
    }

    return NextResponse.json({ 
      success: true, 
      count: totalImported,
      breakdown
    })
  } catch (error) {
    console.error("Text import error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import text" },
      { status: 500 }
    )
  }
}
