import type { ImportContent } from "@/lib/import/content-schema"
import { enrichImportedClassList, mergeTableParsedClassResources, type ClassResourceImportRow } from "@/lib/import/enrich-import-classes"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { collectImportModifierPreviews, collectImportModifierReview } from "@/lib/import/import-modifier-previews"
import {
  applyProposalSelections,
  collectImportProposals,
  importProposalsNeedConfirmation,
  type ImportProposalSelections,
  type ImportProposalSet,
} from "@/lib/import/import-proposals"
import {
  applyImportRenames,
  type ImportCollision,
  type ImportRenameMap,
} from "@/lib/import/import-collisions"
import {
  buildImportStages,
  isLargeImport,
  largeImportSummary,
  type ImportStage,
} from "@/lib/import/import-staging"
import { persistImportedContent, normalizeImportMaterialSource, type ImportSourceLabel } from "@/lib/import/persist-import-content"

export function summarizeImportPreview(content: ImportContent): string {
  const parts = Object.entries({
    classes: content.classes?.length ?? 0,
    subclasses: content.subclasses?.length ?? 0,
    spells: content.spells?.length ?? 0,
    feats: content.feats?.length ?? 0,
    species: content.species?.length ?? 0,
    backgrounds: content.backgrounds?.length ?? 0,
    equipment: content.equipment?.length ?? 0,
  })
    .filter(([, count]) => count > 0)
    .map(([type, count]) => `${count} ${type}`)

  if (!parts.length) return "Other compendium content ready to import."
  return `Also ready to import: ${parts.join(", ")}.`
}

export type PreparedImportResult =
  | {
      kind: "confirm"
      proposals: ImportProposalSet
      pendingContent: ImportContent
      previewSummary: string
      collisions: ImportCollision[]
      stages: ImportStage[]
      stagingSummary: string
      isLarge: boolean
    }
  | {
      kind: "persist"
      content: ImportContent
    }

export type PrepareImportOptions = {
  collisions?: ImportCollision[]
  charLength?: number
}

function withSanitizedClassRows(content: ImportContent): ImportContent {
  if (!content.classes?.length) return content

  const classResources = mergeTableParsedClassResources(content)
  const explicitResources = classResources.length
    ? classResources
    : (content.class_resources as ClassResourceImportRow[] | undefined)

  return {
    ...content,
    ...(classResources.length ? { class_resources: classResources } : {}),
    classes: enrichImportedClassList(
      content.classes as Record<string, unknown>[],
      explicitResources,
    ) as ImportContent["classes"],
  }
}

export function needsImportReview(
  proposals: ImportProposalSet,
  collisions: ImportCollision[],
  content: ImportContent,
  charLength?: number,
): boolean {
  return (
    importProposalsNeedConfirmation(proposals) ||
    collisions.length > 0 ||
    isLargeImport(content, charLength) ||
    collectImportModifierPreviews(content).length > 0 ||
    collectImportModifierReview(content).some((row) => row.status === "unwired")
  )
}

export function prepareImportedContent(
  content: ImportContent,
  options: PrepareImportOptions = {},
): PreparedImportResult {
  const sanitized = withSanitizedClassRows(content)
  const enriched = enrichImportContentModifiers(sanitized)
  const proposals = collectImportProposals(enriched)
  const collisions = options.collisions ?? []
  const stages = buildImportStages(enriched)
  const isLarge = isLargeImport(enriched, options.charLength)
  const stagingSummary = isLarge ? largeImportSummary(stages) : ""

  if (needsImportReview(proposals, collisions, enriched, options.charLength)) {
    return {
      kind: "confirm",
      proposals,
      pendingContent: enriched,
      previewSummary: summarizeImportPreview(enriched),
      collisions,
      stages,
      stagingSummary,
      isLarge,
    }
  }
  return { kind: "persist", content: enriched }
}

export async function finalizeImportedContent(
  pendingContent: ImportContent,
  selections: ImportProposalSelections,
  source: ImportSourceLabel,
  renameMap: ImportRenameMap = {},
) {
  const materialSource = normalizeImportMaterialSource(source)
  const renamed = applyImportRenames(pendingContent, renameMap)
  const proposals = collectImportProposals(renamed)
  const withModifiers = enrichImportContentModifiers(
    applyProposalSelections(renamed, proposals, selections),
  )
  return persistImportedContent(withModifiers, materialSource)
}
