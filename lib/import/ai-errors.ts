import type { ImportContent } from "@/lib/import/content-schema"

export type ImportAiErrorCode =
  | "quota_exceeded"
  | "rate_limit"
  | "invalid_schema"
  | "config"
  | "unknown"

export type ClassifiedImportAiError = {
  code: ImportAiErrorCode
  message: string
  userMessage: string
  retryable: boolean
  status: number
}

export class ImportExtractionError extends Error {
  code: ImportAiErrorCode
  userMessage: string
  retryable: boolean
  status: number
  partialContent?: ImportContent
  completedChunks?: number
  totalChunks?: number

  constructor(
    classified: ClassifiedImportAiError,
    options?: {
      partialContent?: ImportContent
      completedChunks?: number
      totalChunks?: number
      cause?: unknown
    },
  ) {
    super(classified.message, { cause: options?.cause })
    this.name = "ImportExtractionError"
    this.code = classified.code
    this.userMessage = classified.userMessage
    this.retryable = classified.retryable
    this.status = classified.status
    this.partialContent = options?.partialContent
    this.completedChunks = options?.completedChunks
    this.totalChunks = options?.totalChunks
  }
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return String(error)
}

/** Map provider / SDK failures to actionable import errors. */
export function classifyImportAiError(error: unknown): ClassifiedImportAiError {
  const message = errorText(error)
  const lower = message.toLowerCase()

  if (
    lower.includes("quota") ||
    lower.includes("insufficient_quota") ||
    lower.includes("billing") ||
    lower.includes("exceeded your current quota")
  ) {
    return {
      code: "quota_exceeded",
      message,
      userMessage:
        "Import provider quota exceeded. Use Clipboard → BYO LLM import with your own LLM, or switch provider/model in server AI settings.",
      retryable: true,
      status: 429,
    }
  }

  if (
    lower.includes("not found") &&
    (lower.includes("model") || lower.includes("models/"))
  ) {
    return {
      code: "config",
      message,
      userMessage:
        "The selected import model is not available on this provider. Pick another model in server AI settings, or use Clipboard → BYO LLM import.",
      retryable: false,
      status: 400,
    }
  }

  if (
    lower.includes("rate limit") ||
    lower.includes("rate_limit") ||
    lower.includes("too many requests") ||
    lower.includes("429")
  ) {
    return {
      code: "rate_limit",
      message,
      userMessage:
        "Import provider rate limit hit. Wait a moment and retry, or switch to a different provider/model in Import settings.",
      retryable: true,
      status: 429,
    }
  }

  if (lower.includes("invalid schema for response_format") || lower.includes("json_schema")) {
    return {
      code: "invalid_schema",
      message,
      userMessage:
        "The AI structured-output schema was rejected by the provider. Try a different model or report this as a bug.",
      retryable: false,
      status: 500,
    }
  }

  if (lower.includes("no ai provider is configured") || lower.includes("api key")) {
    return {
      code: "config",
      message,
      userMessage: message,
      retryable: false,
      status: 503,
    }
  }

  return {
    code: "unknown",
    message,
    userMessage: message || "AI import failed.",
    retryable: false,
    status: 500,
  }
}

export function toImportExtractionError(
  error: unknown,
  options?: {
    partialContent?: ImportContent
    completedChunks?: number
    totalChunks?: number
  },
): ImportExtractionError {
  const classified = classifyImportAiError(error)
  return new ImportExtractionError(classified, { ...options, cause: error })
}
