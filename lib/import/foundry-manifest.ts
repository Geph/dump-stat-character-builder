import type { ImportContent } from "@/lib/import/content-schema"
import {
  FOUNDRY_MANIFEST_GUIDANCE,
  type FoundryImportMeta,
  type FoundryManifestInfo,
  type FoundryPackSummary,
  type FoundryParseResult,
  emptyFoundryImportMeta,
} from "@/lib/import/foundry-types"

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as unknown as Record<string, unknown>)
    : {}
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export function detectFoundryBinaryFormat(raw: string): FoundryParseResult | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  if (trimmed.charCodeAt(0) === 0x50 && trimmed.charCodeAt(1) === 0x4b) {
    return {
      kind: "unsupported",
      reason: "zip",
      message:
        "This looks like a ZIP archive (Foundry module package). Unpack it first and import JSON from src/packs.",
    }
  }

  if (/[^\x09\x0a\x0d\x20-\x7e]/.test(trimmed.slice(0, 64)) && !trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return {
      kind: "unsupported",
      reason: "leveldb",
      message:
        "This looks like a binary LevelDB pack. Use Foundry CLI (fvtt package unpack) or export individual items as JSON.",
    }
  }

  return null
}

function summarizePack(raw: unknown): FoundryPackSummary | null {
  const pack = asRecord(raw)
  const type = asString(pack.type)
  const name = asString(pack.name) || asString(pack.label)
  if (!type || !name) return null
  return {
    name,
    label: asString(pack.label) || name,
    type,
    path: asString(pack.path) || undefined,
  }
}

export function parseFoundryManifest(value: unknown): FoundryManifestInfo | null {
  const record = asRecord(value)
  const packs = asArray(record.packs)
    .map(summarizePack)
    .filter((pack): pack is FoundryPackSummary => pack != null)

  if (!packs.length) return null

  const hasImportableItems =
    asArray(record.items).length > 0 ||
    packs.some((pack) => pack.type === "Item" && Boolean(pack.path))

  const id = asString(record.id) || asString(record.title) || "foundry-module"
  const title = asString(record.title) || id
  const kind: FoundryManifestInfo["kind"] = record.world != null ? "world" : "module"

  if (!hasImportableItems && packs.every((pack) => pack.type !== "Item")) {
    return {
      kind,
      id,
      title,
      suggestedSource: title,
      packs,
      guidance: [...FOUNDRY_MANIFEST_GUIDANCE],
    }
  }

  if (packs.length > 0 && !asArray(record.items).length) {
    const onlyManifestFields =
      Object.keys(record).every((key) =>
        ["id", "title", "description", "version", "packs", "authors", "url", "manifest", "compatibility", "relationships", "flags", "socket", "system", "languages", "media", "esmodules", "styles", "world"].includes(key),
      )
    if (onlyManifestFields || record.packs) {
      return {
        kind,
        id,
        title,
        suggestedSource: title,
        packs,
        guidance: [...FOUNDRY_MANIFEST_GUIDANCE],
      }
    }
  }

  return null
}

export function buildFoundryNoImportableResult(meta: FoundryImportMeta, message: string): FoundryParseResult {
  return { kind: "no_importable", meta, message }
}

export type ImportContentWithFoundryMeta = ImportContent & {
  foundryImportMeta?: FoundryImportMeta
}

export function attachFoundryMeta(
  content: ImportContent,
  meta: FoundryImportMeta,
): ImportContentWithFoundryMeta {
  return { ...content, foundryImportMeta: meta }
}

export function stripFoundryMeta(content: ImportContentWithFoundryMeta): ImportContent {
  const { foundryImportMeta: _meta, ...rest } = content
  return rest
}

export function defaultFoundryMeta(): FoundryImportMeta {
  return emptyFoundryImportMeta()
}
