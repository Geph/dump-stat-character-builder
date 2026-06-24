import { parseSubclassSpellTable } from "@/lib/import/subclass-spell-table"
import type { ImportContent } from "@/lib/import/content-schema"

export type ReferencedSpellRef = {
  name: string
  subclassName: string
  className: string
  unlocksAtClassLevel: number
}

export function normalizeSpellLookupKey(name: string): string {
  return name
    .replace(/\*+/g, "")
    .trim()
    .toLowerCase()
    .replace(/\u2019/g, "'")
}

export function spellNamesMatch(a: string, b: string): boolean {
  return normalizeSpellLookupKey(a) === normalizeSpellLookupKey(b)
}

/** Collect spell names referenced by subclass always-prepared tables. */
export function collectReferencedSpellNames(content: ImportContent): ReferencedSpellRef[] {
  const refs: ReferencedSpellRef[] = []
  const seen = new Set<string>()

  for (const subclass of content.subclasses ?? []) {
    const className = subclass.class_name?.trim() || "Unknown"
    for (const feature of subclass.features ?? []) {
      const parsed = parseSubclassSpellTable(feature.description ?? "")
      if (!parsed) continue
      for (const row of parsed.rows) {
        for (const spellName of row.spellNames) {
          const key = `${className}::${normalizeSpellLookupKey(spellName)}`
          if (seen.has(key)) continue
          seen.add(key)
          refs.push({
            name: spellName.replace(/\*+/g, "").trim(),
            subclassName: subclass.name,
            className,
            unlocksAtClassLevel: row.unlocksAtClassLevel,
          })
        }
      }
    }
  }

  return refs
}

export function listMissingReferencedSpellNames(
  content: ImportContent,
  catalogNames: string[],
): string[] {
  const catalogKeys = new Set(catalogNames.map(normalizeSpellLookupKey))
  const missing: string[] = []
  for (const ref of collectReferencedSpellNames(content)) {
    if (!catalogKeys.has(normalizeSpellLookupKey(ref.name))) {
      missing.push(ref.name)
    }
  }
  return [...new Set(missing)].sort((a, b) => a.localeCompare(b))
}
