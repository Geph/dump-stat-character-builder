import { SPEED_TYPES } from "@/lib/compendium/characteristic-modifiers"

export type CharacterSpeedEntry = {
  type: string
  label: string
  feet: number
}

const SPEED_SHORT_LABELS = Object.fromEntries(
  SPEED_TYPES.map((entry) => [entry.value, entry.value === "walk" ? "walk" : entry.value]),
) as Record<string, string>

function speedLabel(type: string): string {
  return SPEED_SHORT_LABELS[type] ?? type
}

/** Resolve all movement speeds from aggregated modifiers and base walk speed. */
export function resolveAllSpeeds(params: {
  walkSpeed: number
  aggregatedSpeed: Record<string, number>
  speedEqualToWalk: string[]
  exhaustionMultiplier?: number
  exhaustionZero?: boolean
}): CharacterSpeedEntry[] {
  const {
    walkSpeed,
    aggregatedSpeed,
    speedEqualToWalk,
    exhaustionMultiplier = 1,
    exhaustionZero = false,
  } = params

  if (exhaustionZero) {
    return [{ type: "walk", label: "walk", feet: 0 }]
  }

  const applyExhaustion = (feet: number) =>
    exhaustionMultiplier < 1 ? Math.floor(feet * exhaustionMultiplier) : feet

  const resolved = new Map<string, number>()
  resolved.set("walk", applyExhaustion(walkSpeed))

  for (const type of speedEqualToWalk) {
    if (type === "walk") continue
    if (!resolved.has(type)) resolved.set(type, applyExhaustion(walkSpeed))
  }

  for (const [type, feet] of Object.entries(aggregatedSpeed)) {
    if (type === "walk" || typeof feet !== "number") continue
    resolved.set(type, applyExhaustion(feet))
  }

  const order = ["walk", "fly", "swim", "climb", "burrow", "custom"]
  return [...resolved.entries()]
    .sort(([a], [b]) => {
      const ai = order.indexOf(a)
      const bi = order.indexOf(b)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
    .map(([type, feet]) => ({
      type,
      label: speedLabel(type),
      feet,
    }))
}

/** Sheet UI: walk always; other modes only when a modifier grants a non-zero speed. */
export function filterDisplaySpeedEntries(entries: CharacterSpeedEntry[]): CharacterSpeedEntry[] {
  if (!entries.length) return [{ type: "walk", label: "walk", feet: 30 }]
  const walk = entries.find((entry) => entry.type === "walk")
  const granted = entries.filter((entry) => entry.type !== "walk" && entry.feet > 0)
  if (!walk) return granted.length ? granted : [entries[0]!]
  return granted.length ? [walk, ...granted] : [walk]
}

export function formatSpeedEntries(entries: CharacterSpeedEntry[]): string {
  const visible = filterDisplaySpeedEntries(entries)
  if (!visible.length) return "30 ft"
  if (visible.length === 1) return `${visible[0].feet} ft`
  return visible.map((entry) => `${entry.feet} ft ${entry.label}`).join(" · ")
}
