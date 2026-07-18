import {
  collectReferencedSpellNames,
  normalizeSpellLookupKey,
  spellNamesMatch,
} from "@/lib/import/collect-referenced-spell-names"
import type { ImportContent } from "@/lib/import/content-schema"
import { normalizeSpellImportRows } from "@/lib/import/normalize-spell-import"
import { enrichSubclassSpellTableFeatures } from "@/lib/compendium/enrich-subclass-spell-features"

type SpellRow = NonNullable<ImportContent["spells"]>[number]

function mergeArrayByName<T extends { name: string }>(
  existing: T[] | undefined,
  incoming: T[] | undefined,
): T[] | undefined {
  if (!incoming?.length) return existing
  const byName = new Map<string, T>()
  for (const row of existing ?? []) {
    byName.set(normalizeSpellLookupKey(row.name), row)
  }
  for (const row of incoming) {
    const key = normalizeSpellLookupKey(row.name)
    const prev = byName.get(key)
    byName.set(key, prev ? { ...prev, ...row, name: prev.name } : row)
  }
  return [...byName.values()]
}

function findSpellInPool(name: string, pool: Map<string, SpellRow>): SpellRow | undefined {
  const direct = pool.get(normalizeSpellLookupKey(name))
  if (direct) return direct
  return [...pool.values()].find((spell) => spellNamesMatch(spell.name, name))
}

/** Pull referenced subclass spells from supplement libraries into the import batch. */
export function attachReferencedSpellsFromSupplements(
  content: ImportContent,
  supplements: SpellRow[],
): ImportContent {
  const refs = collectReferencedSpellNames(content)
  if (!refs.length || !supplements.length) return content

  const existing = new Map(
    (content.spells ?? []).map((spell) => [normalizeSpellLookupKey(spell.name), { ...spell }]),
  )
  const supplementPool = new Map(
    supplements.map((spell) => [normalizeSpellLookupKey(spell.name), spell]),
  )

  for (const ref of refs) {
    const key = normalizeSpellLookupKey(ref.name)
    const current = existing.get(key) ?? findSpellInPool(ref.name, existing)
    if (current) {
      if (!current.classes?.some((cls) => spellNamesMatch(cls, ref.className))) {
        current.classes = [...(current.classes ?? []), ref.className]
      }
      existing.set(normalizeSpellLookupKey(current.name), current)
      continue
    }

    const supplement = findSpellInPool(ref.name, supplementPool)
    if (!supplement) continue

    const attached: SpellRow = {
      ...supplement,
      classes: [...new Set([...(supplement.classes ?? []), ref.className])],
    }
    existing.set(normalizeSpellLookupKey(attached.name), attached)
  }

  return {
    ...content,
    spells: [...existing.values()],
  }
}

/** Ensure parent class names are tagged on spells referenced by subclass tables. */
export function mergeReferencedSpellsIntoImport(content: ImportContent): ImportContent {
  const refs = collectReferencedSpellNames(content)
  if (!refs.length || !content.spells?.length) return content

  const nextSpells = (content.spells ?? []).map((spell) => ({
    ...spell,
    classes: [...(spell.classes ?? [])],
  }))

  for (const ref of refs) {
    const match = nextSpells.find((spell) => spellNamesMatch(spell.name, ref.name))
    if (!match) continue
    if (!match.classes?.some((cls) => spellNamesMatch(cls, ref.className))) {
      match.classes = [...(match.classes ?? []), ref.className]
    }
  }

  return { ...content, spells: nextSpells }
}

export function spellCatalogFromContent(content: ImportContent): { id: string; name: string }[] {
  return (content.spells ?? []).map((spell) => ({
    id: `import:${normalizeSpellLookupKey(spell.name)}`,
    name: spell.name,
  }))
}

/**
 * Prefer library objects before class chapter objects so same-batch wiring can
 * resolve abilities/spells even when the user pastes the array out of order.
 */
