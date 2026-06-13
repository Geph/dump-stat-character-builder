import { getDatabaseConfigError } from "@/lib/db/config"
import { getImportAiConfigError, getImportModel } from "@/lib/import/ai"
import { appendContentTypeHintToPrompt } from "@/lib/import/content-type-hints"
import { RICH_TEXT_TABLE_HINT } from "@/lib/import/rich-text-import-hints"
import {
  applyClassSpellListsToImport,
  CLASS_SPELL_LIST_IMPORT_HINT,
} from "@/lib/import/class-spell-lists"
import {
  CHOICE_EXTRACTION_HINT,
  ClassFeatureSchema,
  SpeciesTraitSchema,
} from "@/lib/import/content-schema"
import { importDumpStatExportItems, parseDumpStatExportJson } from "@/lib/import/dump-stat-export"
import { normalizeEquipmentRows } from "@/lib/import/normalize-equipment"
import { formatFeatDescription } from "@/lib/compendium/feat-description"
import { normalizeBackgroundRows } from "@/lib/compendium/normalize-backgrounds"
import { upsertByName } from "@/lib/db/repository"
import type { CompendiumTable } from "@/lib/db/tables"
import { NextRequest, NextResponse } from "next/server"
import { generateText, Output } from "ai"
import { z } from "zod"

type PageRange = { first: number; last: number }

function parsePageRange(
  pageStart: string | null,
  pageEnd: string | null
): PageRange | null {
  if (!pageStart?.trim() && !pageEnd?.trim()) return null
  const first = parseInt(pageStart?.trim() || "", 10)
  const last = parseInt(pageEnd?.trim() || "", 10)
  if (!Number.isFinite(first) || !Number.isFinite(last)) {
    throw new Error("Page range requires valid start and end page numbers.")
  }
  if (first < 1 || last < 1) {
    throw new Error("Page numbers must be 1 or greater.")
  }
  if (first > last) {
    throw new Error("Start page must be less than or equal to end page.")
  }
  return { first, last }
}

async function parsePdf(buffer: Buffer, pageRange?: PageRange | null): Promise<{ text: string; totalPages: number }> {
  const { PDFParse } = await import("pdf-parse")
  const parser = new PDFParse({ data: buffer })
  try {
    const parseParams = pageRange ? { first: pageRange.first, last: pageRange.last } : undefined
    const result = await parser.getText(parseParams)
    return { text: result.text, totalPages: result.total }
  } finally {
    await parser.destroy()
  }
}

