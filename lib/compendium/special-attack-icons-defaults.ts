/** Curated game-icons slugs for special_attack rows on loaded classes / species. */
export const SPECIAL_ATTACK_ICONS_BY_NAME: Record<string, string> = {
  bomb: "rolling-bomb",
  "nuclear bomb": "nuclear-bomb",
  "toxic recompense": "poison-cloud",
  "armored slam": "mailed-fist",
  "bile blast": "goo-spurt",
  "draconic vengeance": "dragon-breath",
  earthshatter: "stone-block",
  "radiance of the dawn": "sun-radiations",
  "land's aid": "sprout",
  "lands aid": "sprout",
  "breath weapon": "dragon-breath",
  "mind leech": "psychic-waves",
  "astral construct": "crystal-bars",
  "telekinetic force": "rear-aura",
}

const VARIANT_ICONS: Record<string, string> = {
  "bomb:attack": "rolling-bomb",
  "bomb:primed": "rolling-bomb",
  "bomb:explode": "explosion-rays",
}

function lookupKey(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/[—–-]+/g, " ").replace(/\s+/g, " ")
}

export function defaultSpecialAttackIcon(input: {
  attackName?: string | null
  label?: string | null
  attackVariant?: string | null
}): string | null {
  const name = lookupKey(input.attackName)
  const label = lookupKey(input.label)
  const variant = (input.attackVariant ?? "").trim().toLowerCase()

  if (name && variant) {
    const variantIcon = VARIANT_ICONS[`${name}:${variant}`]
    if (variantIcon) return variantIcon
  }

  const fromName = name ? SPECIAL_ATTACK_ICONS_BY_NAME[name] : null
  if (fromName) return fromName

  if (label) {
    for (const [key, icon] of Object.entries(SPECIAL_ATTACK_ICONS_BY_NAME)) {
      if (label.includes(key)) return icon
    }
  }

  return null
}

export function resolveSpecialAttackIcon(input: {
  icon?: string | null
  attackName?: string | null
  label?: string | null
  attackVariant?: string | null
}): string | null {
  const existing = input.icon?.trim()
  if (existing) return existing
  return defaultSpecialAttackIcon(input)
}
