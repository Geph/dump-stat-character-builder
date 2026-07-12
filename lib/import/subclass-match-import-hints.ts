/** Optional match to a subclass already in the compendium (Step 0 import defaults). */
export type SubclassMatchImportHint = {
  name: string
  className: string
}

/** Prompt block that locks parent class_name (and name when re-importing) from a selected row. */
export function formatSubclassMatchImportHint(
  match: SubclassMatchImportHint | null | undefined,
): string {
  const name = match?.name?.trim()
  const className = match?.className?.trim()
  if (!name || !className) return ""

  return `Matched existing subclass (user selection)

The user's compendium already has "${name}" under parent class "${className}". Use that to format subclasses[]:
- subclasses[].class_name must be exactly "${className}" (parent class already in the compendium — do not invent a variant spelling)
- If this source is the same subclass (re-import or update), subclasses[].name must be exactly "${name}"
- If this source is a different subclass of the same class, use the source's own subclass name but still set class_name to "${className}"
- Extract features from the source; keep HTML spell tables in feature descriptions when present`
}
