import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import type { LanguageModel } from "ai"

export type ImportAiProvider = "openai" | "anthropic" | "google"

export type ImportAiModelOption = {
  id: string
  label: string
  note?: string
}

/** UI-facing model choices per provider (server must still have the matching API key). */
export const IMPORT_AI_MODEL_OPTIONS: Record<ImportAiProvider, ImportAiModelOption[]> = {
  openai: [
    {
      id: "gpt-4o-mini",
      label: "GPT-4o mini",
      note: "Recommended — low cost, good for structured extraction",
    },
    { id: "gpt-4o", label: "GPT-4o", note: "Higher quality, higher cost" },
  ],
  anthropic: [
    {
      id: "claude-sonnet-4-20250514",
      label: "Claude Sonnet 4",
      note: "Default Anthropic model",
    },
    {
      id: "claude-3-5-haiku-20241022",
      label: "Claude 3.5 Haiku",
      note: "Faster / cheaper",
    },
  ],
  google: [
    {
      id: "gemini-2.0-flash",
      label: "Gemini 2.0 Flash",
      note: "Generous free tier — good default when OpenAI quota is tight",
    },
    { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", note: "Fallback Google model" },
  ],
}

const DEFAULT_MODELS: Record<ImportAiProvider, string> = {
  openai: "gpt-4o-mini",
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

export type ImportAiRequestOverride = {
  provider?: string | null
  modelId?: string | null
}

export type ResolvedImportAiConfig = {
  provider: ImportAiProvider
  modelId: string
  label: string
}

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value || undefined
}

function isImportAiProvider(value: string | null | undefined): value is ImportAiProvider {
  return value === "openai" || value === "anthropic" || value === "google"
}

function providerHasKey(provider: ImportAiProvider): boolean {
  return PROVIDER_ENV_KEYS[provider].some((name) => Boolean(readEnv(name)))
}

function resolveConfiguredProvider(): ImportAiProvider | null {
  const explicit = readEnv("IMPORT_AI_PROVIDER")?.toLowerCase()
  if (isImportAiProvider(explicit)) return explicit

  for (const provider of ["openai", "anthropic", "google"] as const) {
    if (providerHasKey(provider)) return provider
  }
  return null
}

export function listConfiguredImportAiProviders(): ImportAiProvider[] {
  return (["openai", "anthropic", "google"] as const).filter((provider) => providerHasKey(provider))
}

export function getImportAiProvider(): ImportAiProvider | null {
  return resolveConfiguredProvider()
}

export function getImportAiProviderLabel(provider: ImportAiProvider): string {
  return PROVIDER_LABELS[provider]
}

export function resolveImportAiConfig(
  override?: ImportAiRequestOverride,
): ResolvedImportAiConfig | { error: string } {
  const overrideProvider = override?.provider?.trim().toLowerCase()
  const provider = isImportAiProvider(overrideProvider)
    ? overrideProvider
    : resolveConfiguredProvider()

  if (!provider) {
    return {
      error:
        "No AI provider is configured for import. Set one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, " +
        "GOOGLE_GENERATIVE_AI_API_KEY (or GOOGLE_API_KEY). Optional: IMPORT_AI_PROVIDER=openai|anthropic|google " +
        "and IMPORT_AI_MODEL to override the default model.",
    }
  }

  if (!providerHasKey(provider)) {
    const keys = PROVIDER_ENV_KEYS[provider].join(" or ")
    return {
      error: `${PROVIDER_LABELS[provider]} import selected but ${keys} is not set on the server.`,
    }
  }

  const modelId =
    override?.modelId?.trim() ||
    readEnv("IMPORT_AI_MODEL") ||
    DEFAULT_MODELS[provider]

  return {
    provider,
    modelId,
    label: PROVIDER_LABELS[provider],
  }
}

export function getImportAiConfigError(override?: ImportAiRequestOverride): string | null {
  const resolved = resolveImportAiConfig(override)
  return "error" in resolved ? resolved.error : null
}

export function getImportModelId(
  provider: ImportAiProvider = resolveConfiguredProvider() ?? "openai",
): string {
  return readEnv("IMPORT_AI_MODEL") || DEFAULT_MODELS[provider]
}

/** Language model for PDF/text import (OpenAI, Anthropic, or Google). */
export function getImportModel(override?: ImportAiRequestOverride): LanguageModel {
  const resolved = resolveImportAiConfig(override)
  if ("error" in resolved) {
    throw new Error(resolved.error)
  }

  const { provider, modelId } = resolved

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

export function describeImportAiSetup(override?: ImportAiRequestOverride): {
  provider: ImportAiProvider | null
  modelId: string | null
  label: string | null
  configuredProviders: ImportAiProvider[]
} {
  const configuredProviders = listConfiguredImportAiProviders()
  const resolved = resolveImportAiConfig(override)
  if ("error" in resolved) {
    return { provider: null, modelId: null, label: null, configuredProviders }
  }
  return {
    provider: resolved.provider,
    modelId: resolved.modelId,
    label: resolved.label,
    configuredProviders,
  }
}
