/**
 * Merge a newer LLM "full" extract into an existing Drive import JSON:
 * take new spells[] (and optional creatures), keep/re-apply structural sanitizers.
 */

import { sanitizeHomebrewImportJson } from "@/lib/import/homebrew-import-ops/sanitize-import"

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export type MergeSpellFillInOptions = {
  /** Prefer creature rows from the incoming file when both have creatures[]. Default true. */
  preferIncomingCreatures?: boolean
  /** Prefer equipment from base (Drive) when present. Default true. */
  preferBaseEquipment?: boolean
}

/**
 * @param base Existing Drive / previously fixed import JSON
 * @param incoming Newer Claude/LLM full extract (usually richer spells[])
 */
export function mergeSpellFillIn(
  base: unknown,
  incoming: unknown,
  options: MergeSpellFillInOptions = {},
): Record<string, unknown> {
  const preferIncomingCreatures = options.preferIncomingCreatures !== false
  const preferBaseEquipment = options.preferBaseEquipment !== false

  const baseObj = asRecord(base)
  const incomingObj = asRecord(incoming)
  if (!baseObj || !incomingObj) {
    throw new Error("mergeSpellFillIn: both base and incoming must be objects")
  }

  // Start from incoming (newer prose/mechanics), then restore structural keys from base when useful.
  const merged = clone(incomingObj)

  if (Array.isArray(incomingObj.spells) && incomingObj.spells.length) {
    merged.spells = clone(incomingObj.spells)
  } else if (Array.isArray(baseObj.spells)) {
    merged.spells = clone(baseObj.spells)
  }

  if (preferIncomingCreatures && Array.isArray(incomingObj.creatures) && incomingObj.creatures.length) {
    merged.creatures = clone(incomingObj.creatures)
  } else if (Array.isArray(baseObj.creatures)) {
    merged.creatures = clone(baseObj.creatures)
  }

  if (preferBaseEquipment && Array.isArray(baseObj.equipment) && baseObj.equipment.length) {
    merged.equipment = clone(baseObj.equipment)
  }

  // Prefer base class_resources when they already have corrected shapes, then sanitize anyway.
  if (Array.isArray(baseObj.class_resources) && Array.isArray(incomingObj.class_resources)) {
    const baseByKey = new Map(
      (baseObj.class_resources as unknown[])
        .map(asRecord)
        .filter(Boolean)
        .map((r) => [String(r!.resource_key), r!] as const),
    )
    merged.class_resources = (incomingObj.class_resources as unknown[]).map((row) => {
      const r = asRecord(row)
      if (!r) return row
      const prior = baseByKey.get(String(r.resource_key))
      // Keep incoming tables; sanitizer fixes shape. Prefer base finisher/charnel if keys differ.
      if (!prior) {
        const finisher = baseByKey.get("finisher")
        if (String(r.resource_key).startsWith("finisher") && finisher) return clone(finisher)
      }
      return row
    })
  }

  return sanitizeHomebrewImportJson(merged)
}
