/** Spell lists offered by the Magic Initiate origin feat (SRD 2024). */
export const MAGIC_INITIATE_SPELL_LISTS = ["Cleric", "Druid", "Wizard"] as const

export type MagicInitiateSpellList = (typeof MAGIC_INITIATE_SPELL_LISTS)[number]

export type ParsedBackgroundOriginFeat = {
  featName: string
  spellList: MagicInitiateSpellList | null
}

/** Parse stored background origin feat text (e.g. "Magic Initiate (Cleric)"). */
export function parseBackgroundOriginFeat(
  featGranted: string | null | undefined,
): ParsedBackgroundOriginFeat | null {
  const trimmed = featGranted?.trim() ?? ""
  if (!trimmed) return null

  const magicInitiateMatch = trimmed.match(/^Magic Initiate\s*\(([^)]+)\)\s*$/i)
  if (magicInitiateMatch) {
    const rawList = magicInitiateMatch[1].trim()
    const spellList = MAGIC_INITIATE_SPELL_LISTS.find(
      (entry) => entry.toLowerCase() === rawList.toLowerCase(),
    ) ?? null
    return { featName: "Magic Initiate", spellList }
  }

  return { featName: trimmed, spellList: null }
}

/** Spell list locked by a background origin feat grant, if any. */
export function magicInitiateListFromFeatGranted(
  featGranted: string | null | undefined,
): MagicInitiateSpellList | null {
  return parseBackgroundOriginFeat(featGranted)?.spellList ?? null
}

/** e.g. "Choose one Planar Pact feat" → "Planar Pact". */
export function parseBackgroundFeatGrantChoiceCategory(
  featGranted: string | null | undefined,
): string | null {
  const text = featGranted?.trim() ?? ""
  const match = text.match(/choose\s+(?:one|a)\s+(.+?)\s+feat\b/i)
  return match ? match[1].trim() : null
}

export function formatMagicInitiateOriginFeat(spellList: MagicInitiateSpellList): string {
  return `Magic Initiate (${spellList})`
}

/** Options for the background origin feat dropdown (includes Magic Initiate spell-list variants). */
export function backgroundOriginFeatSelectOptions(
  originFeats: { id: string; name: string }[],
): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = []
  const seen = new Set<string>()

  for (const feat of originFeats) {
    if (feat.name === "Magic Initiate") {
      for (const list of MAGIC_INITIATE_SPELL_LISTS) {
        const value = formatMagicInitiateOriginFeat(list)
        if (!seen.has(value)) {
          seen.add(value)
          options.push({ value, label: value })
        }
      }
      continue
    }
    if (!seen.has(feat.name)) {
      seen.add(feat.name)
      options.push({ value: feat.name, label: feat.name })
    }
  }

  return options
}
