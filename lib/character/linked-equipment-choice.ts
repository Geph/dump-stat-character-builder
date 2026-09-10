import { featureChoiceKey } from "@/lib/builder/choices"
import { modifierPlayerChoiceSlotKey } from "@/lib/builder/modifier-player-choices"

export type LinkedEquipmentChoiceKeyParams = {
  actionId?: string | null
  classId?: string | null
  featureName?: string | null
  featureLevel?: number | null
  choiceId: string
}

function pushUnique(keys: string[], seen: Set<string>, key: string | null | undefined) {
  const trimmed = key?.trim()
  if (!trimmed || seen.has(trimmed)) return
  seen.add(trimmed)
  keys.push(trimmed)
}

/** Overlay key plus the level-up `create_mundane` modifier slot. */
export function linkedEquipmentChoiceKeys(params: LinkedEquipmentChoiceKeyParams): string[] {
  const keys: string[] = []
  const seen = new Set<string>()
  if (params.actionId) {
    pushUnique(keys, seen, `player-equipment:${params.actionId}:${params.choiceId}`)
  }
  if (params.classId && params.featureName && params.featureLevel != null) {
    pushUnique(
      keys,
      seen,
      modifierPlayerChoiceSlotKey(
        featureChoiceKey(params.classId, params.featureName, params.featureLevel),
        params.choiceId,
        "equipment",
      ),
    )
  }
  return keys
}

function firstPick(values: string[] | undefined): string | null {
  const value = values?.[0]?.trim()
  return value ? value : null
}

/**
 * Resolve the linked host name from the overlay key, the level-up equipment slot,
 * or a scan when only one of those keys was written.
 */
export function resolveLinkedEquipmentChoiceName(
  params: LinkedEquipmentChoiceKeyParams & { picks: Record<string, string[]> },
): string | null {
  for (const key of linkedEquipmentChoiceKeys(params)) {
    const value = firstPick(params.picks[key])
    if (value) return value
  }

  const choiceId = params.choiceId.trim()
  if (choiceId) {
    const fromChoiceId = firstPick(params.picks[choiceId])
    if (fromChoiceId) return fromChoiceId
    const slotSuffix = `::${choiceId}::equipment`
    const overlaySuffix = `:${choiceId}`
    for (const [key, values] of Object.entries(params.picks)) {
      if (key.endsWith(slotSuffix) || key.endsWith(overlaySuffix)) {
        const value = firstPick(values)
        if (value) return value
      }
    }
  }

  const featureName = params.featureName?.trim().toLowerCase()
  if (featureName) {
    for (const [key, values] of Object.entries(params.picks)) {
      const keyLower = key.toLowerCase()
      if (!keyLower.includes(featureName)) continue
      if (!key.endsWith("::equipment") && !key.startsWith("player-equipment:")) continue
      const value = firstPick(values)
      if (value) return value
    }
  }

  return null
}
