export {
  finalizeImportWithPersist,
  needsImportReview,
  prepareImportedContent,
  summarizeImportPreview,
  type ImportPersistFn,
  type PreparedImportResult,
  type PrepareImportOptions,
} from "@/lib/import/prepare-import"
import type { ImportContent } from "@/lib/import/content-schema"
import {
  finalizeImportWithPersist,
} from "@/lib/import/prepare-import"
import type { ImportProposalSelections } from "@/lib/import/import-proposals"
import {
  type ImportCollision,
  type ImportCollisionResolutionMap,
  type ImportRenameMap,
} from "@/lib/import/import-collisions"
import {
  normalizeImportMaterialSource,
  type ImportSourceLabel,
} from "@/lib/import/import-material-source"
import { persistImportedContent } from "@/lib/import/persist-import-content"
import type { ImportCardArtUrlMap } from "@/lib/import/import-card-art"
import type { PersistImportOptions } from "@/lib/import/persist-import-options"

export async function finalizeImportedContent(
  pendingContent: ImportContent,
  selections: ImportProposalSelections,
  source: ImportSourceLabel,
  renameMap: ImportRenameMap = {},
  collisions: ImportCollision[] = [],
  collisionResolutionMap: ImportCollisionResolutionMap = {},
  cardArtUrlMap: ImportCardArtUrlMap = {},
  persistOptions?: PersistImportOptions,
) {
  return finalizeImportWithPersist(
    pendingContent,
    selections,
    source,
    persistImportedContent,
    renameMap,
    collisions,
    collisionResolutionMap,
    cardArtUrlMap,
    persistOptions,
  )
}

export { normalizeImportMaterialSource, type ImportSourceLabel }
