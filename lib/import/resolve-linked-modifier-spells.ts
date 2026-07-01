import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import { resolveSpellNamesToIds } from "@/lib/import/subclass-spell-table"

export const IMPORT_SPELL_NAME_PREFIX = "import_spell_name:"

export function spellNamePlaceholder(spellName: string): string {
  return `${IMPORT_SPELL_NAME_PREFIX}${spellName.trim()}`
}

function isSpellNamePlaceholder(spellId: string): boolean {
  return spellId.startsWith(IMPORT_SPELL_NAME_PREFIX)
}

function spellNameFromPlaceholder(spellId: string): string {
  return spellId.slice(IMPORT_SPELL_NAME_PREFIX.length).trim()
}

/** Resolve import spell-name placeholders on linked modifiers to catalog spell IDs. */
export function resolveLinkedModifierSpells(
  linkedModifiers: LinkedModifierInstance[] | undefined,
  catalog: { id: string; name: string }[],
): LinkedModifierInstance[] | undefined {
  if (!linkedModifiers?.length || !catalog.length) return linkedModifiers

  return linkedModifiers.map((instance) => ({
    ...instance,
    characteristics: instance.characteristics?.map((char) => {
      if (char.type !== "spells_known") return char

      const spells = (char.spells ?? []).map((entry) => {
        if (!entry.spellId || !isSpellNamePlaceholder(entry.spellId)) return entry
        const name = spellNameFromPlaceholder(entry.spellId)
        const { resolved } = resolveSpellNamesToIds([name], catalog)
        const match = resolved[0]
        if (!match) return entry
        return { ...entry, spellId: match.spellId }
      })

      return { ...char, spells }
    }),
  }))
}
