import { canonicalSpellLookupKey } from "@/lib/compendium/spell-name-aliases"
import type { CastSpellCastingTime, FeatureEffect, Spell } from "@/lib/types"

/** Player picks a known spell to cast through a feature (War Caster Reactive Spell, etc.). */
export type SheetCastSpellChoice = {
  castingTime?: CastSpellCastingTime | null
  spellName?: string | null
  /** Named spells this feature can cast; used when more than one unlocks. */
  spellNames?: string[]
  withoutSlot?: boolean
  /** Economy spent when the chosen spell is cast through this feature. */
  economyKind?: "action" | "bonus" | "reaction"
}

export function namedSpellsForCastChoice(choice: SheetCastSpellChoice): string[] {
  if (choice.spellNames?.length) {
    return choice.spellNames.map((name) => name.trim()).filter(Boolean)
  }
  const single = choice.spellName?.trim()
  return single ? [single] : []
}

export function castChoiceNeedsSpellPicker(choice: SheetCastSpellChoice): boolean {
  return namedSpellsForCastChoice(choice).length !== 1
}

export function collectCastSpellEffects(
  effects: FeatureEffect[] | null | undefined,
): FeatureEffect[] {
  return (effects ?? []).filter((effect) => effect.kind === "cast_spell")
}

export function spellMatchesCastingTimeFilter(
  spellCastingTime: string | null | undefined,
  filter: CastSpellCastingTime | null | undefined,
): boolean {
  if (!filter) return true
  const text = (spellCastingTime ?? "").trim().toLowerCase()
  if (filter === "bonus_action") return /\bbonus\s+action\b/.test(text)
  if (filter === "reaction") return /\breaction\b/.test(text)
  if (filter === "minute") return /\bminutes?\b/.test(text)
  if (filter === "hour") return /\bhours?\b/.test(text)
  if (/\bbonus\s+action\b/.test(text) || /\breaction\b/.test(text)) return false
  return /\b(?:1|one)\s+action\b/.test(text) || /^action$/.test(text)
}

function spellMatchesNamedCast(spell: Spell, wantedKeys: Set<string>): boolean {
  return wantedKeys.has(canonicalSpellLookupKey(spell.name)) || wantedKeys.has(canonicalSpellLookupKey(spell.id))
}

export function filterSpellsForCastChoice(
  spells: readonly Spell[],
  choice: SheetCastSpellChoice,
): Spell[] {
  const named = namedSpellsForCastChoice(choice)
  const wantedKeys = new Set(named.map((name) => canonicalSpellLookupKey(name)))
  const seen = new Set<string>()
  return spells
    .filter((spell) => {
      if (wantedKeys.size) {
        if (!spellMatchesNamedCast(spell, wantedKeys)) return false
      } else if (!spellMatchesCastingTimeFilter(spell.casting_time, choice.castingTime)) {
        return false
      }
      const key = spell.id || canonicalSpellLookupKey(spell.name)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice()
    .sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level
      return a.name.localeCompare(b.name)
    })
}

export function spellLevelLabel(level: number): string {
  return level <= 0 ? "Cantrip" : `Level ${level}`
}
