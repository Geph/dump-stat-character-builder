function cleanSpellListName(name: string): string {
  return name.replace(/\*+$/g, "").trim()
}

/** Compare list names to catalog rows (apostrophes, Disk/Disc, "Tenser's …"). */
export function spellNameMatchKeys(name: string): string[] {
  const base = cleanSpellListName(name)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
  if (!base) return []

  const keys = new Set<string>([base])
  const diskSwap = base.replace(/\bdisc\b/g, "disk")
  const discSwap = base.replace(/\bdisk\b/g, "disc")
  keys.add(diskSwap)
  keys.add(discSwap)

  const withoutPossessive = base.replace(/^[a-z]+s\s+/, "")
  if (withoutPossessive && withoutPossessive !== base) {
    keys.add(withoutPossessive)
    keys.add(withoutPossessive.replace(/\bdisc\b/g, "disk"))
    keys.add(withoutPossessive.replace(/\bdisk\b/g, "disc"))
  }

  return [...keys]
}

export function spellNameOnClassList(
  name: string,
  listNames: readonly string[] | null | undefined,
): boolean {
  if (!name.trim() || !listNames?.length) return false
  const spellKeys = new Set(spellNameMatchKeys(name))
  return listNames.some((listName) =>
    spellNameMatchKeys(listName).some((key) => spellKeys.has(key)),
  )
}
