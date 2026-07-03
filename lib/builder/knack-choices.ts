import type { CustomAbility } from "@/lib/types"

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

export function knackAbilitiesForClass(
  customAbilities: CustomAbility[],
  classNames: string[],
): CustomAbility[] {
  const classKeys = new Set(classNames.map(normalizeName))
  return customAbilities.filter((ability) => {
    if (ability.ability_role !== "knack") return false
    if (ability.attached_to_type === "class" && ability.attached_to_id) {
      const attachKey = normalizeName(ability.attached_to_id)
      return [...classKeys].some(
        (classKey) => attachKey.includes(classKey) || classKey.includes(attachKey),
      )
    }
    if (ability.source?.trim()) {
      return [...classKeys].some((classKey) => normalizeName(ability.source).includes(classKey))
    }
    return classNames.length === 0
  })
}

function parseMinimumClassLevel(prerequisite: string | null | undefined): number | null {
  if (!prerequisite) return null
  const match = prerequisite.match(/(\d+)(?:st|nd|rd|th)?\s*[- ]?level/i)
  if (!match) return null
  const level = parseInt(match[1], 10)
  return Number.isFinite(level) ? level : null
}

function prerequisiteMentionsKnack(prerequisite: string | null | undefined, knackName: string): boolean {
  if (!prerequisite?.trim()) return false
  const needle = normalizeName(knackName)
  return normalizeName(prerequisite).includes(needle)
}

export function isKnackEligible(
  knack: CustomAbility,
  classLevel: number,
  selectedKnackNames: string[],
): boolean {
  const minLevel = knack.level_requirement ?? parseMinimumClassLevel(knack.prerequisites)
  if (minLevel != null && classLevel < minLevel) return false

  const prereq = knack.prerequisites
  if (!prereq?.trim()) return true

  const requiredNames = prereq
    .split(/,| and /i)
    .map((part) => part.replace(/\d+(?:st|nd|rd|th)?\s*[- ]?level\s+\w+/gi, "").trim())
    .filter((part) => part.length > 1)

  for (const required of requiredNames) {
    if (/^\d/.test(required)) continue
    const normalizedRequired = normalizeName(required)
    const satisfied = selectedKnackNames.some((name) => {
      const normalizedName = normalizeName(name)
      return normalizedName.includes(normalizedRequired) || normalizedRequired.includes(normalizedName)
    })
    if (!satisfied) return false
  }

  return true
}

export function aggregateKnackOptions(params: {
  customAbilities: CustomAbility[]
  classNames: string[]
  classLevel: number
  selectedKnackNames: string[]
}): { name: string; description: string; prerequisite?: string | null; repeatable?: boolean | null }[] {
  const knacks = knackAbilitiesForClass(params.customAbilities, params.classNames)
  const selected = params.selectedKnackNames
  const options: { name: string; description: string; prerequisite?: string | null; repeatable?: boolean | null }[] =
    []

  for (const knack of knacks) {
    if (!isKnackEligible(knack, params.classLevel, selected)) continue
    const countInSelection = selected.filter((name) => normalizeName(name) === normalizeName(knack.name)).length
    if (!knack.repeatable && countInSelection > 0) continue
    options.push({
      name: knack.name,
      description: knack.description ?? "",
      prerequisite: knack.prerequisites,
      repeatable: knack.repeatable ?? false,
    })
  }

  return options.sort((a, b) => a.name.localeCompare(b.name))
}

export function validateKnackSelectionChange(params: {
  previous: string[]
  next: string[]
  customAbilities: CustomAbility[]
  classLevel: number
}): { ok: true } | { ok: false; message: string } {
  const knackByName = new Map(
    params.customAbilities
      .filter((row) => row.ability_role === "knack")
      .map((row) => [normalizeName(row.name), row]),
  )

  const removed = params.previous.filter((name) => !params.next.includes(name))
  for (const removedName of removed) {
    for (const keptName of params.next) {
      const kept = knackByName.get(normalizeName(keptName))
      if (!kept?.prerequisites) continue
      if (prerequisiteMentionsKnack(kept.prerequisites, removedName)) {
        return {
          ok: false,
          message: `Cannot replace ${removedName} — ${keptName} requires it as a prerequisite.`,
        }
      }
    }
  }

  const repeatableCounts = new Map<string, number>()
  for (const name of params.next) {
    const knack = knackByName.get(normalizeName(name))
    if (knack?.repeatable) {
      repeatableCounts.set(normalizeName(name), (repeatableCounts.get(normalizeName(name)) ?? 0) + 1)
      continue
    }
    const count = (repeatableCounts.get(normalizeName(name)) ?? 0) + 1
    if (count > 1) {
      return { ok: false, message: `${name} cannot be selected more than once.` }
    }
    repeatableCounts.set(normalizeName(name), count)
  }

  for (const name of params.next) {
    const knack = knackByName.get(normalizeName(name))
    if (!knack) continue
    const others = params.next.filter((entry) => entry !== name)
    if (!isKnackEligible(knack, params.classLevel, others)) {
      return { ok: false, message: `${name} prerequisites are not met.` }
    }
  }

  return { ok: true }
}
