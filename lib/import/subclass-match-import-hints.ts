/** Optional match to a parent class already in the compendium (Step 0 import defaults). */
export type SubclassMatchImportHint = {
  className: string
}

/** Prompt block that locks parent class_name from a selected class row. */
export function formatSubclassMatchImportHint(
  match: SubclassMatchImportHint | null | undefined,
): string {
  const className = match?.className?.trim()
  if (!className) return ""

  return `Matched parent class (user selection)

The user's compendium already has the class "${className}". Use that to format subclasses[]:
- subclasses[].class_name must be exactly "${className}" (parent class already in the compendium — do not invent a variant spelling)
- Use the source's own subclass name for subclasses[].name
- Extract features from the source; keep HTML spell tables in feature descriptions when present
- When the feature offers mutually exclusive subtype spell lists (land types, similar circles), emit isChoice + one option per subtype with that subtype's HTML spell table in the option description`
}
