/** Standard weapon property tags (SRD 2024). */
export const WEAPON_PROPERTIES = [
  "Ammunition",
  "Finesse",
  "Heavy",
  "Light",
  "Loading",
  "Range",
  "Reach",
  "Special",
  "Thrown",
  "Two-Handed",
  "Versatile",
] as const

export type WeaponPropertyTag = (typeof WEAPON_PROPERTIES)[number]

function stringTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
  }
  if (typeof value === "string") {
    return value
      .split(/[,/]/)
      .map((entry) => entry.trim())
      .filter(Boolean)
  }
  return []
}

/** Normalize equipment.properties from DB (array or SRD object shape) to string[]. */
export function propertiesToStringArray(props: unknown): string[] {
  if (Array.isArray(props) || typeof props === "string") {
    return stringTags(props)
  }
  if (props && typeof props === "object") {
    const record = props as unknown as Record<string, unknown>
    const tags = stringTags(record.properties)
    for (const [key, value] of Object.entries(record)) {
      if (key === "properties" || key === "damage" || key === "mastery" || key === "range" || key === "forms") {
        continue
      }
      if (value === true) tags.push(key)
    }
    return tags
  }
  return []
}

/** Persist weapon property tags (standard + custom ability names). */
export function stringifyPropertiesForDb(
  tags: string[],
  existing: unknown,
): string[] | Record<string, unknown> {
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    const record = { ...(existing as unknown as Record<string, unknown>) }
    record.properties = tags
    return record
  }
  return tags
}