export function orderImportContentsForMerge(contents: ImportContent[]): ImportContent[] {
  const rank = (content: ImportContent): number => {
    const hasClassChapter =
      (content.classes?.length ?? 0) > 0 ||
      (content.subclasses?.length ?? 0) > 0 ||
      (content.class_resources?.length ?? 0) > 0
    const hasLibrary =
      (content.abilities?.length ?? 0) > 0 ||
      (content.import_proposals?.custom_abilities?.length ?? 0) > 0 ||
      (content.import_proposals?.class_resources?.length ?? 0) > 0 ||
      (content.spells?.length ?? 0) > 0 ||
      (content.feats?.length ?? 0) > 0 ||
      (content.creatures?.length ?? 0) > 0 ||
      (content.equipment?.length ?? 0) > 0
    if (hasLibrary && !hasClassChapter) return 0
    if (hasLibrary && hasClassChapter) return 1
    if (hasClassChapter) return 2
    return 1
  }
  return [...contents].sort((a, b) => rank(a) - rank(b))
}

/** Combine multiple import payloads (e.g. subclasses + spell libraries) into one batch. */
export function combineImportContents(contents: ImportContent[]): ImportContent {
  const ordered = orderImportContentsForMerge(contents)
  const merged: ImportContent = {}
  const supplementSpells: SpellRow[] = []

  for (const content of ordered) {
    if (content.spells?.length) {
      supplementSpells.push(
        ...normalizeSpellImportRows(content.spells as unknown as Record<string, unknown>[]),
      )
    }
    if (content.classes?.length) {
      merged.classes = mergeArrayByName(merged.classes, content.classes) as unknown as ImportContent["classes"]
    }
    if (content.subclasses?.length) {
      merged.subclasses = mergeArrayByName(
        merged.subclasses,
        content.subclasses,
      ) as unknown as ImportContent["subclasses"]
    }
    if (content.feats?.length) {
      merged.feats = mergeArrayByName(merged.feats, content.feats) as unknown as ImportContent["feats"]
    }
    if (content.creatures?.length) {
      merged.creatures = mergeArrayByName(
        merged.creatures,
        content.creatures,
      ) as unknown as ImportContent["creatures"]
    }
    if (content.species?.length) {
      merged.species = mergeArrayByName(merged.species, content.species) as unknown as ImportContent["species"]
    }
    if (content.backgrounds?.length) {
      merged.backgrounds = mergeArrayByName(
        merged.backgrounds,
        content.backgrounds,
      ) as unknown as ImportContent["backgrounds"]
    }
    if (content.equipment?.length) {
      merged.equipment = mergeArrayByName(
        merged.equipment,
        content.equipment,
      ) as unknown as ImportContent["equipment"]
    }
    if (content.abilities?.length) {
      merged.abilities = mergeArrayByName(merged.abilities, content.abilities) as unknown as ImportContent["abilities"]
    }
    if (content.class_resources?.length) {
      merged.class_resources = [
        ...(merged.class_resources ?? []),
        ...content.class_resources,
      ] as ImportContent["class_resources"]
    }
    if (content.import_proposals) {
      const prev = merged.import_proposals ?? {}
      const next = content.import_proposals
      merged.import_proposals = {
        class_resources: [
          ...(prev.class_resources ?? []),
          ...(next.class_resources ?? []),
        ],
        custom_abilities: [
          ...(prev.custom_abilities ?? []),
          ...(next.custom_abilities ?? []),
        ],
      }
    }
  }

  const withSpells = attachReferencedSpellsFromSupplements(
    {
      ...merged,
      spells: mergeArrayByName(undefined, supplementSpells) as unknown as ImportContent["spells"],
    },
    supplementSpells,
  )

  return mergeReferencedSpellsIntoImport(withSpells)
}

/** Attach always-prepared subclass spell links using spells bundled in the same import. */
export function enrichSubclassSpellTablesOnImport(content: ImportContent): ImportContent {
  if (!content.subclasses?.length || !content.spells?.length) return content

  const catalog = spellCatalogFromContent(content)
  return {
    ...content,
    subclasses: content.subclasses.map((subclass) =>
      enrichSubclassSpellTableFeatures(
        subclass as unknown as Record<string, unknown>,
        catalog,
      ) as typeof subclass,
    ),
  }
}
