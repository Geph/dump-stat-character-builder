import { getImportModel, resolveImportAiConfig, type ImportAiRequestOverride } from "@/lib/import/ai"
import { toImportExtractionError } from "@/lib/import/ai-errors"
import {
  shouldAttemptDeterministicImport,
} from "@/lib/import/assess-import-confidence"
import type { ImportConfidenceAssessment } from "@/lib/import/assess-import-confidence"
import { chunkImportText } from "@/lib/import/chunk-import-text"
import type { ImportContent } from "@/lib/import/content-schema"
import { extractImportContentDeterministic } from "@/lib/import/extract-import-content-deterministic"
import {
  getCachedImportChunk,
  importExtractionCacheKey,
  setCachedImportChunk,
} from "@/lib/import/import-extraction-cache"
import {
  buildImportContentAiOutputSchema,
  normalizeAiImportContent,
  type AiImportContent,
} from "@/lib/import/import-content-ai-schema"
import {
  getImportChunkSize,
  maxOutputTokensForImport,
} from "@/lib/import/import-ai-limits"
import { applyClassSpellListsToImport } from "@/lib/import/class-spell-lists"
import { mergeImportContent } from "@/lib/import/merge-import-content"
import {
  preprocessImportText,
  type ImportPreprocessStats,
} from "@/lib/import/preprocess-import-text"
import { generateText, Output } from "ai"

export type ImportExtractionMode = "deterministic" | "hybrid" | "ai" | "byo-json"

export type ExtractImportContentOptions = ImportAiRequestOverride & {
  includeAbilities?: boolean
  contentTypeHint?: string | null
}

export type ExtractImportContentResult = {
  content: ImportContent
  preprocessStats: ImportPreprocessStats
  chunkCount: number
  aiProvider?: string
  aiModelId?: string
  extractionMode: ImportExtractionMode
  confidence?: ImportConfidenceAssessment
  cacheHits?: number
}

export { ImportExtractionError } from "@/lib/import/ai-errors"

export async function extractImportContentFromText(
  text: string,
  systemPrompt: string,
  options?: ExtractImportContentOptions,
): Promise<ExtractImportContentResult> {
  const preprocess = preprocessImportText(text, {
    contentTypeHint: options?.contentTypeHint,
  })

  const deterministicAttempt = extractImportContentDeterministic(text, {
    contentTypeHint: options?.contentTypeHint,
    preprocess,
  })

  if (
    shouldAttemptDeterministicImport(options?.contentTypeHint) &&
    deterministicAttempt.confidence.level === "high"
  ) {
    return {
      content: deterministicAttempt.content,
      preprocessStats: preprocess.stats,
      chunkCount: 0,
      extractionMode: "deterministic",
      confidence: deterministicAttempt.confidence,
    }
  }

  const ContentSchema = buildImportContentAiOutputSchema({
    includeAbilities: options?.includeAbilities,
    contentTypeHint: options?.contentTypeHint,
  })
  const chunks = chunkImportText(preprocess.aiText, getImportChunkSize())
  const outputs: ImportContent[] = []
  let cacheHits = 0

  const hasDeterministicPartial =
    Boolean(preprocess.deterministic.classes?.length) ||
    Boolean(preprocess.deterministic.class_resources?.length) ||
    Boolean(preprocess.deterministic.spells?.length)

  const usePartialDeterministic =
    shouldAttemptDeterministicImport(options?.contentTypeHint) &&
    deterministicAttempt.confidence.level === "partial" &&
    Boolean(deterministicAttempt.content.classes?.length)

  if (usePartialDeterministic) {
    outputs.push(deterministicAttempt.content)
  } else if (hasDeterministicPartial) {
    outputs.push(applyClassSpellListsToImport(preprocess.deterministic))
  }

  const model = getImportModel({
    provider: options?.provider,
    modelId: options?.modelId,
  })

  const resolvedConfig = resolveImportAiConfig({
    provider: options?.provider,
    modelId: options?.modelId,
  })
  if ("error" in resolvedConfig) {
    throw new Error(resolvedConfig.error)
  }
  const { provider: aiProvider, modelId: aiModelId } = resolvedConfig

  for (let index = 0; index < chunks.length; index++) {
    const chunk = chunks[index]
    const cacheKey = importExtractionCacheKey({
      provider: aiProvider,
      modelId: aiModelId,
      chunkText: chunk,
      contentTypeHint: options?.contentTypeHint,
      includeAbilities: options?.includeAbilities,
    })
    const cached = getCachedImportChunk(cacheKey)
    if (cached) {
      cacheHits += 1
      outputs.push(cached)
      continue
    }

    const chunkNote =
      chunks.length > 1
        ? `\n\nNote: This is section ${index + 1} of ${chunks.length} from a large document. Extract all content in this section; duplicates will be merged later.`
        : ""

    try {
      const result = await generateText({
        model,
        maxOutputTokens: maxOutputTokensForImport(options?.contentTypeHint),
        system: systemPrompt,
        prompt: `Extract D&D content from this text:${chunkNote}\n\n${chunk}`,
        output: Output.object({ schema: ContentSchema }),
      })

      const normalized = applyClassSpellListsToImport(
        normalizeAiImportContent(result.output as AiImportContent),
      )
      setCachedImportChunk(cacheKey, normalized)
      outputs.push(normalized)
    } catch (error) {
      const partial =
        outputs.length > 0 ? mergeImportContent(outputs) : preprocess.deterministic
      throw toImportExtractionError(error, {
        partialContent: partial,
        completedChunks: outputs.length,
        totalChunks: chunks.length,
      })
    }
  }

  const extractionMode: ImportExtractionMode =
    deterministicAttempt.confidence.level === "partial" ? "hybrid" : "ai"

  return {
    content: mergeImportContent(outputs),
    preprocessStats: preprocess.stats,
    chunkCount: chunks.length,
    aiProvider,
    aiModelId,
    extractionMode,
    confidence: deterministicAttempt.confidence,
    cacheHits,
  }
}
