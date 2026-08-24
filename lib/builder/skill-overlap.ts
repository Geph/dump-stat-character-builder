import { DND_SKILLS } from "@/lib/compendium/constants"

const DND_SKILL_KEYS = new Set<string>(DND_SKILLS.map((name) => name.trim().toLowerCase()))

export function skillOverlapKey(name: string): string {
  return name.trim().toLowerCase()
}

function isKnownSkill(name: string): boolean {
  return DND_SKILL_KEYS.has(skillOverlapKey(name))
}

function keySet(names: Iterable<string>): Set<string> {
  const keys = new Set<string>()
  for (const name of names) {
    const key = skillOverlapKey(name)
    if (key) keys.add(key)
  }
  return keys
}

/**
 * Skills the character receives from somewhere other than a class skill pick.
 * Feature and species pick maps also carry non-skill choices (maneuvers, invocations,
 * ...), so entries are narrowed to real skill names before they can displace a pick.
 */
export function collectGrantedSkillNames(params: {
  backgroundSkills?: string[] | null
  speciesTraitPicks?: Record<string, string[]> | null
  featureChoicePicks?: Record<string, string[]> | null
  modifierGrantedSkills?: string[] | null
}): string[] {
  const granted = new Map<string, string>()
  const add = (names: Iterable<string> | null | undefined) => {
    for (const name of names ?? []) {
      if (!isKnownSkill(name)) continue
      const key = skillOverlapKey(name)
      if (!granted.has(key)) granted.set(key, name.trim())
    }
  }

  add(params.backgroundSkills)
  add(params.modifierGrantedSkills)
  for (const picks of Object.values(params.speciesTraitPicks ?? {})) add(picks)
  for (const picks of Object.values(params.featureChoicePicks ?? {})) add(picks)

  return [...granted.values()].sort((a, b) => a.localeCompare(b))
}

export type ClassSkillOverlap = {
  classId: string
  skills: string[]
}

/** Class skill picks that a species, background, feat or feature also hands out. */
export function findClassSkillOverlaps(
  classSkillPicks: Record<string, string[]>,
  grantedSkills: Iterable<string>,
): ClassSkillOverlap[] {
  const granted = keySet(grantedSkills)
  if (!granted.size) return []

  const overlaps: ClassSkillOverlap[] = []
  for (const [classId, picks] of Object.entries(classSkillPicks)) {
    const skills = picks.filter((pick) => granted.has(skillOverlapKey(pick)))
    if (skills.length) overlaps.push({ classId, skills })
  }
  return overlaps
}

/**
 * Drop class skill picks that another source already grants. The class picker then
 * reports itself short, so the player re-picks from the class list — one replacement
 * per duplicate, and the granted skill stays unavailable.
 */
export function releaseOverlappingClassSkillPicks(
  classSkillPicks: Record<string, string[]>,
  grantedSkills: Iterable<string>,
): {
  classSkillPicks: Record<string, string[]>
  released: ClassSkillOverlap[]
  changed: boolean
} {
  const released = findClassSkillOverlaps(classSkillPicks, grantedSkills)
  if (!released.length) return { classSkillPicks, released: [], changed: false }

  const releasedByClassId = new Map(
    released.map((entry) => [entry.classId, keySet(entry.skills)] as const),
  )
  const next: Record<string, string[]> = {}
  for (const [classId, picks] of Object.entries(classSkillPicks)) {
    const drop = releasedByClassId.get(classId)
    next[classId] = drop ? picks.filter((pick) => !drop.has(skillOverlapKey(pick))) : picks
  }

  return { classSkillPicks: next, released, changed: true }
}

/** "Athletics and Stealth" */
export function joinSkillNames(skills: string[]): string {
  if (skills.length <= 1) return skills[0] ?? ""
  return `${skills.slice(0, -1).join(", ")} and ${skills[skills.length - 1]}`
}

export function describeReleasedClassSkills(skills: string[]): string {
  if (!skills.length) return ""
  const list = joinSkillNames(skills)
  return `${list} ${skills.length === 1 ? "is" : "are"} already granted by another source, so ${skills.length === 1 ? "it no longer counts" : "they no longer count"} toward this class. Choose ${skills.length === 1 ? "another skill" : `${skills.length} other skills`} instead.`
}

/** Append skills to an existing proficiency list, ignoring ones already held. */
export function mergeSkillProficiencyNames(
  existing: string[] | null | undefined,
  added: Iterable<string>,
): string[] {
  const merged = [...(existing ?? [])]
  const held = keySet(merged)
  for (const name of added) {
    const key = skillOverlapKey(name)
    if (!key || held.has(key)) continue
    held.add(key)
    merged.push(name.trim())
  }
  return merged
}

export type SkillChoiceOption = {
  name: string
  description?: string
}

/**
 * Whether a feature choice hands out skill *proficiency*. Expertise choices also mention
 * skills but deliberately target ones the character already has, so they are excluded.
 */
export function isSkillProficiencyChoice(params: {
  category?: string | null
  featureName?: string | null
}): boolean {
  const text = `${params.category ?? ""} ${params.featureName ?? ""}`
  if (!/\bskill/i.test(text)) return false
  return !/expertise/i.test(text)
}

/**
 * Skill choice options with proficiencies the character already has removed. When too
 * few options survive to fill the choice, the class skill list tops the pool back up so
 * the grant is never silently wasted.
 */
export function resolveSkillChoiceOptions(
  options: SkillChoiceOption[],
  params: {
    heldSkills: Iterable<string>
    currentSelection?: string[] | null
    required?: number
    fallbackOptions?: string[] | null
  },
): SkillChoiceOption[] {
  const held = keySet(params.heldSkills)
  const kept = keySet(params.currentSelection ?? [])
  const available = options.filter((option) => {
    const key = skillOverlapKey(option.name)
    return kept.has(key) || !held.has(key)
  })

  const required = params.required ?? 0
  if (available.length >= required) return available

  const seen = keySet(available.map((option) => option.name))
  const topUp: SkillChoiceOption[] = []
  for (const name of params.fallbackOptions ?? []) {
    const key = skillOverlapKey(name)
    if (!key || seen.has(key) || held.has(key)) continue
    seen.add(key)
    topUp.push({ name: name.trim() })
  }

  return [...available, ...topUp]
}
