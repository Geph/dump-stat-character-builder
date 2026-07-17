import type { Background } from "@/lib/types"

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

/** e.g. "Choose one Planar Pact feat" / "A Dark Gift feat of your choice" / "Survivor or a Dark Gift feat". */
export type BackgroundFeatGrantChoice = {
  category: string
  /** Named Origin feats offered alongside the category pick (Haunted One / Investigator). */
  alsoFeatNames?: string[]
}

export function parseBackgroundFeatGrantChoice(
  featGranted: string | null | undefined,
): BackgroundFeatGrantChoice | null {
  const text = featGranted?.trim() ?? ""
  if (!text) return null

  // "Survivor or a Dark Gift feat of your choice"
  const namedOr = text.match(
    /^(.+?)\s+or\s+(?:a\s+|one\s+)?(.+?)\s+feat(?:\s+of\s+your\s+choice)?\b/i,
  )
  if (namedOr) {
    const namedFeat = namedOr[1].replace(/^a\s+/i, "").trim()
    const category = namedOr[2].trim()
    if (namedFeat && category && !/^choose\b/i.test(namedFeat)) {
      return { category, alsoFeatNames: [namedFeat] }
    }
  }

  // "A Dark Gift feat of your choice" / "Choose one Dark Gift feat"
  const ofChoice = text.match(
    /^(?:a|one|choose\s+(?:one|a))\s+(.+?)\s+feat(?:\s+of\s+your\s+choice)?\b/i,
  )
  if (ofChoice) {
    return { category: ofChoice[1].trim() }
  }

  const choose = text.match(/choose\s+(?:one|a)\s+(.+?)\s+feat\b/i)
  if (choose) return { category: choose[1].trim() }

  return null
}

/** @deprecated Prefer parseBackgroundFeatGrantChoice — returns category only. */
export function parseBackgroundFeatGrantChoiceCategory(
  featGranted: string | null | undefined,
): string | null {
  return parseBackgroundFeatGrantChoice(featGranted)?.category ?? null
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

export function legacyBackgroundOriginFeatPickKey(backgroundId: string): string {
  return `background:${backgroundId}:origin-feat`
}

/** True when the background feature itself grants a feat pick (e.g. Planar Pact), not tool/language/skill choices. */
function backgroundFeatureGrantsFeatPick(
  background: Pick<Background, "feature"> | null | undefined,
): boolean {
  const feature = background?.feature
  if (!feature) return false
  const linked =
    feature.linkedModifiers ??
    (feature as { linked_modifiers?: unknown[] }).linked_modifiers
  if (!Array.isArray(linked)) return false
  return linked.some((instance: unknown) => {
    if (!instance || typeof instance !== "object") return false
    const characteristics = (instance as { characteristics?: unknown }).characteristics
    if (!Array.isArray(characteristics)) return false
    return characteristics.some(
      (characteristic: unknown) =>
        Boolean(
          characteristic &&
            typeof characteristic === "object" &&
            (characteristic as { type?: unknown }).type === "grant_feat",
        ),
    )
  })
}

/**
 * Pre-2024 backgrounds: both ability_bonuses and feat_granted are null at import.
 * null is intentional — the builder offers free ASI and an Origin feat pick.
 * Proficiency choice linkedModifiers (tools/languages/skills) do not disqualify legacy.
 */
export function isLegacyBackground(
  background: Pick<Background, "ability_bonuses" | "feat_granted" | "feature"> | null | undefined,
): boolean {
  if (!background) return false
  if (background.ability_bonuses !== null) return false
  if (background.feat_granted?.trim()) return false
  if (backgroundFeatureGrantsFeatPick(background)) return false
  return true
}

/** Resolved feat_granted text: fixed grant, or the player's legacy Origin feat pick. */
export function getEffectiveBackgroundFeatGranted(
  background: Pick<Background, "id" | "feat_granted"> | null | undefined,
  featureChoicePicks: Record<string, string[]>,
): string | null {
  if (!background) return null
  const fixed = background.feat_granted?.trim()
  if (fixed) return fixed
  const picked = featureChoicePicks[legacyBackgroundOriginFeatPickKey(background.id)]?.[0]?.trim()
  return picked || null
}

export function legacyBackgroundOriginFeatPickComplete(
  background: Pick<Background, "id" | "ability_bonuses" | "feat_granted" | "feature"> | null | undefined,
  featureChoicePicks: Record<string, string[]>,
): boolean {
  if (!isLegacyBackground(background)) return true
  return Boolean(getEffectiveBackgroundFeatGranted(background, featureChoicePicks))
}
