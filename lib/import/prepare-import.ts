import type { ImportContent } from "@/lib/import/content-schema"
import {
  expandCardArtIntoReviewStubs,
  isCardArtOnlyImport,
} from "@/lib/import/apply-card-art-import"
import {
  enrichImportedClassList,
  mergeTableParsedClassResources,
  type ClassResourceImportRow,
} from "@/lib/import/enrich-import-classes"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import {
  applyProposalSelections,
  collectImportProposals,
  type ImportProposalSelections,
  type ImportProposalSet,
} from "@/lib/import/import-proposals"
import {
  applyImportCollisionResolutions,
  applyImportRenames,
  collisionUpdateNamesByKind,
  type ImportCollision,
  type ImportCollisionResolutionMap,
  type ImportRenameMap,
} from "@/lib/import/import-collisions"
import {
  buildImportStages,
  isLargeImport,
  largeImportSummary,
  type ImportStage,
} from "@/lib/import/import-staging"
import {
  normalizeImportMaterialSource,
  type ImportSourceLabel,
} from "@/lib/import/import-material-source"
import type { PersistImportResult } from "@/lib/import/persist-import-types"
import {
  applyImportCardArtUrls,
  type ImportCardArtUrlMap,
} from "@/lib/import/import-card-art"
import { stripSkippedImportPreviewItems } from "@/lib/import/import-content-preview"

export function summarizeImportPreview(content: ImportContent): string {
  if (content.card_art?.length && isCardArtOnlyImport(content)) {
    return `${content.card_art.length} card image URL${content.card_art.length === 1 ? "" : "s"} ready to apply to matching compendium entries.`
  }
  const parts = Object.entries({
    classes: content.classes?.length ?? 0,
    subclasses: content.subclasses?.length ?? 0,
    spells: content.spells?.length ?? 0,
    feats: content.feats?.length ?? 0,
    species: content.species?.length ?? 0,
    backgrounds: content.backgrounds?.length ?? 0,
    equipment: content.equipment?.length ?? 0,
    card_art: content.card_art?.length ?? 0,
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

export type ImportPersistFn = (
  content: ImportContent,
  source: ImportSourceLabel,
  options?: import("@/lib/import/persist-import-options").PersistImportOptions,
) => Promise<PersistImportResult>

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
      content.classes as unknown as Record<string, unknown>[],
      explicitResources,
    ) as unknown as ImportContent["classes"],
  } as unknown as ImportContent
}

export function needsImportReview(
  _proposals: ImportProposalSet,
  _collisions: ImportCollision[],
  _content: ImportContent,
  _charLength?: number,
): boolean {
  return true
}

export function prepareImportedContent(
  content: ImportContent,
  options: PrepareImportOptions = {},
): PreparedImportResult {
  const withArtStubs = expandCardArtIntoReviewStubs(content)
  const collisions = options.collisions ?? []

  if (isCardArtOnlyImport(content) || isCardArtOnlyImport(withArtStubs)) {
    return {
      kind: "confirm",
      proposals: { classResources: [], customAbilities: [] },
      pendingContent: withArtStubs,
      previewSummary: summarizeImportPreview(withArtStubs),
      collisions,
      stages: buildImportStages(withArtStubs),
      stagingSummary: "",
      isLarge: false,
    }
  }

  const sanitized = withSanitizedClassRows(withArtStubs)
  const enriched = enrichImportContentModifiers(sanitized)
  const proposals = collectImportProposals(enriched)
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

export async function finalizeImportWithPersist(
  pendingContent: ImportContent,
  selections: ImportProposalSelections,
  source: ImportSourceLabel,
  persist: ImportPersistFn,
  renameMap: ImportRenameMap = {},
  collisions: ImportCollision[] = [],
  collisionResolutionMap: ImportCollisionResolutionMap = {},
  cardArtUrlMap: ImportCardArtUrlMap = {},
  persistOptions?: import("@/lib/import/persist-import-options").PersistImportOptions,
  /** Soft-skips from the content preview (independent of collision skip). */
  skippedPreviewKeys: ReadonlySet<string> | readonly string[] = [],
): Promise<PersistImportResult> {
  const materialSource = normalizeImportMaterialSource(source)
  const renamed = collisions.length
    ? applyImportCollisionResolutions(
        pendingContent,
        collisions,
        collisionResolutionMap,
        renameMap,
      )
    : applyImportRenames(pendingContent, renameMap)

  if (isCardArtOnlyImport(pendingContent) || isCardArtOnlyImport(renamed)) {
    const withCardArt = applyImportCardArtUrls(renamed, cardArtUrlMap)
    const toPersist = stripSkippedImportPreviewItems(withCardArt, skippedPreviewKeys)
    return persist(toPersist, materialSource, {
      ...persistOptions,
      updateExistingNames: {
        ...persistOptions?.updateExistingNames,
        ...collisionUpdateNamesByKind(collisions, collisionResolutionMap),
      },
    })
  }

  const proposals = collectImportProposals(renamed)
  const withModifiers = enrichImportContentModifiers(
    applyProposalSelections(renamed, proposals, selections),
  )
  const withCardArt = applyImportCardArtUrls(withModifiers, cardArtUrlMap)
  // Strip after renames/card art so preview indices stay valid for those maps.
  const toPersist = stripSkippedImportPreviewItems(withCardArt, skippedPreviewKeys)
  return persist(toPersist, materialSource, {
    ...persistOptions,
    updateExistingNames: {
      ...persistOptions?.updateExistingNames,
      ...collisionUpdateNamesByKind(collisions, collisionResolutionMap),
    },
  })
}
