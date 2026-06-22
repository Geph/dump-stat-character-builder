import { ACTION_EFFECT_OPTIONS } from "@/lib/compendium/class-feature-metadata"
import type { CharacteristicModifierType } from "@/lib/compendium/characteristic-modifiers"

/** Stable catalog ref id for a passive characteristic modifier type (`cat_char_*`). */
export function characteristicCatalogRefId(type: CharacteristicModifierType): string {
  return `cat_char_${type}`
}

/** Stable catalog ref id for an action effect kind (`cat_fx_*`). */
export function effectCatalogRefId(kind: string): string {
  return `cat_fx_${kind}`
}

const CHARACTERISTIC_PREFIX = "cat_char_"
const EFFECT_PREFIX = "cat_fx_"

export function isCharacteristicCatalogRefId(id: string): boolean {
  return id.startsWith(CHARACTERISTIC_PREFIX)
}

export function isEffectCatalogRefId(id: string): boolean {
  return id.startsWith(EFFECT_PREFIX)
}

/** Whether `kind` is a registered action effect in the common modifier catalog. */
export function isKnownEffectKind(kind: string): boolean {
  return ACTION_EFFECT_OPTIONS.some((option) => option.value === kind)
}
