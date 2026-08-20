/** Match custom-ability class attachment after persist (name or class UUID). */

export type ClassAbilityMatchTarget = {
  classNames: string[]
  classIds?: string[]
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase()
}

export function classLabelMatches(value: string, targets: ClassAbilityMatchTarget): boolean {
  const key = normalizeKey(value)
  if (!key) return false
  if ((targets.classIds ?? []).some((id) => normalizeKey(id) === key)) return true
  return targets.classNames.some((name) => {
    const classKey = normalizeKey(name)
    if (!classKey) return false
    return classKey === key || classKey.includes(key) || key.includes(classKey)
  })
}

export function customAbilityMatchesClass(
  ability: {
    attached_to_type?: string | null
    attached_to_id?: string | null
    eligible_classes?: string[] | null
    source?: string | null
    source_name?: string | null
    parent_class_name?: string | null
  },
  targets: ClassAbilityMatchTarget,
  options?: { subclassName?: string | null; includeUnassigned?: boolean },
): boolean {
  const eligible = ability.eligible_classes ?? []
  if (eligible.some((name) => classLabelMatches(name, targets))) return true

  const type = ability.attached_to_type?.trim().toLowerCase() ?? ""
  const attachedId = ability.attached_to_id?.trim() ?? ""

  if (type === "class" && attachedId) {
    return classLabelMatches(attachedId, targets)
  }

  if (type === "subclass" && attachedId) {
    const subclassKey = options?.subclassName?.trim()
    if (!subclassKey) return false
    const attachKey = normalizeKey(attachedId)
    const sub = normalizeKey(subclassKey)
    return attachKey === sub || attachKey.includes(sub) || sub.includes(attachKey)
  }

  if (ability.source?.trim() && classLabelMatches(ability.source, targets)) return true
  if (ability.source_name?.trim() && classLabelMatches(ability.source_name, targets)) return true
  if (ability.parent_class_name?.trim() && classLabelMatches(ability.parent_class_name, targets)) {
    return true
  }

  const subclassKey = options?.subclassName?.trim()
  if (subclassKey && ability.source?.trim()) {
    const sourceKey = normalizeKey(ability.source)
    const sub = normalizeKey(subclassKey)
    if (sourceKey.includes(sub) || sub.includes(sourceKey)) return true
  }

  // Unassigned formula/discovery libraries should still appear on the class picker.
  if (!type || !attachedId) {
    return Boolean(options?.includeUnassigned) || targets.classNames.length === 0
  }
  return false
}
