import { getImportModel, resolveImportAiConfig, type ImportAiRequestOverride } from "@/lib/import/ai"
import { toImportExtractionError } from "@/lib/import/ai-errors"
import {
  shouldAttemptDeterministicImport,
} from "@/lib/import/assess-import-confidence"
import type { ImportConfidenceAssessment } from "@/lib/import/assess-import-confidence"
import { chunkImportText } from "@/lib/import/chunk-import-text"
import type { ImportContent } from "@/lib/import/content-schema"
import { isImagesContentTypeHint } from "@/lib/import/content-type-hints"
import { extractImportContentDeterministic } from "@/lib/import/extract-import-content-deterministic"
import {
  createFetchUrlSession,
  createFetchUrlTool,
  FETCH_URL_MAX_CALLS,
  FETCH_URL_TOOL_NAME,
} from "@/lib/import/fetch-url-tool"
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
import { combineImportContents } from "@/lib/import/merge-import-content"
import { parseImportContentJsonDetailed } from "@/lib/import/parse-import-content-json"
import {
  preprocessImportText,
  type ImportPreprocessStats,
} from "@/lib/import/preprocess-import-text"
import { generateText, Output, stepCountIs } from "ai"

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

function passthroughPreprocessStats(text: string): ImportPreprocessStats {
  const chars = text.length
  const tokens = Math.ceil(chars / 4)
  return {
    inputCharsBefore: chars,
    inputCharsAfter: chars,
    estimatedTokensBefore: tokens,
    estimatedTokensAfter: tokens,
    estimatedTokensSaved: 0,
    savedPercent: 0,
    subtractedRegions: [],
    detectedClassName: null,
  }
}

async function extractCardArtImportFromText(
  text: string,
  systemPrompt: string,
  options?: ExtractImportContentOptions,
): Promise<ExtractImportContentResult> {
  const resolvedConfig = resolveImportAiConfig({
    provider: options?.provider,
    modelId: options?.modelId,
  })
  if ("error" in resolvedConfig) {
    throw new Error(resolvedConfig.error)
  }

  const session = createFetchUrlSession(text)
  const model = getImportModel({
    provider: options?.provider,
    modelId: options?.modelId,
  })

  try {
    const result = await generateText({
      model,
      maxOutputTokens: maxOutputTokensForImport("images"),
      system: systemPrompt,
      prompt: `Map image URLs from this source. If you need a directory listing or index page, call ${FETCH_URL_TOOL_NAME} instead of guessing filenames.\n\n${text}`,
      tools: {
        [FETCH_URL_TOOL_NAME]: createFetchUrlTool(session),
      },
      stopWhen: stepCountIs(FETCH_URL_MAX_CALLS + 1),
    })

    const parsed = parseImportContentJsonDetailed(result.text)
    if (!parsed.ok) {
      throw new Error(parsed.error)
    }

    return {
      content: parsed.content,
      preprocessStats: passthroughPreprocessStats(text),
      chunkCount: 1,
      aiProvider: resolvedConfig.provider,
      aiModelId: resolvedConfig.modelId,
      extractionMode: "ai",
    }
  } catch (error) {
    throw toImportExtractionError(error)
  }
}

export async function extractImportContentFromText(
  text: string,
  systemPrompt: string,
  options?: ExtractImportContentOptions,
): Promise<ExtractImportContentResult> {
  if (isImagesContentTypeHint(options?.contentTypeHint)) {
    return extractCardArtImportFromText(text, systemPrompt, options)
  }

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
        outputs.length > 0 ? combineImportContents(outputs) : preprocess.deterministic
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
    content: combineImportContents(outputs),
    preprocessStats: preprocess.stats,
    chunkCount: chunks.length,
    aiProvider,
    aiModelId,
    extractionMode,
    confidence: deterministicAttempt.confidence,
    cacheHits,
  }
}
