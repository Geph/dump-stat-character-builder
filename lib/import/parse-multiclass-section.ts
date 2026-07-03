/** Parse multiclassing section text into structured class import fields. */

export type MulticlassImportFields = {
  multiclass_prerequisites: { ability: string; minimum: number }[]
  multiclass_prerequisite_groups?: { options: { ability: string; minimum: number }[] }[]
  multiclass_proficiencies_gained: string[]
  prose: string
}

function parseAbilityRequirement(fragment: string): { ability: string; minimum: number } | null {
  const trimmed = fragment.trim()
  const forward = trimmed.match(/(\d+)\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)/i)
  if (forward) {
    return { minimum: parseInt(forward[1], 10) || 13, ability: forward[2] }
  }
  const reverse = trimmed.match(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+(\d+)/i)
  if (reverse) {
    return { minimum: parseInt(reverse[2], 10) || 13, ability: reverse[1] }
  }
  return null
}

function parseOrAbilityRequirements(fragment: string): { ability: string; minimum: number }[] {
  const parts = fragment
    .split(/\bor\b/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
  if (!parts.length) return []

  let sharedMinimum: number | null = null
  for (let i = parts.length - 1; i >= 0; i--) {
    const req = parseAbilityRequirement(parts[i])
    if (req) {
      sharedMinimum = req.minimum
      break
    }
  }

  const options: { ability: string; minimum: number }[] = []
  for (const part of parts) {
    const req = parseAbilityRequirement(part)
    if (req) {
      options.push(req)
      continue
    }
    const abilityOnly = part.match(
      /^(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)$/i,
    )
    if (abilityOnly && sharedMinimum != null) {
      options.push({ ability: abilityOnly[1], minimum: sharedMinimum })
    }
  }
  return options
}

function parseAbilityRequirements(fragment: string): { ability: string; minimum: number }[] {
  if (/\bor\b/i.test(fragment)) {
    return parseOrAbilityRequirements(fragment)
  }
  const options: { ability: string; minimum: number }[] = []
  for (const match of fragment.matchAll(
    /(\d+)\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)/gi,
  )) {
    options.push({
      minimum: parseInt(match[1], 10) || 13,
      ability: match[2],
    })
  }
  if (!options.length) {
    const single = parseAbilityRequirement(fragment)
    if (single) options.push(single)
  }
  return options
}

function parsePrerequisiteGroups(prereqBlock: string): {
  flat: { ability: string; minimum: number }[]
  groups: { options: { ability: string; minimum: number }[] }[]
} {
  const flat: { ability: string; minimum: number }[] = []
  const groups: { options: { ability: string; minimum: number }[] }[] = []
  const andSegments = prereqBlock
    .split(/\band\b/i)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)

  for (const segment of andSegments) {
    const options = parseAbilityRequirements(segment)
    if (!options.length) continue
    if (/\bor\b/i.test(segment)) {
      groups.push({ options })
      continue
    }
    for (const option of options) {
      groups.push({ options: [option] })
      flat.push(option)
    }
  }

  return { flat, groups }
}

function titleAbility(word: string): string {
  const lower = word.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

export function parseMulticlassSection(text: string | null | undefined): MulticlassImportFields | null {
  if (!text?.trim()) return null
  if (!/multiclass/i.test(text)) return null

  const prerequisites: { ability: string; minimum: number }[] = []
  const proficiencies: string[] = []

  const prereqBlock =
    text.match(/prerequisite[s]?:([\s\S]*?)(?:proficienc|equipment|starting|features|$)/i)?.[1] ?? text
  const { flat, groups } = parsePrerequisiteGroups(prereqBlock)
  prerequisites.push(...flat)

  const profBlock = text.match(
    /proficienc(?:y|ies)[^:]*:([\s\S]*?)(?:starting|equipment|features|$)/i,
  )?.[1]
  if (profBlock) {
    for (const token of profBlock.split(/[,;]+/)) {
      const cleaned = token.replace(/\band\b/gi, " ").trim()
      if (cleaned.length > 2) proficiencies.push(cleaned)
    }
  }

  if (!prerequisites.length && !proficiencies.length) return null

  return {
    multiclass_prerequisites: prerequisites,
    ...(groups.length ? { multiclass_prerequisite_groups: groups } : {}),
    multiclass_proficiencies_gained: proficiencies,
    prose: text.trim(),
  }
}

export function extractMulticlassSection(fullClassText: string): {
  classText: string
  multiclass: MulticlassImportFields | null
} {
  const match = fullClassText.match(
    /\bMulticlassing\b([\s\S]*?)(?=\n(?:Fighting Styles|Spell List|Archetype|Subclass|Equipment|Quick Build)\b|\s*$)/i,
  )
  if (!match) return { classText: fullClassText, multiclass: null }
  const multiclass = parseMulticlassSection(match[0])
  const classText = fullClassText.replace(match[0], "").trim()
  return { classText, multiclass }
}
