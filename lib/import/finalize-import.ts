import type { ImportContent } from "@/lib/import/content-schema"
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
import { persistImportedContent, type ImportSourceLabel } from "@/lib/import/persist-import-content"

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

export function needsImportReview(
  proposals: ImportProposalSet,
  collisions: ImportCollision[],
  content: ImportContent,
  charLength?: number,
): boolean {
  return (
    importProposalsNeedConfirmation(proposals) ||
    collisions.length > 0 ||
    isLargeImport(content, charLength)
  )
}

export function prepareImportedContent(
  content: ImportContent,
  options: PrepareImportOptions = {},
): PreparedImportResult {
  const proposals = collectImportProposals(content)
  const collisions = options.collisions ?? []
  const stages = buildImportStages(content)
  const isLarge = isLargeImport(content, options.charLength)
  const stagingSummary = isLarge ? largeImportSummary(stages) : ""

  if (needsImportReview(proposals, collisions, content, options.charLength)) {
    return {
      kind: "confirm",
      proposals,
      pendingContent: content,
      previewSummary: summarizeImportPreview(content),
      collisions,
      stages,
      stagingSummary,
      isLarge,
    }
  }
  return { kind: "persist", content }
}

export async function finalizeImportedContent(
  pendingContent: ImportContent,
  selections: ImportProposalSelections,
  source: ImportSourceLabel,
  renameMap: ImportRenameMap = {},
) {
  const renamed = applyImportRenames(pendingContent, renameMap)
  const proposals = collectImportProposals(renamed)
  const content = applyProposalSelections(renamed, proposals, selections)
  return persistImportedContent(content, source)
}
