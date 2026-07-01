import type { ImportContent } from "@/lib/import/content-schema"

export type FoundryPackSummary = {
  name: string
  label: string
  type: string
  path?: string
}

export type FoundryManifestInfo = {
  kind: "module" | "world"
  id: string
  title: string
  suggestedSource: string
  packs: FoundryPackSummary[]
  guidance: string[]
}

export type FoundrySkippedEntry = {
  reason: string
  count: number
  examples: string[]
}

export type FoundryReviewEntry = {
  label: string
  detail: string
  documentName?: string
}

export type FoundryImportMeta = {
  sourceLabel: string
  skipped: FoundrySkippedEntry[]
  review: FoundryReviewEntry[]
  mapped: {
    effects: number
    advancements: number
    items: number
  }
}

export function emptyFoundryImportMeta(sourceLabel = "Foundry VTT Import"): FoundryImportMeta {
  return {
    sourceLabel,
    skipped: [],
    review: [],
    mapped: { effects: 0, advancements: 0, items: 0 },
  }
}

export type FoundryParseResult =
  | { kind: "content"; content: ImportContent & { foundryImportMeta?: FoundryImportMeta }; meta: FoundryImportMeta }
  | { kind: "manifest"; manifest: FoundryManifestInfo }
  | { kind: "unsupported"; reason: "leveldb" | "zip" | "binary"; message: string }
  | { kind: "no_importable"; meta: FoundryImportMeta; message: string }
  | { kind: "not_foundry" }

export const FOUNDRY_MANIFEST_GUIDANCE = [
  "Export individual compendium items: right-click an entry → Export Data → JSON.",
  "Or paste a NeDB .db pack file (one JSON document per line) — already supported.",
  "Or unpack the module with the Foundry CLI: fvtt package unpack <module-id> and import JSON from src/packs/<pack>/**/*.json.",
  "LevelDB packs inside a .zip cannot be read directly — unpack to JSON first.",
] as const
