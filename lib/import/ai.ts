import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import type { LanguageModel } from "ai"

export type ImportAiProvider = "openai" | "anthropic" | "google"

const DEFAULT_MODELS: Record<ImportAiProvider, string> = {
  openai: "gpt-4o",
  anthropic: "claude-sonnet-4-20250514",
  google: "gemini-2.0-flash",
}

const PROVIDER_LABELS: Record<ImportAiProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google Gemini",
}

const PROVIDER_ENV_KEYS: Record<ImportAiProvider, string[]> = {
  openai: ["OPENAI_API_KEY"],
  anthropic: ["ANTHROPIC_API_KEY"],
  google: ["GOOGLE_GENERATIVE_AI_API_KEY", "GOOGLE_API_KEY"],
}

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value || undefined
}

function providerHasKey(provider: ImportAiProvider): boolean {
  return PROVIDER_ENV_KEYS[provider].some((name) => Boolean(readEnv(name)))
}

function resolveConfiguredProvider(): ImportAiProvider | null {
  const explicit = readEnv("IMPORT_AI_PROVIDER")?.toLowerCase()
  if (explicit === "openai" || explicit === "anthropic" || explicit === "google") {
    return explicit
  }

  for (const provider of ["openai", "anthropic", "google"] as const) {
    if (providerHasKey(provider)) return provider
  }
  return null
}

export function getImportAiProvider(): ImportAiProvider | null {
  return resolveConfiguredProvider()
}

export function getImportAiProviderLabel(provider: ImportAiProvider): string {
  return PROVIDER_LABELS[provider]
}

export function getImportAiConfigError(): string | null {
  const provider = resolveConfiguredProvider()
  if (!provider) {
    return (
      "No AI provider is configured for import. Set one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, " +
      "GOOGLE_GENERATIVE_AI_API_KEY (or GOOGLE_API_KEY). Optional: IMPORT_AI_PROVIDER=openai|anthropic|google " +
      "and IMPORT_AI_MODEL to override the default model."
    )
  }

  if (!providerHasKey(provider)) {
    const keys = PROVIDER_ENV_KEYS[provider].join(" or ")
    return `${PROVIDER_LABELS[provider]} import selected but ${keys} is not set.`
  }

  return null
}

export function getImportModelId(provider: ImportAiProvider = resolveConfiguredProvider() ?? "openai"): string {
  return readEnv("IMPORT_AI_MODEL") || DEFAULT_MODELS[provider]
}

/** Language model for PDF/text import (OpenAI, Anthropic, or Google). */
export function getImportModel(): LanguageModel {
  const configError = getImportAiConfigError()
  if (configError) {
    throw new Error(configError)
  }

  const provider = resolveConfiguredProvider()!
  const modelId = getImportModelId(provider)

  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey: readEnv("OPENAI_API_KEY") })(modelId)
    case "anthropic":
      return createAnthropic({ apiKey: readEnv("ANTHROPIC_API_KEY") })(modelId)
    case "google": {
      const apiKey = readEnv("GOOGLE_GENERATIVE_AI_API_KEY") ?? readEnv("GOOGLE_API_KEY")
      return createGoogleGenerativeAI({ apiKey })(modelId)
    }
    default:
      throw new Error(`Unsupported import AI provider: ${provider satisfies never}`)
  }
}

export function describeImportAiSetup(): {
  provider: ImportAiProvider | null
  modelId: string | null
  label: string | null
} {
  const provider = resolveConfiguredProvider()
  if (!provider) {
    return { provider: null, modelId: null, label: null }
  }
  return {
    provider,
    modelId: getImportModelId(provider),
    label: PROVIDER_LABELS[provider],
  }
}
