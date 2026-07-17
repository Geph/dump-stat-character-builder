import { charInstance, modId } from "@/lib/compendium/modifier-instance-builders"
import { syncModifierRefs, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import { SKILL_NAMES } from "@/lib/compendium/characteristic-modifiers"
import type { ToolChoicePool } from "@/lib/compendium/tool-options"

const TOOL_CATALOG_ID = "cat_char_tool_proficiencies"
const LANG_CATALOG_ID = "cat_char_languages"
const SKILL_CATALOG_ID = "cat_char_skills"

const WORD_COUNTS: Record<string, number> = {
  one: 1,
  a: 1,
  two: 2,
  three: 3,
  four: 4,
}

export type ParsedToolChoice = {
  count: number
  pool: ToolChoicePool
  label: string
}

export type ParsedLanguageChoice = {
  count: number
  label: string
}

export type ParsedSkillChoice = {
  count: number
  label: string
}

/** True when a proficiency string is a pick instruction, not a concrete grant. */
export function isBackgroundProficiencyChoicePhrase(text: string): boolean {
  return Boolean(
    parseBackgroundToolChoicePhrase(text) ||
      parseBackgroundLanguageChoicePhrase(text) ||
      parseBackgroundSkillChoicePhrase(text),
  )
}

export function parseBackgroundToolChoicePhrase(text: string): ParsedToolChoice | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  if (
    /\b(?:choose|select)\s+(?:one|a|\d+)\s+(?:kind\s+of\s+)?artisan'?s?\s+tools?\b/i.test(trimmed) ||
    /^artisan'?s?\s+tools?$/i.test(trimmed)
  ) {
    return { count: 1, pool: "artisans", label: "Choose one kind of Artisan's Tools" }
  }

  if (
    /\b(?:choose|select)\s+(?:one|a|\d+)\s+(?:kind\s+of\s+)?(?:musical\s+instrument|instrument)\b/i.test(
      trimmed,
    ) ||
    /^musical\s+instrument$/i.test(trimmed)
  ) {
    return { count: 1, pool: "musical", label: "Choose one kind of Musical Instrument" }
  }

  if (
    /\b(?:choose|select)\s+(?:one|a|\d+)\s+(?:kind\s+of\s+)?gaming\s+set\b/i.test(trimmed) ||
    /^gaming\s+set(?:\s*\(any\))?$/i.test(trimmed)
  ) {
    return { count: 1, pool: "gaming", label: "Choose one kind of Gaming Set" }
  }

  return null
}

export function parseBackgroundLanguageChoicePhrase(text: string): ParsedLanguageChoice | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const match = trimmed.match(
    /\b(?:choose|select|learn)?\s*(one|two|three|four|a|\d+)\s+(?:additional\s+)?languages?\s+of\s+your\s+choice\b/i,
  )
  if (match) {
    const raw = match[1].toLowerCase()
    const count = WORD_COUNTS[raw] ?? Number.parseInt(raw, 10)
    if (!Number.isFinite(count) || count < 1) return null
    return {
      count,
      label: `Choose ${count} language${count === 1 ? "" : "s"}`,
    }
  }

  // "Two of your choice (Abyssal, Celestial, or Infernal recommended)"
  const ofChoice = trimmed.match(
    /^(one|two|three|four|\d+)\s+of\s+your\s+choice\b/i,
  )
  if (ofChoice) {
    const raw = ofChoice[1].toLowerCase()
    const count = WORD_COUNTS[raw] ?? Number.parseInt(raw, 10)
    if (!Number.isFinite(count) || count < 1) return null
    return {
      count,
      label: `Choose ${count} language${count === 1 ? "" : "s"}`,
    }
  }

  return null
}

const SKILL_CHOICE_PHRASE_RE =
  /\b(?:choose|select|gain proficiency in)?\s*(one|two|three|four|a|\d+)\s+(?:additional\s+)?skills?\s+of\s+your\s+choice\b/i

const SKILL_NAMES_BY_LENGTH = [...SKILL_NAMES].sort((a, b) => b.length - a.length)

/** Parse unrestricted background skill choices, including faction-table fallback wording. */
export function parseBackgroundSkillChoicePhrase(text: string): ParsedSkillChoice | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const match = trimmed.match(SKILL_CHOICE_PHRASE_RE)
  if (!match) return null

  const raw = match[1].toLowerCase()
  const count = WORD_COUNTS[raw] ?? Number.parseInt(raw, 10)
  if (!Number.isFinite(count) || count < 1) return null
  return {
    count,
    label: `Choose ${count} skill${count === 1 ? "" : "s"}`,
  }
}

/**
 * When a single skill_proficiencies entry mixes fixed skills with a choice fallback
 * (e.g. "Arcana, the skill associated with your faction …, or one skill of your choice"),
 * recover the concrete skill names that appear before the choice phrase.
 */
export function extractFixedSkillsFromMixedChoiceEntry(text: string): string[] {
  const match = text.match(SKILL_CHOICE_PHRASE_RE)
  if (!match || match.index == null) return []
  const before = text.slice(0, match.index)
  const found: string[] = []
  for (const skill of SKILL_NAMES_BY_LENGTH) {
    const re = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")
    if (re.test(before) && !found.includes(skill)) found.push(skill)
  }
  return found
}

function toolChoiceInstance(
  key: string,
  choice: ParsedToolChoice,
): LinkedModifierInstance {
  return charInstance(`modinst_bg_tool_${key}`, TOOL_CATALOG_ID, [
    {
      id: modId(`bg_tool_${key}`),
      type: "tool_proficiencies",
      values: [],
      choiceCount: choice.count,
      toolChoicePool: choice.pool,
      label: choice.label,
    },
  ])
}

