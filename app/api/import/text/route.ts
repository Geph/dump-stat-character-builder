import { getDatabaseConfigError } from "@/lib/db/config"
import { getImportAiConfigError } from "@/lib/import/ai"
import {
  buildTokenSavingsReport,
  importAiErrorResponse,
  parseImportAiOverride,
} from "@/lib/import/import-route-utils"
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
import { finalizeImportedContent, prepareImportedContent } from "@/lib/import/finalize-import"
import { getMultipleClassImportBlock } from "@/lib/import/import-class-limits"
import { detectImportCollisions } from "@/lib/import/fetch-import-collisions"
import { persistImportedContent } from "@/lib/import/persist-import-content"
import { extractImportContentFromText } from "@/lib/import/run-ai-import"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const BASE_SYSTEM_PROMPT = `You are a D&D 2024 content parser. Extract game content from the provided text.
      
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
For class features, include the level they are gained at.

For equipment: use cost { amount, unit } separate from name; strip HTML/markdown from names only.

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
    const body = await request.json()
    const { text, contentType, confirmImport, pendingContent, proposalSelections, renameMap } = body
    const aiOverride = parseImportAiOverride(body)

    if (confirmImport && pendingContent) {
      const configError = getDatabaseConfigError()
      if (configError) {
        return NextResponse.json({ error: configError }, { status: 503 })
      }

      const multiClassBlock = getMultipleClassImportBlock(pendingContent, "text")
      if (multiClassBlock) {
        return NextResponse.json(
          {
            error: multiClassBlock.message,
            multipleClasses: multiClassBlock.classNames,
          },
          { status: 400 },
        )
      }

      const { totalImported, breakdown, warnings, report } = await finalizeImportedContent(
        pendingContent,
        {
          classResourceIds: proposalSelections?.classResourceIds ?? [],
          customAbilityIds: proposalSelections?.customAbilityIds ?? [],
        },
        "Text Import",
        renameMap ?? {},
      )

      return NextResponse.json({
        success: true,
        count: totalImported,
        breakdown,
        warnings: warnings.length > 0 ? warnings : undefined,
        report,
      })
    }

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

    let systemPrompt = BASE_SYSTEM_PROMPT
    systemPrompt = appendContentTypeHintToPrompt(systemPrompt, contentType)

    const aiConfigError = getImportAiConfigError(aiOverride)
    if (aiConfigError) {
      return NextResponse.json({ error: aiConfigError }, { status: 503 })
    }

    const extraction = await extractImportContentFromText(trimmedText, systemPrompt, {
      includeAbilities: true,
      contentTypeHint: contentType,
      provider: aiOverride.provider,
      modelId: aiOverride.modelId,
    })
    const content = extraction.content
    const tokenSavings = buildTokenSavingsReport(extraction)

    const multiClassBlock = getMultipleClassImportBlock(content, "text")
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
      charLength: trimmedText.length,
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
        tokenSavings,
      })
    }

    const configError = getDatabaseConfigError()
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 503 })
    }
    const { totalImported, breakdown, warnings, report } = await persistImportedContent(
      prepared.content,
      "Text Import",
    )

    return NextResponse.json({
      success: true,
      count: totalImported,
      breakdown,
      warnings: warnings.length > 0 ? warnings : undefined,
      report: report ? { ...report, tokenSavings } : undefined,
      tokenSavings,
    })
  } catch (error) {
    console.error("Text import error:", error)
    return importAiErrorResponse(error)
  }
}
