import {
  isCompendiumItemEnabled,
} from "@/lib/compendium/compendium-enabled"
import { isInvestigatorListSpell } from "@/lib/compendium/investigator-spell-list"
import { isNecromancerListSpell } from "@/lib/compendium/necromancer-spell-list"

/**
 * Spells on Investigator / Necromancer official tables must stay pickable even when
 * their only catalog row was bulk-disabled with another publisher (e.g. Kibbles
 * overwrite of Alarm). Without this, enabling Mage Hand Press Necromancer still
 * leaves most of the list missing from the builder, level-up, and other class
 * spell-choice surfaces.
 */
export function isSpellKeptForBuilderAllowlist(name: string | null | undefined): boolean {
  const trimmed = name?.trim()
  if (!trimmed) return false
  return isNecromancerListSpell(trimmed) || isInvestigatorListSpell(trimmed)
}

type BuilderSpellRow = {
  name?: string | null
  enabled?: boolean | number | null | unknown
}

/**
 * Enabled spells, plus allowlisted class-list rows virtually re-enabled for
 * builder / level-up / modifier spell picks.
 */
export function filterSpellsForBuilder<T extends BuilderSpellRow>(rows: T[]): T[] {
  return rows.flatMap((row) => {
    if (isCompendiumItemEnabled(row)) return [row]
    if (!isSpellKeptForBuilderAllowlist(row.name)) return []
    return [{ ...row, enabled: true }]
  })
}
