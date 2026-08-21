import { parseBackgroundToolChoicePhrase } from "@/lib/compendium/wire-background-proficiency-choices"
import { charInstance, modId } from "@/lib/compendium/modifier-instance-builders"
import { syncModifierRefs, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import { toolNamesForPools, type ToolChoicePool } from "@/lib/compendium/tool-options"
import type { Feature } from "@/lib/types"

const TOOL_CATALOG_ID = "cat_char_tool_proficiencies"

const WORD_COUNTS: Record<string, number> = {
  one: 1,
  a: 1,
  two: 2,
  three: 3,
  four: 4,
}

export type ClassToolChoice = {
  count: number
  label: string
  pool?: ToolChoicePool
  options?: string[]
}

/** True when a class tool_proficiencies entry is a pick instruction, not a concrete grant. */
export function isClassToolChoicePhrase(text: string): boolean {
  return parseClassToolChoicePhrase(text) != null
}

/**
 * Parse class Core Traits tool lines, including Bard/Monk-style multi-pick and
 * combined artisan/instrument wording.
 */
export function parseClassToolChoicePhrase(text: string): ClassToolChoice | null {
  const trimmed = text.trim().replace(/\s*\(see\s+[^)]+\)\s*$/i, "").trim()
  if (!trimmed) return null

  const combined = trimmed.match(
    /\b(?:choose|select)\s+(?:one|a|\d+)\s+type\s+of\s+artisan'?s?\s+tools?\s+or\s+musical\s+instrument\b/i,
  )
  if (combined || /^artisan'?s?\s+tools?\s+or\s+musical\s+instrument$/i.test(trimmed)) {
    return {
      count: 1,
      options: toolNamesForPools(["artisans", "musical"]),
      label: "Artisan's Tools or Musical Instrument (choose 1)",
    }
  }

  const countedMusical = trimmed.match(
    /\b(?:choose|select)\s+(\d+|one|two|three|four|a)\s+musical\s+instruments?\b/i,
  )
  if (countedMusical) {
    const raw = countedMusical[1].toLowerCase()
    const count = WORD_COUNTS[raw] ?? Number.parseInt(raw, 10)
    if (Number.isFinite(count) && count >= 1) {
      return {
        count,
        pool: "musical",
        label: `Choose ${count} Musical Instrument${count === 1 ? "" : "s"}`,
      }
    }
  }

  if (/^musical\s+instruments?\s*\(\s*(\d+)\s*\)$/i.test(trimmed)) {
    const count = Number.parseInt(trimmed.match(/\((\d+)\)/)![1], 10)
    return {
      count,
      pool: "musical",
      label: `Choose ${count} Musical Instrument${count === 1 ? "" : "s"}`,
    }
  }

  return parseBackgroundToolChoicePhrase(trimmed)
}

/** Concrete tool grants only — choice phrases are filtered out. */
export function fixedToolProficienciesFromList(
  tools: readonly string[] | null | undefined,
): string[] {
  if (!tools?.length) return []
  const out: string[] = []
  for (const raw of tools) {
    const trimmed = raw.trim()
    if (!trimmed || isClassToolChoicePhrase(trimmed)) continue
    if (!out.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
      out.push(trimmed)
    }
  }
  return out
}

function classAlreadyHasToolChoice(features: Feature[] | null | undefined): boolean {
  for (const feature of features ?? []) {
    for (const instance of feature.linkedModifiers ?? []) {
      for (const characteristic of instance.characteristics ?? []) {
        if (
          characteristic.type === "tool_proficiencies" &&
          typeof characteristic.choiceCount === "number" &&
          characteristic.choiceCount > 0
        ) {
          return true
        }
      }
    }
  }
  return false
}

function toolChoiceInstance(key: string, choice: ClassToolChoice): LinkedModifierInstance {
  return charInstance(`modinst_class_tool_${key}`, TOOL_CATALOG_ID, [
    {
      id: modId(`class_tool_${key}`),
      type: "tool_proficiencies",
      values: [],
      choiceCount: choice.count,
      ...(choice.pool ? { toolChoicePool: choice.pool } : {}),
      ...(choice.options?.length ? { choiceOptions: choice.options } : {}),
      label: choice.label,
    },
  ])
}

/**
 * When class.tool_proficiencies includes choice phrasing and no feature already
 * offers a tool pick, attach one pick modifier to the first level-1 feature.
 * Fixed tool names stay on the class row for aggregation / the editor.
 */
export function wireClassToolProficiencyChoices<
  T extends {
    tool_proficiencies?: string[] | null
    features?: Feature[] | null
  },
>(row: T): T {
  const tools = row.tool_proficiencies ?? []
  if (!tools.length || classAlreadyHasToolChoice(row.features)) return row

  const choices: ClassToolChoice[] = []
  const seen = new Set<string>()
  for (const entry of tools) {
    const choice = parseClassToolChoicePhrase(entry)
    if (!choice) continue
    const fp = `${choice.pool ?? "options"}:${choice.count}:${choice.label}`
    if (seen.has(fp)) continue
    seen.add(fp)
    choices.push(choice)
  }
  if (!choices.length) return row

  const features = [...(row.features ?? [])]
  const targetIndex = features.findIndex((feature) => (feature.level ?? 0) === 1)
  const index = targetIndex >= 0 ? targetIndex : 0
  if (!features[index]) return row

  let target = features[index]!
  for (const [i, choice] of choices.entries()) {
    const instance = toolChoiceInstance(`${i}_${choice.count}`, choice)
    target = syncModifierRefs({
      ...target,
      linkedModifiers: [...(target.linkedModifiers ?? []), instance],
    })
  }
  features[index] = target
  return { ...row, features }
}
