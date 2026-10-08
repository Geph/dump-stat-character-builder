import { spellNameMatchKeys } from "@/lib/compendium/spell-name-match"
import { SPELL_REFERENCE_IMPORT_NOTICE, isSpellReferencePlaceholder } from "@/lib/import/spell-reference-placeholder"

type SpellRow = { name: string; description?: string | null; source?: string | null; creator_url?: string | null }

/** Repair list references at build time without copying another publisher's rules. */
export function normalizeBundledSpellReference<T extends SpellRow>(row: T, catalog: SpellRow[]): T {
  const isReference = !row.description?.trim() || isSpellReferencePlaceholder(row.description) || /^<p><em>Import note:[\s\S]*<\/em><\/p>$/.test(row.description)
  if (!isReference) return row
  const aliases: Record<string, string> = {
    "Calm Emotion": "Calm Emotions", "Detect Good and Evil": "Detect Evil and Good",
    "Pass without a Trace": "Pass without Trace",
  }
  const name = aliases[row.name] ?? row.name
  const keys = new Set(spellNameMatchKeys(name))
  const original = catalog.find((spell) => spellNameMatchKeys(spell.name).some((key) => keys.has(key)))
  return {
    ...row,
    name: original?.name ?? name,
    description: SPELL_REFERENCE_IMPORT_NOTICE,
    source: original?.source ?? (["Blade Ward", "Feeblemind"].includes(name) ? "Wizards of the Coast" : row.source),
    creator_url: original?.creator_url ?? null,
  }
}
