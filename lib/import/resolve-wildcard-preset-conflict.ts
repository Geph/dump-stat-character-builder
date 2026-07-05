export type WildcardPresetConflict = {
  presetKey: string
  reason: string
}

const CUNNING_STRIKE_SRD_RIDERS = /\b(?:Poison|Trip|Withdraw)\b/i

/** When description contradicts a name-matched wildcard preset, prefer description-driven wiring. */
export function wildcardPresetConflict(
  featureName: string,
  description: string,
  presetKey: string,
): WildcardPresetConflict | null {
  const text = description.trim()
  if (!text) return null

  if (presetKey === "*::Cunning Strike" || presetKey === "*::Improved Cunning Strike") {
    if (!/\bExploits?\b|\bExploit\s+Dice\b|\bExploit\s+Die\b/i.test(text)) return null
    if (CUNNING_STRIKE_SRD_RIDERS.test(text)) return null
    return {
      presetKey,
      reason: `Description references Exploit Dice usage, not SRD Cunning Strike riders (${featureName}).`,
    }
  }

  return null
}

export function shouldSkipWildcardPreset(
  featureName: string,
  description: string,
  presetKey: string,
): boolean {
  return wildcardPresetConflict(featureName, description, presetKey) != null
}
