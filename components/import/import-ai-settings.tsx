"use client"

import { useEffect, useMemo, useState } from "react"
import {
  IMPORT_AI_MODEL_OPTIONS,
  type ImportAiProvider,
} from "@/lib/import/ai"

const STORAGE_KEY = "dump-stat-import-ai-settings"

export type ImportAiSettingsValue = {
  provider: ImportAiProvider | "server"
  modelId: string
}

type AiConfigResponse = {
  provider: ImportAiProvider | null
  modelId: string | null
  label: string | null
  configuredProviders: ImportAiProvider[]
  defaults?: Partial<Record<ImportAiProvider, string>>
}

function readStoredSettings(): ImportAiSettingsValue | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ImportAiSettingsValue
    if (!parsed || typeof parsed !== "object") return null
    return parsed
  } catch {
    return null
  }
}

function writeStoredSettings(value: ImportAiSettingsValue) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

type ImportAiSettingsProps = {
  value: ImportAiSettingsValue
  onChange: (value: ImportAiSettingsValue) => void
  className?: string
}

export function ImportAiSettings({ value, onChange, className }: ImportAiSettingsProps) {
  const [serverConfig, setServerConfig] = useState<AiConfigResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/import/ai-config")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: AiConfigResponse | null) => {
        if (!cancelled && data) setServerConfig(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const providerOptions = useMemo(() => {
    const configured = serverConfig?.configuredProviders ?? []
    return [
      { id: "server" as const, label: "Server default" },
      ...configured.map((provider) => ({
        id: provider,
        label:
          provider === "openai"
            ? "OpenAI"
            : provider === "anthropic"
              ? "Anthropic"
              : "Google Gemini",
      })),
    ]
  }, [serverConfig])

  const activeProvider: ImportAiProvider | null =
    value.provider === "server"
      ? serverConfig?.provider ?? null
      : value.provider

  const modelOptions = activeProvider ? IMPORT_AI_MODEL_OPTIONS[activeProvider] : []

  const effectiveModelId =
    value.modelId ||
    (activeProvider
      ? (serverConfig?.defaults?.[activeProvider] ?? IMPORT_AI_MODEL_OPTIONS[activeProvider][0]?.id)
      : "")

  return (
    <div className={className ?? "rounded-xl border border-border bg-muted/40 p-4 space-y-3"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">AI import settings</p>
        {serverConfig?.provider ? (
          <p className="text-xs text-muted-foreground">
            Server default: {serverConfig.label} / {serverConfig.modelId}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm space-y-1">
          <span className="text-muted-foreground">Provider</span>
          <select
            value={value.provider}
            onChange={(event) => {
              const provider = event.target.value as ImportAiSettingsValue["provider"]
              const nextProvider =
                provider === "server" ? serverConfig?.provider ?? "openai" : provider
              const defaultModel =
                IMPORT_AI_MODEL_OPTIONS[nextProvider as ImportAiProvider][0]?.id ?? ""
              const next = { provider, modelId: defaultModel }
              writeStoredSettings(next)
              onChange(next)
            }}
            className="w-full px-3 py-2 bg-background rounded-lg border border-border text-sm"
          >
            {providerOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm space-y-1">
          <span className="text-muted-foreground">Model</span>
          <select
            value={effectiveModelId}
            disabled={!activeProvider}
            onChange={(event) => {
              const next = { ...value, modelId: event.target.value }
              writeStoredSettings(next)
              onChange(next)
            }}
            className="w-full px-3 py-2 bg-background rounded-lg border border-border text-sm disabled:opacity-50"
          >
            {modelOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {activeProvider === "google" ? (
        <p className="text-xs text-muted-foreground">
          Google Gemini 2.0 Flash has a generous free tier — useful when OpenAI quota is exhausted.
        </p>
      ) : activeProvider === "openai" ? (
        <p className="text-xs text-muted-foreground">
          GPT-4o mini is the recommended low-cost default for structured extraction.
        </p>
      ) : null}

      {modelOptions.find((option) => option.id === effectiveModelId)?.note ? (
        <p className="text-xs text-muted-foreground">
          {modelOptions.find((option) => option.id === effectiveModelId)?.note}
        </p>
      ) : null}
    </div>
  )
}

export function useImportAiSettings(): [
  ImportAiSettingsValue,
  (value: ImportAiSettingsValue) => void,
] {
  const [value, setValue] = useState<ImportAiSettingsValue>({
    provider: "server",
    modelId: "",
  })

  useEffect(() => {
    const stored = readStoredSettings()
    if (stored) setValue(stored)
  }, [])

  const update = (next: ImportAiSettingsValue) => {
    writeStoredSettings(next)
    setValue(next)
  }

  return [value, update]
}

export function importAiRequestBody(
  settings: ImportAiSettingsValue,
): { aiProvider?: string; aiModel?: string } {
  if (settings.provider === "server" && !settings.modelId) {
    return {}
  }
  return {
    ...(settings.provider !== "server" ? { aiProvider: settings.provider } : {}),
    ...(settings.modelId ? { aiModel: settings.modelId } : {}),
  }
}
