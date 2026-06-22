import { NextResponse } from "next/server"
import {
  classifyImportAiError,
  ImportExtractionError,
} from "@/lib/import/ai-errors"
import type { ExtractImportContentResult } from "@/lib/import/run-ai-import"
import type { ImportPreprocessStats } from "@/lib/import/preprocess-import-text"
import type { ImportConfidenceAssessment } from "@/lib/import/assess-import-confidence"
import type { ImportExtractionMode } from "@/lib/import/run-ai-import"

export type ImportTokenSavingsReport = {
  inputCharsBefore: number
  inputCharsAfter: number
  estimatedTokensBefore: number
  estimatedTokensAfter: number
  estimatedTokensSaved: number
  savedPercent: number
  chunkCount: number
  aiProvider?: string
  aiModelId?: string
  extractionMode?: ImportExtractionMode
  confidence?: Pick<
    ImportConfidenceAssessment,
    "level" | "score" | "matchRatio" | "matchedTableFeatures" | "tableFeatureCount"
  >
  subtractedRegions: ImportPreprocessStats["subtractedRegions"]
}

export function buildTokenSavingsReport(
  extraction: Pick<
    ExtractImportContentResult,
    | "preprocessStats"
    | "chunkCount"
    | "aiProvider"
    | "aiModelId"
    | "extractionMode"
    | "confidence"
  >,
): ImportTokenSavingsReport {
  return {
    ...extraction.preprocessStats,
    chunkCount: extraction.chunkCount,
    aiProvider: extraction.aiProvider,
    aiModelId: extraction.aiModelId,
    extractionMode: extraction.extractionMode,
    confidence: extraction.confidence
      ? {
          level: extraction.confidence.level,
          score: extraction.confidence.score,
          matchRatio: extraction.confidence.matchRatio,
          matchedTableFeatures: extraction.confidence.matchedTableFeatures,
          tableFeatureCount: extraction.confidence.tableFeatureCount,
        }
      : undefined,
    subtractedRegions: extraction.preprocessStats.subtractedRegions,
  }
}

export function importAiErrorResponse(error: unknown): NextResponse {
  if (error instanceof ImportExtractionError) {
    return NextResponse.json(
      {
        error: error.userMessage,
        code: error.code,
        partialContent: error.partialContent,
        completedChunks: error.completedChunks,
        totalChunks: error.totalChunks,
      },
      { status: error.status },
    )
  }

  const classified = classifyImportAiError(error)
  return NextResponse.json(
    { error: classified.userMessage, code: classified.code },
    { status: classified.status },
  )
}

export function parseImportAiOverride(body: {
  aiProvider?: string | null
  aiModel?: string | null
}): { provider?: string | null; modelId?: string | null } {
  return {
    provider: body.aiProvider ?? null,
    modelId: body.aiModel ?? null,
  }
}
