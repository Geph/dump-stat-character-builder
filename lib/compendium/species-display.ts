import type { Species } from "@/lib/types"

const SPEED_KEY_ALIASES: Record<string, "walk" | "fly" | "swim" | "climb" | "burrow" | "custom"> = {
  walk: "walk",
  walking: "walk",
  fly: "fly",
  flying: "fly",
  swim: "swim",
  swimming: "swim",
  climb: "climb",
  climbing: "climb",
  burrow: "burrow",
  burrowing: "burrow",
  custom: "custom",
}

const SPEED_TYPE_LABELS: Record<string, string> = {
  walk: "Walk",
  fly: "Fly",
  swim: "Swim",
  climb: "Climb",
  burrow: "Burrow",
  custom: "Custom",
}

const SPEED_DISPLAY_ORDER = ["walk", "fly", "swim", "climb", "burrow", "custom"] as const

export type SpeciesSpeedEntry = {
  type: string
  label: string
  feet: number
}

export function collectSpeciesSpeedEntries(speed: Species["speed"]): SpeciesSpeedEntry[] {
  if (typeof speed === "number") {
    return [{ type: "walk", label: SPEED_TYPE_LABELS.walk, feet: speed }]
  }
  if (!speed || typeof speed !== "object") {
    return [{ type: "walk", label: SPEED_TYPE_LABELS.walk, feet: 30 }]
  }

  const resolved = new Map<string, number>()
  for (const [rawKey, rawValue] of Object.entries(speed)) {
    if (typeof rawValue !== "number" || rawValue <= 0) continue
    const type = SPEED_KEY_ALIASES[rawKey.toLowerCase()] ?? "custom"
    resolved.set(type, rawValue)
  }

  if (!resolved.size) {
    return [{ type: "walk", label: SPEED_TYPE_LABELS.walk, feet: 30 }]
  }

  return [...resolved.entries()]
    .sort(([a], [b]) => {
      const ai = SPEED_DISPLAY_ORDER.indexOf(a as (typeof SPEED_DISPLAY_ORDER)[number])
      const bi = SPEED_DISPLAY_ORDER.indexOf(b as (typeof SPEED_DISPLAY_ORDER)[number])
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
    .map(([type, feet]) => ({
      type,
      label: SPEED_TYPE_LABELS[type] ?? type,
      feet,
    }))
}

export function formatSpeciesSizeDisplay(
  species: Pick<Species, "size" | "size_options">,
): string {
  const options = (species.size_options ?? [])
    .map((entry) => String(entry).trim())
    .filter(Boolean)
  const unique = [...new Set(options)]
  if (unique.length >= 2) {
    return unique.join(" or ")
  }
  return String(species.size || unique[0] || "Medium")
}

export function formatSpeciesSpeedDisplay(speed: Species["speed"]): string {
  const entries = collectSpeciesSpeedEntries(speed)
  const walk = entries.find((entry) => entry.type === "walk")
  const other = entries.filter((entry) => entry.type !== "walk")

  if (!other.length) {
    return `${walk?.feet ?? entries[0]?.feet ?? 30} ft.`
  }

  const parts: string[] = []
  if (walk) parts.push(`${walk.feet} ft.`)
  for (const entry of other) {
    parts.push(`${entry.label} ${entry.feet} ft.`)
  }
  return parts.join(", ")
}
