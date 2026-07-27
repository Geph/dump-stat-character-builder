import type { Spell } from "@/lib/types"

export type SpellDetailTag = {
  label: string
  emphasis?: boolean
}

/** Hero badges: level + source (+ concentration / ritual when relevant). */
export function spellDetailOverlayTags(spell: Spell): SpellDetailTag[] {
  const tags: SpellDetailTag[] = [
    {
      label: spell.level === 0 ? "Cantrip" : `Level ${spell.level}`,
      emphasis: true,
    },
  ]
  const source = spell.source?.trim()
  if (source) tags.push({ label: source })
  if (spell.concentration) tags.push({ label: "Concentration" })
  if (spell.ritual) tags.push({ label: "Ritual" })
  return tags
}

/** Casting meta for the detail strip under the spell hero. */
export function spellCastingDetailRows(spell: Spell): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = []
  const casting = spell.casting_time?.trim()
  if (casting) rows.push({ label: "Casting Time", value: casting })
  const range = spell.range?.trim()
  if (range) rows.push({ label: "Range", value: range })
  const duration = spell.duration?.trim()
  if (duration) rows.push({ label: "Duration", value: duration })
  const components = (spell.components ?? []).map((entry) => entry.trim()).filter(Boolean)
  if (components.length > 0) rows.push({ label: "Components", value: components.join(", ") })
  return rows
}
