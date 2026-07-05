import { getDatabaseConfigError, formatDatabaseError } from "@/lib/db/config"
import type { ImportContent } from "@/lib/import/content-schema"
import type { FoundryImportMeta } from "@/lib/import/foundry-types"
import type { ImportContentWithFoundryMeta } from "@/lib/import/foundry-manifest"
import { detectImportCollisionsSafe } from "@/lib/import/fetch-import-collisions"
import { getMultipleClassImportBlock } from "@/lib/import/import-class-limits"
import type { ImportTokenSavingsReport } from "@/lib/import/import-route-utils"
import { prepareImportedContent } from "@/lib/import/finalize-import"
import { persistImportedContent, normalizeImportMaterialSource } from "@/lib/import/persist-import-content"
import { NextResponse } from "next/server"

export async function runTextImportPipeline(
  content: ImportContent | ImportContentWithFoundryMeta,
  options?: {
    charLength?: number
    tokenSavings?: ImportTokenSavingsReport
    sourceLabel?: string
    materialSource?: string
    foundryMeta?: FoundryImportMeta
  },
): Promise<NextResponse> {
  try {
    const charLength = options?.charLength ?? 0
    const tokenSavings = options?.tokenSavings
    const foundryMeta =
      options?.foundryMeta ?? (content as ImportContentWithFoundryMeta).foundryImportMeta
    const materialSource = normalizeImportMaterialSource(
      options?.materialSource ?? options?.sourceLabel ?? foundryMeta?.sourceLabel,
      "Custom",
    )

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

    const { collisions, warning: collisionWarning } = await detectImportCollisionsSafe(content)
    const prepared = prepareImportedContent(content, { collisions, charLength })
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
        extractionMode: tokenSavings?.extractionMode ?? "byo-json",
        warning: collisionWarning,
      })
    }

    const configError = getDatabaseConfigError()
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 503 })
    }

    const { totalImported, breakdown, warnings, report } = await persistImportedContent(
      foundryMeta ? { ...prepared.content, foundryImportMeta: foundryMeta } : prepared.content,
      materialSource,
    )

    return NextResponse.json({
      success: true,
      count: totalImported,
      breakdown,
      warnings: warnings.length > 0 ? warnings : undefined,
      report: report ? { ...report, tokenSavings } : undefined,
      tokenSavings,
      extractionMode: tokenSavings?.extractionMode ?? "byo-json",
    })
  } catch (error) {
    console.error("Text import pipeline error:", error)
    const message = error instanceof Error ? error.message : "Import failed"
    return NextResponse.json(
      { error: formatDatabaseError("Import", message) },
      { status: 500 },
    )
  }
}
