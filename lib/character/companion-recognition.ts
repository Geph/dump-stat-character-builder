/** Known companion feature names from SRD / common homebrew. */
export const COMPANION_FEATURE_NAMES =
  /^(?:steel defender|reanimated companion|eldritch cannon|primal companion|wild companion|spirit companion|arcsteel defender)$/i

export function isCompanionFeatureName(name: string): boolean {
  return COMPANION_FEATURE_NAMES.test(name.trim())
}

/** Whether a class/subclass feature describes a companion stat block. */
export function isCompanionStatBlockFeature(feature: {
  name?: string
  description?: string
  companion_stat_block?: unknown
}): boolean {
  if (feature.companion_stat_block) return true
  const name = (feature.name ?? "").trim()
  if (isCompanionFeatureName(name)) return true
  const desc = stripHtml(feature.description ?? "")
  if (/Medium (?:Construct|Undead)|Small or Tiny Object/im.test(desc) && /\bActions\b/i.test(desc)) {
    return true
  }
  if (/\b(?:Force-Empowered Rend|Dreadful Swipe|Activate Cannon)\b/i.test(desc)) return true
  if (/\bgolem companion\b/i.test(name)) return true
  if (/\bcompanion stat block\b/i.test(desc)) return true
  if (/\bArmor Class:\s*\d+/i.test(desc) && /\bHit Points:\s*/i.test(desc)) return true
  if (/creature form/i.test(name)) return true
  return false
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}
