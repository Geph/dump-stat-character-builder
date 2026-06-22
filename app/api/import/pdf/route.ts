import { getDatabaseConfigError } from "@/lib/db/config"
import { getImportAiConfigError } from "@/lib/import/ai"
import { appendContentTypeHintToPrompt } from "@/lib/import/content-type-hints"
import { RICH_TEXT_TABLE_HINT } from "@/lib/import/rich-text-import-hints"
import { CLASS_SPELL_LIST_IMPORT_HINT } from "@/lib/import/class-spell-lists"
import {
  CHOICE_EXTRACTION_HINT,
  CLASS_RESOURCE_IMPORT_HINT,
  CUSTOM_CLASS_IMPORT_HINT,
  FEAT_CATEGORY_IMPORT_HINT,
  IMPORT_PROPOSALS_HINT,
  MECHANICS_IMPORT_HINT,
  SUBCLASS_IMPORT_HINT,
} from "@/lib/import/content-schema"
import { importDumpStatExportItems, parseDumpStatExportJson } from "@/lib/import/dump-stat-export"
import { prepareImportedContent } from "@/lib/import/finalize-import"
import { getMultipleClassImportBlock } from "@/lib/import/import-class-limits"
import { detectImportCollisions } from "@/lib/import/fetch-import-collisions"
import { persistImportedContent } from "@/lib/import/persist-import-content"
import { extractImportContentFromText } from "@/lib/import/run-ai-import"
import { extractTextFromPdfBuffer, parseImportPageRange } from "@/lib/import/parse-pdf-text"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const BASE_SYSTEM_PROMPT = `You are a D&D 2024 content parser. Extract game content from the provided PDF text.
      
Important D&D 2024 rules:
- "Species" is the new term (not "Race")
- Backgrounds grant ability score bonuses (+2 to one, +1 to another, or +1/+1/+1)
- For backgrounds, set ability_bonuses to an object listing eligible abilities with value 0 (e.g. {"intelligence":0,"wisdom":0,"charisma":0}) or fixed bonuses with +1/+2 values
- Backgrounds grant a 1st-level feat
- Species no longer grant ability score bonuses
- Class features are tied to specific levels
- Subclass features typically come at levels 3, 6, 7, 10, 14, 15, and 18 (homebrew may use 1, 3, 6, 10, 14)

Extract ONLY the content types you find in the text. Return empty arrays for types not present.
Be thorough and extract all instances of each content type found.

For equipment:
- Put cost in a cost object { amount, unit } (e.g. 5 SP → { amount: 5, unit: "SP" }), NOT in the item name
- Do not include HTML tags or markdown headers (####) in equipment names — strip markup from name fields only

${RICH_TEXT_TABLE_HINT}

${CHOICE_EXTRACTION_HINT}

${FEAT_CATEGORY_IMPORT_HINT}

${SUBCLASS_IMPORT_HINT}

${CLASS_RESOURCE_IMPORT_HINT}

${CUSTOM_CLASS_IMPORT_HINT}

${IMPORT_PROPOSALS_HINT}

${MECHANICS_IMPORT_HINT}

${CLASS_SPELL_LIST_IMPORT_HINT}`

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
          {
            error:
              "Invalid Dump Stat export JSON. Expected a dump-stat-export bundle or dnd-* item export.",
          },
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

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let pageRange: ReturnType<typeof parseImportPageRange> = null
    if (pageScope === "range") {
      try {
        pageRange = parseImportPageRange(pageStart, pageEnd)
        if (!pageRange) {
          return NextResponse.json(
            { error: "Enter a start and end page for the selected range." },
            { status: 400 },
          )
        }
      } catch (rangeError) {
        return NextResponse.json(
          { error: rangeError instanceof Error ? rangeError.message : "Invalid page range." },
          { status: 400 },
        )
      }
    }

    let text: string
    let totalPages: number
    try {
      const pdfData = await extractTextFromPdfBuffer(buffer, pageRange)
      text = pdfData.text
      totalPages = pdfData.totalPages
      if (pageRange && pageRange.last > totalPages) {
        return NextResponse.json(
          { error: `End page ${pageRange.last} exceeds PDF length (${totalPages} pages).` },
          { status: 400 },
        )
      }
    } catch (pdfError) {
      console.error("PDF parsing error:", pdfError)
      const detail = pdfError instanceof Error ? pdfError.message : String(pdfError)
      return NextResponse.json(
        {
          error: "Failed to parse PDF. Make sure it's a valid PDF file.",
          detail: process.env.NODE_ENV === "development" ? detail : undefined,
        },
        { status: 400 },
      )
    }

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: "PDF appears to be empty or contains very little text." },
        { status: 400 },
      )
    }

    let systemPrompt = BASE_SYSTEM_PROMPT

    if (contentType === "specific" && specificContent) {
      systemPrompt += `\n\nFocus specifically on extracting content related to: ${specificContent}. Only extract content that matches this specification.`
    }
    systemPrompt = appendContentTypeHintToPrompt(systemPrompt, contentTypeHint)

    const pageRangeNote = pageRange
      ? `\n\nNote: Text was extracted from pages ${pageRange.first}–${pageRange.last} of ${totalPages} total pages.`
      : `\n\nNote: Full PDF has ${totalPages} pages.`

    const aiConfigError = getImportAiConfigError()
    if (aiConfigError) {
      return NextResponse.json({ error: aiConfigError }, { status: 503 })
    }

    const content = await extractImportContentFromText(
      `${pageRangeNote}\n\n${text}`,
      systemPrompt,
      { includeAbilities: true },
    )

    const multiClassBlock = getMultipleClassImportBlock(content, "pdf")
    if (multiClassBlock) {
      return NextResponse.json(
        {
          error: multiClassBlock.message,
          multipleClasses: multiClassBlock.classNames,
        },
        { status: 400 },
      )
    }

    const collisions = await detectImportCollisions(content)
    const prepared = prepareImportedContent(content, {
      collisions,
      charLength: text.length,
    })
    if (prepared.kind === "confirm") {
      return NextResponse.json({
        needsConfirmation: true,
        proposals: prepared.proposals,
        pendingContent: prepared.pendingContent,
        previewSummary: prepared.previewSummary,
        collisions: prepared.collisions,
        stages: prepared.stages,
        stagingSummary: prepared.stagingSummary,
        isLarge: prepared.isLarge,
        pagesParsed: pageRange
          ? { from: pageRange.first, to: pageRange.last, total: totalPages }
          : { total: totalPages },
      })
    }

    const configError = getDatabaseConfigError()
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 503 })
    }

    const { totalImported, breakdown, warnings, report } = await persistImportedContent(
      prepared.content,
      "PDF Import",
    )

    return NextResponse.json({
      success: true,
      count: totalImported,
      pagesParsed: pageRange
        ? { from: pageRange.first, to: pageRange.last, total: totalPages }
        : { total: totalPages },
      breakdown,
      warnings: warnings.length > 0 ? warnings : undefined,
      report,
    })
  } catch (error) {
    console.error("PDF import error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import PDF" },
      { status: 500 },
    )
  }
}
