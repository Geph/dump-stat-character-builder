import { persistImportedContentLocal } from "@/lib/data/persist-import-content-local"
import type { ImportContent } from "@/lib/import/content-schema"
import type { ImportReport } from "@/lib/import/build-import-report"
import { detectImportCollisionsLocal } from "@/lib/import/detect-import-collisions-local"
import { getMultipleClassImportBlock } from "@/lib/import/import-class-limits"
import type {
  ImportCollision,
  ImportCollisionResolutionMap,
  ImportRenameMap,
} from "@/lib/import/import-collisions"
import { normalizeImportMaterialSource } from "@/lib/import/import-material-source"
import { parseImportContentJson } from "@/lib/import/parse-import-content-json"
import {
  finalizeImportWithPersist,
  prepareImportedContent,
} from "@/lib/import/prepare-import"
import type { ImportProposalSelections, ImportProposalSet } from "@/lib/import/import-proposals"
import type { ImportStage } from "@/lib/import/import-staging"

const BYO_JSON_PARSE_ERROR =
  "Could not parse import JSON. Paste valid Dump Stat import-content JSON from the BYO workflow (see the prompt template)."

export type ClientByoImportReviewResult = {
  needsConfirmation: true
  proposals: ImportProposalSet
  pendingContent: ImportContent
  previewSummary: string
  collisions: ImportCollision[]
  stages: ImportStage[]
  stagingSummary: string
}

export type ClientByoImportSuccessResult = {
  success: true
  count: number
  breakdown: Record<string, number>
  warnings?: string[]
  report?: ImportReport
}

export type ClientByoImportResult = ClientByoImportReviewResult | ClientByoImportSuccessResult

export async function runClientByoJsonImport(
  text: string,
  materialSource: string,
): Promise<ClientByoImportResult> {
  const trimmed = text.trim()
  const content = parseImportContentJson(trimmed)
  if (!content) {
    throw new Error(BYO_JSON_PARSE_ERROR)
  }

  const multiClassBlock = getMultipleClassImportBlock(content, "text")
  if (multiClassBlock) {
    throw new Error(multiClassBlock.message)
  }

  const collisions = await detectImportCollisionsLocal(content)
  const prepared = prepareImportedContent(content, { collisions, charLength: trimmed.length })

  if (prepared.kind === "confirm") {
    return {
      needsConfirmation: true,
      proposals: prepared.proposals,
      pendingContent: prepared.pendingContent,
      previewSummary: prepared.previewSummary,
      collisions: prepared.collisions,
      stages: prepared.stages,
      stagingSummary: prepared.stagingSummary,
    }
  }

  const source = normalizeImportMaterialSource(materialSource)
  const result = await persistImportedContentLocal(prepared.content, source)
  return {
    success: true,
    count: result.totalImported,
    breakdown: result.breakdown,
    warnings: result.warnings.length > 0 ? result.warnings : undefined,
    report: result.report,
  }
}

export async function confirmClientByoJsonImport(params: {
  pendingContent: ImportContent
  selections: ImportProposalSelections
  materialSource: string
  renameMap: ImportRenameMap
  collisions: ImportCollision[]
  collisionResolutionMap: ImportCollisionResolutionMap
}): Promise<ClientByoImportSuccessResult> {
  const multiClassBlock = getMultipleClassImportBlock(params.pendingContent, "text")
  if (multiClassBlock) {
    throw new Error(multiClassBlock.message)
  }

  const result = await finalizeImportWithPersist(
    params.pendingContent,
    params.selections,
    params.materialSource,
    persistImportedContentLocal,
    params.renameMap,
    params.collisions,
    params.collisionResolutionMap,
  )

  return {
    success: true,
    count: result.totalImported,
    breakdown: result.breakdown,
    warnings: result.warnings.length > 0 ? result.warnings : undefined,
    report: result.report,
  }
}
