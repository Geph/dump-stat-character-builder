export type SpellOption = {
  id: string
  name: string
  level?: number | null
}

export function formatSpellOptionLabel(spell: SpellOption): string {
  const levelLabel =
    spell.level == null
      ? ""
      : spell.level === 0
        ? "Cantrip"
        : `L${spell.level}`
  return levelLabel ? `${levelLabel} — ${spell.name}` : spell.name
}
