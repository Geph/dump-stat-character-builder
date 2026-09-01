import type { CastSpellCastingTime, FeatureEffect, Spell } from "@/lib/types"

/** Player picks a known spell to cast through a feature (War Caster Reactive Spell, etc.). */
export type SheetCastSpellChoice = {
  castingTime?: CastSpellCastingTime | null
  spellName?: string | null
  withoutSlot?: boolean
  /** Economy spent when the chosen spell is cast through this feature. */
  economyKind?: "action" | "bonus" | "reaction"
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

export function filterSpellsForCastChoice(
  spells: readonly Spell[],
  choice: SheetCastSpellChoice,
): Spell[] {
  const wantedName = choice.spellName?.trim().toLowerCase()
  return spells
    .filter((spell) => {
      if (wantedName && spell.name.trim().toLowerCase() !== wantedName) return false
      return spellMatchesCastingTimeFilter(spell.casting_time, choice.castingTime)
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
