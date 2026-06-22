import { describe, expect, it, beforeEach } from "vitest"
import {
  clearImportExtractionCache,
  getCachedImportChunk,
  getImportExtractionCacheSize,
  importExtractionCacheKey,
  setCachedImportChunk,
} from "@/lib/import/import-extraction-cache"

describe("import extraction cache", () => {
  beforeEach(() => {
    clearImportExtractionCache()
  })

  it("stores and retrieves chunk results by stable hash key", () => {
    const key = importExtractionCacheKey({
      provider: "openai",
      modelId: "gpt-4o-mini",
      chunkText: "Fighter class features",
      contentTypeHint: "classes",
    })

    expect(getCachedImportChunk(key)).toBeUndefined()
    setCachedImportChunk(key, { classes: [{ name: "Fighter", hit_die: 10, features: [] }] })
    expect(getCachedImportChunk(key)?.classes?.[0]?.name).toBe("Fighter")
    expect(getImportExtractionCacheSize()).toBe(1)
  })

  it("changes key when provider, model, hint, or chunk text changes", () => {
    const base = importExtractionCacheKey({
      provider: "openai",
      modelId: "gpt-4o-mini",
      chunkText: "chunk-a",
      contentTypeHint: "classes",
    })
    const otherProvider = importExtractionCacheKey({
      provider: "google",
      modelId: "gpt-4o-mini",
      chunkText: "chunk-a",
      contentTypeHint: "classes",
    })
    const otherChunk = importExtractionCacheKey({
      provider: "openai",
      modelId: "gpt-4o-mini",
      chunkText: "chunk-b",
      contentTypeHint: "classes",
    })

    expect(otherProvider).not.toBe(base)
    expect(otherChunk).not.toBe(base)
  })
})
