const BLOCKED_CARD_ART_HOST = "jeffginger.com"

const IMAGE_URL_KEYS = new Set([
  "card_image_url",
  "portrait_url",
  "banner_url",
  "image_url",
  "icon_url",
])

function isBlockedHostedCardArtUrl(value: unknown): boolean {
  if (typeof value !== "string") return false
  const trimmed = value.trim().toLowerCase()
  return trimmed.includes(BLOCKED_CARD_ART_HOST)
}

/** Drop jeffginger.com portraits from bundled example packs. Users attach art later. */
export function stripBlockedHostedCardArt<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => stripBlockedHostedCardArt(entry)) as T
  }
  if (!value || typeof value !== "object") return value

  const next: Record<string, unknown> = { ...(value as Record<string, unknown>) }
  let changed = false
  for (const [key, child] of Object.entries(next)) {
    if (IMAGE_URL_KEYS.has(key) && isBlockedHostedCardArtUrl(child)) {
      next[key] = null
      changed = true
      continue
    }
    const stripped = stripBlockedHostedCardArt(child)
    if (stripped !== child) {
      next[key] = stripped
      changed = true
    }
  }
  return (changed ? next : value) as T
}
