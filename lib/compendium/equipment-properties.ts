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

/** Normalize equipment.properties from DB (array or SRD object shape) to string[]. */
export function propertiesToStringArray(props: unknown): string[] {
  if (Array.isArray(props)) {
    return props.filter((p): p is string => typeof p === "string")
  }
  if (props && typeof props === "object") {
    const record = props as Record<string, unknown>
    if (Array.isArray(record.properties)) {
      return record.properties.filter((p): p is string => typeof p === "string")
    }
  }
  return []
}

/** Persist weapon property tags (standard + custom ability names). */
export function stringifyPropertiesForDb(
  tags: string[],
  existing: unknown,
): string[] | Record<string, unknown> {
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    const record = { ...(existing as Record<string, unknown>) }
    record.properties = tags
    return record
  }
  return tags
}
