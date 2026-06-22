import { createHash } from "node:crypto"
import type { ImportContent } from "@/lib/import/content-schema"

/** Bump when AI output schema shape changes (invalidates cached chunk results). */
export const IMPORT_EXTRACTION_SCHEMA_VERSION = "2025-05-import-v1"

const chunkCache = new Map<string, ImportContent>()

export type ImportExtractionCacheKeyInput = {
  provider: string
  modelId: string
  chunkText: string
  contentTypeHint?: string | null
  includeAbilities?: boolean
  schemaVersion?: string
}

export function importExtractionCacheKey(input: ImportExtractionCacheKeyInput): string {
  const payload = [
    input.schemaVersion ?? IMPORT_EXTRACTION_SCHEMA_VERSION,
    input.provider,
    input.modelId,
    input.contentTypeHint ?? "all",
    input.includeAbilities ? "abilities" : "no-abilities",
    input.chunkText,
  ].join("\0")

  return createHash("sha256").update(payload).digest("hex")
}

export function getCachedImportChunk(key: string): ImportContent | undefined {
  return chunkCache.get(key)
}

export function setCachedImportChunk(key: string, content: ImportContent): void {
  chunkCache.set(key, content)
}

export function clearImportExtractionCache(): void {
  chunkCache.clear()
}

export function getImportExtractionCacheSize(): number {
  return chunkCache.size
}
