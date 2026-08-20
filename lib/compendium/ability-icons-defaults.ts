import { defaultClassIconForName } from "@/lib/compendium/class-icons-defaults"

function trimString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function eligibleClassNames(item: Record<string, unknown>): string[] {
  if (!Array.isArray(item.eligible_classes)) return []
  return item.eligible_classes
    .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    .map((entry) => entry.trim())
}

/**
 * Best-effort owning class label for a custom ability (import attachment, eligible list, or source).
 * Shared multi-class libraries return null so the generic ability icon stays.
 */
export function inferAbilityOwnerClassName(item: Record<string, unknown>): string | null {
  const eligible = eligibleClassNames(item)
  if (eligible.length === 1) return eligible[0]!

  const attachType = trimString(item.attached_to_type).toLowerCase()
  const attachedId = trimString(item.attached_to_id)
  if (attachType === "class" && attachedId && defaultClassIconForName(attachedId)) {
    return attachedId
  }

  for (const key of ["source_name", "class_name", "parent_class_name", "source"] as const) {
    const value = trimString(item[key])
    if (value && defaultClassIconForName(value)) return value
  }

  // Subclass-attached rows sometimes still name the parent in source text.
  if (attachType === "subclass") {
    for (const key of ["source", "source_name"] as const) {
      const value = trimString(item[key])
      if (value && defaultClassIconForName(value)) return value
    }
  }

  return null
}

/**
 * Assigned icon wins. Otherwise owning-class icon (when resolvable), else null for the generic fallback.
 */
export function defaultAbilityIconForItem(item: Record<string, unknown>): string | null {
  const assigned = trimString(item.icon)
  if (assigned) return assigned

  const role = trimString(item.ability_role).toLowerCase()
  const name = trimString(item.name)
  if (role === "discipline" || /\bdiscipline\b/i.test(name)) {
    return "psychic-waves"
  }

  const className = inferAbilityOwnerClassName(item)
  if (className) return defaultClassIconForName(className)

  return null
}
