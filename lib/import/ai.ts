import { createOpenAI } from "@ai-sdk/openai"
import type { LanguageModel } from "ai"

const DEFAULT_MODEL = "gpt-4o"

export function getImportAiConfigError(): string | null {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) {
    return (
      "OpenAI is not configured. Set OPENAI_API_KEY in .env.local (or your server environment) " +
      "to use PDF and text import."
    )
  }
  return null
}

export function getImportModelId(): string {
  return process.env.IMPORT_AI_MODEL?.trim() || DEFAULT_MODEL
}

/** OpenAI model for PDF/text import (requires OPENAI_API_KEY). */
export function getImportModel(): LanguageModel {
  const configError = getImportAiConfigError()
  if (configError) {
    throw new Error(configError)
  }

  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  return openai(getImportModelId())
}
