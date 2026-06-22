import { describe, expect, it, beforeEach, afterEach } from "vitest"
import {
  describeImportAiSetup,
  getImportAiConfigError,
  getImportAiProvider,
  getImportModelId,
} from "@/lib/import/ai"

const ENV_KEYS = [
  "IMPORT_AI_PROVIDER",
  "IMPORT_AI_MODEL",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GOOGLE_API_KEY",
] as const

describe("import AI provider config", () => {
  const previous: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      previous[key] = process.env[key]
      delete process.env[key]
    }
  })

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (previous[key] === undefined) delete process.env[key]
      else process.env[key] = previous[key]
    }
  })

  it("reports missing keys when no provider is configured", () => {
    expect(getImportAiProvider()).toBeNull()
    expect(getImportAiConfigError()).toMatch(/No AI provider is configured/)
  })

  it("auto-detects OpenAI when OPENAI_API_KEY is set", () => {
    process.env.OPENAI_API_KEY = "sk-test"
    expect(getImportAiProvider()).toBe("openai")
    expect(getImportAiConfigError()).toBeNull()
    expect(getImportModelId("openai")).toBe("gpt-4o-mini")
  })

  it("respects IMPORT_AI_PROVIDER=anthropic", () => {
    process.env.IMPORT_AI_PROVIDER = "anthropic"
    process.env.ANTHROPIC_API_KEY = "sk-ant-test"
    expect(getImportAiProvider()).toBe("anthropic")
    expect(getImportModelId("anthropic")).toContain("claude")
  })

  it("accepts Google keys", () => {
    process.env.IMPORT_AI_PROVIDER = "google"
    process.env.GOOGLE_API_KEY = "google-test"
    expect(getImportAiProvider()).toBe("google")
    expect(getImportAiConfigError()).toBeNull()
  })

  it("describes active setup", () => {
    process.env.OPENAI_API_KEY = "sk-test"
    process.env.IMPORT_AI_MODEL = "gpt-4o-mini"
    expect(describeImportAiSetup()).toEqual({
      provider: "openai",
      modelId: "gpt-4o-mini",
      label: "OpenAI",
      configuredProviders: ["openai"],
    })
  })
})
