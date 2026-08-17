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
import { parseImportContentJsonDetailed } from "@/lib/import/parse-import-content-json"
import {
  finalizeImportWithPersist,
  prepareImportedContent,
} from "@/lib/import/prepare-import"
import type { ImportProposalSelections, ImportProposalSet } from "@/lib/import/import-proposals"
import type { ImportStage } from "@/lib/import/import-staging"
import type { ImportCardArtUrlMap } from "@/lib/import/import-card-art"
import { stripSkippedImportPreviewItems } from "@/lib/import/import-content-preview"
import {
  expandCardArtIntoReviewStubs,
  isCardArtOnlyImport,
} from "@/lib/import/apply-card-art-import"

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
  discoveredSpellSchools?: string[]
}

export type ClientByoImportResult = ClientByoImportReviewResult | ClientByoImportSuccessResult

export async function runClientByoJsonImport(
  text: string,
  materialSource: string,
  persistOptions?: import("@/lib/import/persist-import-options").PersistImportOptions,
): Promise<ClientByoImportResult> {
  const trimmed = text.trim()
  const parsed = parseImportContentJsonDetailed(trimmed)
  if (!parsed.ok) {
    throw new Error(parsed.error)
  }
  const content = parsed.content

  const multiClassBlock =
    !isCardArtOnlyImport(content) ? getMultipleClassImportBlock(content, "text") : null
  if (multiClassBlock) {
    throw new Error(multiClassBlock.message)
  }

  const reviewContent = expandCardArtIntoReviewStubs(content)
  const collisions = await detectImportCollisionsLocal(reviewContent)
  const prepared = prepareImportedContent(reviewContent, {
    collisions,
    charLength: trimmed.length,
  })

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
  const result = await persistImportedContentLocal(prepared.content, source, persistOptions)
  return {
    success: true,
    count: result.totalImported,
    breakdown: result.breakdown,
    warnings: result.warnings.length > 0 ? result.warnings : undefined,
    report: result.report,
    discoveredSpellSchools: result.discoveredSpellSchools,
  }
}

export async function confirmClientByoJsonImport(params: {
  pendingContent: ImportContent
  selections: ImportProposalSelections
  materialSource: string
  renameMap: ImportRenameMap
  collisions: ImportCollision[]
  collisionResolutionMap: ImportCollisionResolutionMap
  cardArtUrlMap?: ImportCardArtUrlMap
  preferSameSourceReplacements?: boolean
  skippedPreviewKeys?: ReadonlySet<string> | readonly string[]
}): Promise<ClientByoImportSuccessResult> {
  const contentForGate = stripSkippedImportPreviewItems(
    params.pendingContent,
    params.skippedPreviewKeys ?? [],
  )
  const multiClassBlock = !isCardArtOnlyImport(contentForGate)
    ? getMultipleClassImportBlock(contentForGate, "text")
    : null
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
    params.cardArtUrlMap ?? {},
    {
      preferSameSourceReplacements: Boolean(params.preferSameSourceReplacements),
    },
    params.skippedPreviewKeys ?? [],
  )

  return {
    success: true,
    count: result.totalImported,
    breakdown: result.breakdown,
    warnings: result.warnings.length > 0 ? result.warnings : undefined,
    report: result.report,
    discoveredSpellSchools: result.discoveredSpellSchools,
  }
}
