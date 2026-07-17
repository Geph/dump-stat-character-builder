import { applyBundledCardImage, applySrdCardImage, getCompendiumCardImageUrl, type CompendiumCardVisual } from "@/lib/compendium/card-image"
import {
  BUNDLED_SPELL_CARD_IMAGES_BY_NAME,
  defaultSpellCardImageUrl,
} from "@/lib/compendium/spell-card-images-defaults"
import { spellSummonCreaturePresets } from "@/lib/compendium/spell-summon-creatures"
import { isSrdSource } from "@/lib/srd/source"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"

/** Apply bundled SRD spell card art and summon-creature grants on seed. */
export function enrichSrdSpellRow(row: Record<string, unknown>): Record<string, unknown> {
  let next = applySrdCardImage(row, BUNDLED_SPELL_CARD_IMAGES_BY_NAME)
  if (!isSrdSource(String(next.source ?? ""))) return next

  const presets = spellSummonCreaturePresets(String(next.name ?? ""))
  if (!presets?.length) return next

  const existing = (next.linkedModifiers ?? next.linked_modifiers) as
    | LinkedModifierInstance[]
    | null
    | undefined
  if (existing?.length) return next

  return {
    ...next,
    linkedModifiers: presets,
    linked_modifiers: presets,
  }
}

/** Name-match bundled spell card art for any imported or custom spell row. */
export function enrichSpellRowWithBundledCardImage(
  row: Record<string, unknown>,
): Record<string, unknown> {
  return applyBundledCardImage(row, BUNDLED_SPELL_CARD_IMAGES_BY_NAME)
}

export function enrichSrdSpellList(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(enrichSrdSpellRow)
}

/** Stored card art, else bundled filename match by spell name (same as compendium seed). */
export function resolveSpellCardImageUrl(
  spell: CompendiumCardVisual & { name?: string },
): string | null {
  return getCompendiumCardImageUrl(spell) ?? defaultSpellCardImageUrl(String(spell.name ?? ""))
}
