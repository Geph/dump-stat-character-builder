import { getDatabaseConfigError } from "@/lib/db/config"
import { getImportAiConfigError } from "@/lib/import/ai"
import {
  buildTokenSavingsReport,
  importAiErrorResponse,
  parseImportAiOverride,
} from "@/lib/import/import-route-utils"
import { buildImportSystemPrompt } from "@/lib/import/import-system-prompt"
import { importDumpStatExportItems, parseDumpStatExportJson } from "@/lib/import/dump-stat-export"
import { parseFoundryDnd5eJson } from "@/lib/import/parse-foundry-dnd5e"
import { finalizeImportedContent } from "@/lib/import/finalize-import"
import { normalizeImportMaterialSource } from "@/lib/import/persist-import-content"
import { getMultipleClassImportBlock } from "@/lib/import/import-class-limits"
import { parseImportContentJson } from "@/lib/import/parse-import-content-json"
import { extractImportContentFromText } from "@/lib/import/run-ai-import"
import { runTextImportPipeline } from "@/lib/import/text-import-pipeline"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, contentType, confirmImport, pendingContent, proposalSelections, renameMap, materialSource } =
      body
    const aiOverride = parseImportAiOverride(body)
    const importMode = body.importMode as string | undefined

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
        normalizeImportMaterialSource(materialSource, "Custom"),
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

    const foundryContent = trimmedText ? parseFoundryDnd5eJson(trimmedText) : null
    if (foundryContent) {
      return await runTextImportPipeline(foundryContent, {
        charLength: trimmedText.length,
        materialSource: materialSource ?? "Foundry VTT Import",
      })
    }

    if (importMode === "byo-json" || importMode === "structured-json") {
      const content = parseImportContentJson(trimmedText)
      if (!content) {
        return NextResponse.json(
          {
            error:
              "Invalid import JSON. Paste the LLM output matching the template (classes, spells, feats, etc.).",
          },
          { status: 400 },
        )
      }
      return await runTextImportPipeline(content, {
        charLength: trimmedText.length,
        materialSource,
        tokenSavings: {
          inputCharsBefore: trimmedText.length,
          inputCharsAfter: trimmedText.length,
          estimatedTokensBefore: 0,
          estimatedTokensAfter: 0,
          estimatedTokensSaved: 0,
          savedPercent: 0,
          chunkCount: 0,
          extractionMode: "byo-json",
          subtractedRegions: [],
        },
      })
    }

    if (!trimmedText || trimmedText.length < 20) {
      return NextResponse.json({ error: "Please provide more text content to parse" }, { status: 400 })
    }

    const systemPrompt = buildImportSystemPrompt(contentType)

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
    const tokenSavings = buildTokenSavingsReport(extraction)

    return runTextImportPipeline(extraction.content, {
      charLength: trimmedText.length,
      materialSource,
      tokenSavings,
    })
  } catch (error) {
    console.error("Text import error:", error)
    return importAiErrorResponse(error)
  }
}
