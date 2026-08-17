export const UNASSIGNED_CLASS_FILTER = "__unassigned__"

function namesEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = a?.trim().toLowerCase() ?? ""
  const right = b?.trim().toLowerCase() ?? ""
  return Boolean(left) && left === right
}

export type ClassFilterAbility = {
  attached_to_type?: string | null
  attached_to_id?: string | null
  eligible_classes?: string[] | null
}

export type ClassFilterSubclass = {
  id?: string | null
  name?: string | null
  class_id?: string | null
}

export function resolveClassFilterName(
  filter: string,
  classNamesById: Record<string, string>,
): string {
  if (filter === "all" || filter === UNASSIGNED_CLASS_FILTER) return ""
  return classNamesById[filter] ?? filter
}

export function abilityHasClassLink(ability: ClassFilterAbility): boolean {
  const type = ability.attached_to_type?.trim().toLowerCase() ?? ""
  const id = ability.attached_to_id?.trim() ?? ""
  if ((type === "class" || type === "subclass") && id) return true
  return (ability.eligible_classes ?? []).some((name) => name.trim().length > 0)
}

export function abilityMatchesClassFilter(
  ability: ClassFilterAbility,
  filter: string,
  classNamesById: Record<string, string>,
  subclasses: ClassFilterSubclass[] = [],
): boolean {
  if (filter === "all") return true
  if (filter === UNASSIGNED_CLASS_FILTER) return !abilityHasClassLink(ability)

  const className = resolveClassFilterName(filter, classNamesById)
  const type = ability.attached_to_type?.trim().toLowerCase() ?? ""
  const attachedId = ability.attached_to_id?.trim() ?? ""

  if (type === "class" && attachedId) {
    if (attachedId === filter || namesEqual(attachedId, className)) return true
  }

  if (type === "subclass" && attachedId) {
    const subclass = subclasses.find(
      (row) => row.id === attachedId || namesEqual(row.name, attachedId),
    )
    if (subclass && (subclass.class_id === filter || namesEqual(classNamesById[subclass.class_id ?? ""], className))) {
      return true
    }
  }

  return (ability.eligible_classes ?? []).some((name) => namesEqual(name, className))
}

export function subclassMatchesClassFilter(
  subclass: ClassFilterSubclass,
  filter: string,
): boolean {
  if (filter === "all") return true
  if (filter === UNASSIGNED_CLASS_FILTER) return !subclass.class_id
  return subclass.class_id === filter
}
