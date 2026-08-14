import { getDatabaseConfigError } from "@/lib/db/config"
import { getImportAiConfigError } from "@/lib/import/ai"
import {
  buildTokenSavingsReport,
  importAiErrorResponse,
  parseImportAiOverride,
} from "@/lib/import/import-route-utils"
import { buildImportSystemPrompt } from "@/lib/import/import-system-prompt"
import { importDumpStatExportItems, parseDumpStatExportJson } from "@/lib/import/dump-stat-export"
import { parseFoundryInput } from "@/lib/import/parse-foundry-dnd5e"
import { respondToFoundryParseResult } from "@/lib/import/foundry-import-route"
import { finalizeImportedContent } from "@/lib/import/finalize-import"
import { stripSkippedImportPreviewItems } from "@/lib/import/import-content-preview"
import { runWithBundledCardArtAssignment } from "@/lib/site-settings/app-presentation-mode"
import { normalizeImportMaterialSource } from "@/lib/import/persist-import-content"
import { getMultipleClassImportBlock } from "@/lib/import/import-class-limits"
import { isCardArtOnlyImport } from "@/lib/import/apply-card-art-import"
import { parseImportContentJsonDetailed } from "@/lib/import/parse-import-content-json"
import { extractImportContentFromText } from "@/lib/import/run-ai-import"
import { runTextImportPipeline } from "@/lib/import/text-import-pipeline"
import { validatePastedSourceTextLength } from "@/lib/import/import-source-limits"
import { requireMutationAuth } from "@/lib/api/require-mutation-auth"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const authError = requireMutationAuth(request)
    if (authError) return authError

    const body = await request.json()
    const {
      text,
      contentType,
      confirmImport,
      pendingContent,
      proposalSelections,
      renameMap,
      collisionResolutionMap,
      collisions,
      materialSource,
      cardArtUrlMap,
      skippedPreviewKeys,
      includeCardArt,
      customAbilityCategory,
      classResourceLabels,
      subclassMatchClassName,
      preferSameSourceReplacements,
    } = body
    const aiOverride = parseImportAiOverride(body)
    const importMode = body.importMode as string | undefined

    if (confirmImport && pendingContent) {
      const configError = getDatabaseConfigError()
      if (configError) {
        return NextResponse.json({ error: configError }, { status: 503 })
      }

      const previewSkipKeys = Array.isArray(skippedPreviewKeys) ? skippedPreviewKeys : []
      const contentForGate = stripSkippedImportPreviewItems(pendingContent, previewSkipKeys)
      const multiClassBlock = !isCardArtOnlyImport(contentForGate)
        ? getMultipleClassImportBlock(contentForGate, "text")
        : null
      if (multiClassBlock) {
        return NextResponse.json(
          {
            error: multiClassBlock.message,
            multipleClasses: multiClassBlock.classNames,
          },
          { status: 400 },
        )
      }

      const assignCardArt = includeCardArt !== false
      const { totalImported, breakdown, warnings, report, discoveredSpellSchools } =
        await runWithBundledCardArtAssignment(assignCardArt, () =>
          finalizeImportedContent(
            pendingContent,
            {
              classResourceIds: proposalSelections?.classResourceIds ?? [],
              customAbilityIds: proposalSelections?.customAbilityIds ?? [],
            },
            normalizeImportMaterialSource(materialSource, "Custom"),
            renameMap ?? {},
            (collisions ?? []) as import("@/lib/import/import-collisions").ImportCollision[],
            collisionResolutionMap ?? {},
            assignCardArt
              ? ((cardArtUrlMap ?? {}) as import("@/lib/import/import-card-art").ImportCardArtUrlMap)
              : {},
            {
              preferSameSourceReplacements: Boolean(preferSameSourceReplacements),
            },
            previewSkipKeys,
          ),
        )

      return NextResponse.json({
        success: true,
        count: totalImported,
        breakdown,
        warnings: warnings.length > 0 ? warnings : undefined,
        report,
        discoveredSpellSchools,
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

    const foundryResult = trimmedText ? parseFoundryInput(trimmedText) : { kind: "not_foundry" as const }
    if (foundryResult.kind !== "not_foundry") {
      const response = await respondToFoundryParseResult(foundryResult, trimmedText.length)
      if (response) return response
    }

    if (importMode === "byo-json" || importMode === "structured-json") {
      const parsed = parseImportContentJsonDetailed(trimmedText)
      if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error }, { status: 400 })
      }
      return await runTextImportPipeline(parsed.content, {
        charLength: trimmedText.length,
        materialSource,
        preferSameSourceReplacements: Boolean(preferSameSourceReplacements),
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

    const sourceLimit = validatePastedSourceTextLength(trimmedText)
    if (!sourceLimit.ok) {
      return NextResponse.json({ error: sourceLimit.message }, { status: 400 })
    }

    const systemPrompt = buildImportSystemPrompt(contentType, {
      customSystems: {
        abilityCategory: typeof customAbilityCategory === "string" ? customAbilityCategory : "",
        classResourceLabels: typeof classResourceLabels === "string" ? classResourceLabels : "",
      },
      subclassMatch:
        typeof subclassMatchClassName === "string" && subclassMatchClassName.trim()
          ? { className: subclassMatchClassName.trim() }
          : null,
    })

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
      preferSameSourceReplacements: Boolean(preferSameSourceReplacements),
      tokenSavings,
    })
  } catch (error) {
    console.error("Text import error:", error)
    return importAiErrorResponse(error)
  }
}
