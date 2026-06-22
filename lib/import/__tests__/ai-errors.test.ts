import { describe, expect, it } from "vitest"
import { classifyImportAiError, ImportExtractionError } from "@/lib/import/ai-errors"

describe("classifyImportAiError", () => {
  it("maps quota errors to retryable 429", () => {
    const classified = classifyImportAiError(new Error("You exceeded your current quota"))
    expect(classified.code).toBe("quota_exceeded")
    expect(classified.retryable).toBe(true)
    expect(classified.status).toBe(429)
  })

  it("maps rate limit errors", () => {
    const classified = classifyImportAiError(new Error("Rate limit exceeded"))
    expect(classified.code).toBe("rate_limit")
    expect(classified.status).toBe(429)
  })

  it("maps schema rejection errors", () => {
    const classified = classifyImportAiError(
      new Error("Invalid schema for response_format: json_schema"),
    )
    expect(classified.code).toBe("invalid_schema")
    expect(classified.retryable).toBe(false)
  })
})

describe("ImportExtractionError", () => {
  it("carries partial content metadata", () => {
    const error = new ImportExtractionError(
      classifyImportAiError(new Error("quota")),
      {
        partialContent: { classes: [{ name: "Fighter", features: [], hit_die: 10 }] },
        completedChunks: 1,
        totalChunks: 3,
      },
    )

    expect(error.partialContent?.classes?.[0]?.name).toBe("Fighter")
    expect(error.completedChunks).toBe(1)
    expect(error.totalChunks).toBe(3)
  })
})
