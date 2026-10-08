/** Reference-only spell entries are not licensed rules text or a complete write-up. */
export const SPELL_REFERENCE_IMPORT_NOTICE =
  "Import the source that contains this spell, then choose Overwrite for this entry to add its description and casting details. This entry is only a spell-list reference."

export function isSpellReferencePlaceholder(value: unknown): boolean {
  return value === SPELL_REFERENCE_IMPORT_NOTICE
}