function languageChoiceInstance(
  key: string,
  choice: ParsedLanguageChoice,
): LinkedModifierInstance {
  return charInstance(`modinst_bg_lang_${key}`, LANG_CATALOG_ID, [
    {
      id: modId(`bg_lang_${key}`),
      type: "languages",
      values: [],
      choiceCount: choice.count,
      choicePool: "standard",
      label: choice.label,
    },
  ])
}

function skillChoiceInstance(
  key: string,
  choice: ParsedSkillChoice,
): LinkedModifierInstance {
  return charInstance(`modinst_bg_skill_${key}`, SKILL_CATALOG_ID, [
    {
      id: modId(`bg_skill_${key}`),
      type: "skills",
      entries: [],
      allowAnySkill: true,
      choiceCount: choice.count,
      label: choice.label,
    },
  ])
}

/**
 * Convert skill/tool/language choice phrases into
 * feature linkedModifiers, and strip those phrases from the proficiency arrays.
 */
export function wireBackgroundProficiencyChoices(row: Record<string, unknown>): Record<string, unknown> {
  const skillList = [
    ...((row.skill_proficiencies as string[] | null | undefined) ?? []),
  ]
  // Some extractors preserve a faction table but omit its explicit fallback skill pick.
  // Treat "one skill of your choice" in background prose as the same unrestricted choice.
  const descriptionSkillChoice =
    typeof row.description === "string"
      ? parseBackgroundSkillChoicePhrase(row.description)
      : null
  const toolList = [
    ...((row.tool_proficiencies as string[] | null | undefined) ?? []),
    ...((((row.proficiencies as { tools?: string[] } | null)?.tools) ?? []) as string[]),
  ]
  const languageList = [
    ...((((row.proficiencies as { languages?: string[] } | null)?.languages) ?? []) as string[]),
  ]

  const choiceMods: LinkedModifierInstance[] = []
  const fixedSkills: string[] = []
  const fixedTools: string[] = []
  const fixedLanguages: string[] = []
  const seenSkillFp = new Set<string>()
  const seenToolFp = new Set<string>()
  const seenLangFp = new Set<string>()

  for (const entry of skillList) {
    const choice = parseBackgroundSkillChoicePhrase(entry)
    if (choice) {
      for (const skill of extractFixedSkillsFromMixedChoiceEntry(entry)) {
        if (!fixedSkills.includes(skill)) fixedSkills.push(skill)
      }
      const fp = `skill:${choice.count}`
      if (!seenSkillFp.has(fp)) {
        seenSkillFp.add(fp)
        choiceMods.push(skillChoiceInstance(`choice_${choice.count}`, choice))
      }
      continue
    }
    const trimmed = entry.trim()
    if (trimmed && !fixedSkills.includes(trimmed)) fixedSkills.push(trimmed)
  }
  if (descriptionSkillChoice) {
    const fp = `skill:${descriptionSkillChoice.count}`
    if (!seenSkillFp.has(fp)) {
      seenSkillFp.add(fp)
      choiceMods.push(
        skillChoiceInstance(`choice_${descriptionSkillChoice.count}`, descriptionSkillChoice),
      )
    }
  }

  for (const entry of toolList) {
    const choice = parseBackgroundToolChoicePhrase(entry)
    if (choice) {
      const fp = `${choice.pool}:${choice.count}`
      if (!seenToolFp.has(fp)) {
        seenToolFp.add(fp)
        choiceMods.push(toolChoiceInstance(`${choice.pool}_${choice.count}`, choice))
      }
      continue
    }
    const trimmed = entry.trim()
    if (trimmed && !fixedTools.includes(trimmed)) fixedTools.push(trimmed)
  }

  for (const entry of languageList) {
    const choice = parseBackgroundLanguageChoicePhrase(entry)
    if (choice) {
      const fp = `lang:${choice.count}`
      if (!seenLangFp.has(fp)) {
        seenLangFp.add(fp)
        choiceMods.push(languageChoiceInstance(`choice_${choice.count}`, choice))
      }
      continue
    }
    const trimmed = entry.trim()
    if (trimmed && !fixedLanguages.includes(trimmed)) fixedLanguages.push(trimmed)
  }

  if (!choiceMods.length) return row

  const feature = (row.feature ?? null) as Record<string, unknown> | null
  const existing = (feature?.linkedModifiers ?? feature?.linked_modifiers ?? []) as LinkedModifierInstance[]
  const existingTypes = new Set(
    existing.flatMap((inst) => (inst.characteristics ?? []).map((c) => c.type)),
  )
  const toAdd = choiceMods.filter((inst) => {
    const type = inst.characteristics?.[0]?.type
    return type && !existingTypes.has(type)
  })

  const linkedModifiers = syncModifierRefs({
    linkedModifiers: [...existing, ...toAdd],
  }).linkedModifiers

  const prevProf = (row.proficiencies as Record<string, unknown> | null | undefined) ?? {}
  return {
    ...row,
    skill_proficiencies: fixedSkills.length ? fixedSkills : null,
    tool_proficiencies: fixedTools.length ? fixedTools : null,
    proficiencies: {
      ...prevProf,
      tools: fixedTools,
      languages: fixedLanguages,
    },
    feature: feature
      ? {
          ...feature,
          linkedModifiers,
          linked_modifiers: linkedModifiers,
        }
      : {
          name: "Background Proficiencies",
          description: "",
          linkedModifiers,
          linked_modifiers: linkedModifiers,
        },
  }
}

export function backgroundFeatureModsSourceKey(backgroundId: string): string {
  return `background:${backgroundId}:feature`
}
