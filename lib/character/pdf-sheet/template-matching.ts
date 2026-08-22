/**
 * Classifies user-supplied fillable sheet PDFs by filename so the right one can be
 * picked automatically at export time.
 *
 * Filenames from the common sheet packs look like
 * `456029-Character_Sheet_FIGHTER_FILLABLE.pdf`, `..._MARTIAL_FILLABLE.pdf`,
 * `..._HALF_CASTER_FILLABLE.pdf`, `..._BACK_FILLABLE.pdf`, or
 * `2024 PHB Character Sheet (fillable).pdf`.
 */

export type SheetTemplateKind =
  | "class"
  | "martial"
  | "caster"
  | "half-caster"
  | "back"
  | "addon"
  | "general"

export type SheetTemplateDescriptor = {
  id: string
  fileName: string
  /** Compendium class names this template is specific to (usually zero or one). */
  classNames: string[]
  kind: SheetTemplateKind
}

export type SheetTemplateTarget = {
  /** Class names on the character, primary first. */
  classNames: string[]
  /** True when any class on the character has spellcasting. */
  isSpellcaster: boolean
  /** True when the character's casting comes from a half-caster progression only. */
  isHalfCaster?: boolean
}

/**
 * Fallback class list for tagging imported templates when the compendium catalog is
 * not loaded. Covers the SRD classes plus the homebrew classes this app ships.
 */
export const DEFAULT_TEMPLATE_CLASS_NAMES = [
  "Artificer",
  "Barbarian",
  "Bard",
  "Cleric",
  "Druid",
  "Fighter",
  "Inventor",
  "Monk",
  "Occultist",
  "Paladin",
  "Psion",
  "Ranger",
  "Rogue",
  "Sorcerer",
  "Warden",
  "Warlock",
  "Wizard",
] as const

function tokenize(fileName: string): string[] {
  return fileName
    .toLowerCase()
    .replace(/\.pdf$/, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

function containsPhrase(tokens: readonly string[], phrase: string): boolean {
  const words = phrase.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  if (words.length === 0) return false
  for (let i = 0; i + words.length <= tokens.length; i += 1) {
    if (words.every((word, offset) => tokens[i + offset] === word)) return true
  }
  return false
}

/** Class names a template is specific to, matched against the live compendium list. */
export function detectTemplateClassNames(
  fileName: string,
  knownClassNames: readonly string[],
): string[] {
  const tokens = tokenize(fileName)
  return knownClassNames.filter((className) => containsPhrase(tokens, className))
}

export function detectTemplateKind(fileName: string, classNames: readonly string[]): SheetTemplateKind {
  const tokens = tokenize(fileName)
  if (containsPhrase(tokens, "spell sheet") || containsPhrase(tokens, "ability sheet")) return "addon"
  if (containsPhrase(tokens, "wild shape")) return "addon"
  if (containsPhrase(tokens, "companion") || containsPhrase(tokens, "familiar")) return "addon"
  if (containsPhrase(tokens, "add on") || containsPhrase(tokens, "addon")) return "addon"
  if (classNames.length > 0) return "class"
  if (containsPhrase(tokens, "half caster")) return "half-caster"
  if (containsPhrase(tokens, "caster")) return "caster"
  if (containsPhrase(tokens, "martial")) return "martial"
  if (containsPhrase(tokens, "back")) return "back"
  return "general"
}

export function describeSheetTemplate(
  id: string,
  fileName: string,
  knownClassNames: readonly string[],
): SheetTemplateDescriptor {
  const classNames = detectTemplateClassNames(fileName, knownClassNames)
  return { id, fileName, classNames, kind: detectTemplateKind(fileName, classNames) }
}

/** Higher scores win. Returns null when a template is not usable as a front sheet. */
function scoreTemplate(
  template: SheetTemplateDescriptor,
  target: SheetTemplateTarget,
): number | null {
  if (template.kind === "addon" || template.kind === "back") return null

  if (template.kind === "class") {
    const primary = target.classNames[0]?.toLowerCase()
    const matchesPrimary = template.classNames.some((name) => name.toLowerCase() === primary)
    if (matchesPrimary) return 100
    const matchesAny = template.classNames.some((name) =>
      target.classNames.some((cls) => cls.toLowerCase() === name.toLowerCase()),
    )
    return matchesAny ? 80 : null
  }

  if (template.kind === "half-caster") return target.isHalfCaster ? 60 : 20
  if (template.kind === "caster") return target.isSpellcaster ? 50 : 10
  if (template.kind === "martial") return target.isSpellcaster ? 15 : 50
  return 30
}

/**
 * Pick the best front sheet for a character: an exact class sheet when the user has
 * imported one, otherwise the closest generic sheet (caster / half-caster / martial),
 * otherwise any general sheet.
 */
export function selectSheetTemplate<T extends SheetTemplateDescriptor>(
  templates: readonly T[],
  target: SheetTemplateTarget,
): T | null {
  let best: T | null = null
  let bestScore = -Infinity
  for (const template of templates) {
    const score = scoreTemplate(template, target)
    if (score === null || score <= bestScore) continue
    best = template
    bestScore = score
  }
  return best
}

/** Companion "back" / add-on sheets that pair with the chosen front sheet. */
export function selectCompanionTemplates<T extends SheetTemplateDescriptor>(
  templates: readonly T[],
): T[] {
  return templates.filter((template) => template.kind === "back")
}