// Schema for AI extraction
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
    features: z.array(ClassFeatureSchema),
    spell_list: z.array(z.string()).nullable().optional(),
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
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("pdf") as File
    const contentType = formData.get("contentType") as string | null
    const contentTypeHint = formData.get("contentTypeHint") as string | null
    const specificContent = formData.get("specificContent") as string | null
    const pageScope = formData.get("pageScope") as string | null
    const pageStart = formData.get("pageStart") as string | null
    const pageEnd = formData.get("pageEnd") as string | null
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()
    const isJsonFile = fileName.endsWith(".json") || file.type === "application/json"

    if (isJsonFile) {
      const jsonText = await file.text()
      const dumpStatItems = parseDumpStatExportJson(jsonText.trim())
      if (!dumpStatItems) {
        return NextResponse.json(
          { error: "Invalid Dump Stat export JSON. Expected a dump-stat-export bundle or dnd-* item export." },
          { status: 400 },
        )
      }
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

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    let pageRange: PageRange | null = null
    if (pageScope === "range") {
      try {
        pageRange = parsePageRange(pageStart, pageEnd)
        if (!pageRange) {
          return NextResponse.json(
            { error: "Enter a start and end page for the selected range." },
            { status: 400 }
          )
        }
      } catch (rangeError) {
        return NextResponse.json(
          { error: rangeError instanceof Error ? rangeError.message : "Invalid page range." },
          { status: 400 }
        )
      }
    }

    // Parse PDF with error handling
    let text: string
    let totalPages: number
    try {
      const pdfData = await parsePdf(buffer, pageRange)
      text = pdfData.text
      totalPages = pdfData.totalPages
      if (pageRange && pageRange.last > totalPages) {
        return NextResponse.json(
          { error: `End page ${pageRange.last} exceeds PDF length (${totalPages} pages).` },
          { status: 400 }
        )
      }
    } catch (pdfError) {
      console.error("PDF parsing error:", pdfError)
      return NextResponse.json(
        { error: "Failed to parse PDF. Make sure it's a valid PDF file." },
        { status: 400 }
      )
    }

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: "PDF appears to be empty or contains very little text." },
        { status: 400 }
      )
    }

    // Truncate text if too long (AI context limits)
    const maxLength = 50000
    const truncatedText = text.length > maxLength 
      ? text.slice(0, maxLength) + "\n...[truncated]" 
      : text

    // Build system prompt based on content filtering options
    let systemPrompt = `You are a D&D 2024 content parser. Extract game content from the provided PDF text.
      
Important D&D 2024 rules:
- "Species" is the new term (not "Race")
- Backgrounds grant ability score bonuses (+2 to one, +1 to another, or +1/+1/+1)
- For backgrounds, set ability_bonuses to an object listing eligible abilities with value 0 (e.g. {"intelligence":0,"wisdom":0,"charisma":0}) or fixed bonuses with +1/+2 values
- Backgrounds grant a 1st-level feat
- Species no longer grant ability score bonuses

Extract ONLY the content types you find in the text. Return empty arrays for types not present.
Be thorough and extract all instances of each content type found.

For equipment:
- Put cost in a cost object { amount, unit } (e.g. 5 SP → { amount: 5, unit: "SP" }), NOT in the item name
- Do not include HTML tags or markdown headers (####) in equipment names — strip markup from name fields only

${RICH_TEXT_TABLE_HINT}

${CHOICE_EXTRACTION_HINT}

${CLASS_SPELL_LIST_IMPORT_HINT}`

    if (contentType === "specific" && specificContent) {
      systemPrompt += `\n\nFocus specifically on extracting content related to: ${specificContent}. Only extract content that matches this specification.`
    }
    systemPrompt = appendContentTypeHintToPrompt(systemPrompt, contentTypeHint)

    const pageRangeNote = pageRange
      ? `\n\nNote: Text was extracted from pages ${pageRange.first}–${pageRange.last} of ${totalPages} total pages.`
      : ""

    const aiConfigError = getImportAiConfigError()
    if (aiConfigError) {
      return NextResponse.json({ error: aiConfigError }, { status: 503 })
    }

    const result = await generateText({
      model: getImportModel(),
      system: systemPrompt,
      prompt: `Extract D&D content from this PDF text:${pageRangeNote}\n\n${truncatedText}`,
      output: Output.object({ schema: ContentSchema }),
    })

    const configError = getDatabaseConfigError()
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 503 })
    }

    const content = applyClassSpellListsToImport(result.output)
    let totalImported = 0

    const upsertSection = async (table: CompendiumTable, rows: Record<string, unknown>[] | undefined) => {
      if (!rows?.length) return 0
      await upsertByName(table, rows.map((r) => ({ ...r, source: "PDF Import" })))
      return rows.length
    }

    totalImported += await upsertSection("species", content.species)
    totalImported += await upsertSection("classes", content.classes)
    totalImported += await upsertSection(
      "backgrounds",
      content.backgrounds ? normalizeBackgroundRows(content.backgrounds) : undefined,
    )
    totalImported += await upsertSection("spells", content.spells)
    totalImported += await upsertSection(
      "feats",
      content.feats?.map((f) => ({
        ...f,
        description: f.description ? formatFeatDescription(f.description) : null,
      })),
    )
    totalImported += await upsertSection(
      "equipment",
      content.equipment
        ? normalizeEquipmentRows(content.equipment as Record<string, unknown>[])
        : undefined,
    )

    return NextResponse.json({ 
      success: true, 
      count: totalImported,
      pagesParsed: pageRange ? { from: pageRange.first, to: pageRange.last, total: totalPages } : { total: totalPages },
      breakdown: {
        species: content.species?.length || 0,
        classes: content.classes?.length || 0,
        backgrounds: content.backgrounds?.length || 0,
        spells: content.spells?.length || 0,
        feats: content.feats?.length || 0,
        equipment: content.equipment?.length || 0,
      }
    })
  } catch (error) {
    console.error("PDF import error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import PDF" },
      { status: 500 }
    )
  }
}
