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

export function legacyBackgroundOriginFeatPickKey(backgroundId: string): string {
  return `background:${backgroundId}:origin-feat`
}

function backgroundFeatureHasLinkedModifiers(
  background: Pick<Background, "feature"> | null | undefined,
): boolean {
  const feature = background?.feature
  if (!feature) return false
  const linked =
    feature.linkedModifiers ??
    (feature as { linked_modifiers?: unknown[] }).linked_modifiers
  return Array.isArray(linked) && linked.length > 0
}

/**
 * Pre-2024 backgrounds: both ability_bonuses and feat_granted are null at import.
 * null is intentional — the builder offers free ASI and an Origin feat pick.
 */
export function isLegacyBackground(
  background: Pick<Background, "ability_bonuses" | "feat_granted" | "feature"> | null | undefined,
): boolean {
  if (!background) return false
  if (background.ability_bonuses !== null) return false
  if (background.feat_granted?.trim()) return false
  if (backgroundFeatureHasLinkedModifiers(background)) return false
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
