import { parseChooseOneNamedOptions } from "@/lib/compendium/choose-one-named-options"
import {
  DAMAGE_TYPES,
  SKILL_NAMES,
} from "@/lib/compendium/characteristic-modifiers"
import { getAllSeedLanguageNames } from "@/lib/compendium/language-options"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import {
  isKnownToolName,
  isMusicalInstrumentToolName,
} from "@/lib/compendium/tool-options"
import type { Trait } from "@/lib/types"

const SKILL_NAME_SET = new Set(SKILL_NAMES.map((name) => name.toLowerCase()))
const LANGUAGE_NAME_SET = new Set(getAllSeedLanguageNames().map((name) => name.toLowerCase()))
const DAMAGE_TYPE_SET = new Set(DAMAGE_TYPES.map((name) => name.toLowerCase()))
const SIZE_NAME_SET = new Set(["tiny", "small", "medium", "large", "huge", "gargantuan"])

const MECHANIC_HINT =
  /\b(damage|ft\.?|feet|advantage|disadvantage|save|speed|hp|hit points?|ac\b|teleport|prone|resist|immun|bonus|reaction|action|d\d+|frightened|charmed|fly|swim|temp(?:orary)?)\b/i

export type ChoiceOptionDescriptionSource = {
  name?: string | null
  description?: string | null
  linkedModifiers?: LinkedModifierInstance[] | null
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

/** Skills, tools, languages, sizes, and damage-type names are already self-explanatory. */
export function isSelfExplanatoryChoiceOptionName(name: string | null | undefined): boolean {
  const normalized = normalizeKey(name ?? "")
  if (!normalized) return true
  if (SKILL_NAME_SET.has(normalized)) return true
  if (LANGUAGE_NAME_SET.has(normalized)) return true
  if (SIZE_NAME_SET.has(normalized)) return true
  if (DAMAGE_TYPE_SET.has(normalized)) return true
  if (isMusicalInstrumentToolName(name ?? "")) return true
  if (isKnownToolName(name ?? "")) return true
  return false
}

function stripOptionNamePrefix(text: string, optionName: string): string {
  const trimmed = text.trim()
  if (!optionName.trim()) return trimmed
  const escaped = escapeRegExp(optionName.trim())
  return trimmed.replace(new RegExp(`^${escaped}\\s*[—–:\\-]\\s*`, "i"), "").trim()
}

function isTitleOnlyLabel(text: string, optionName: string): boolean {
  const normalized = normalizeKey(text)
  const option = normalizeKey(optionName)
  if (!normalized || !option) return true
  if (normalized === option) return true
  if (new RegExp(`^${escapeRegExp(option)}\\s*\\([^)]+\\)$`, "i").test(text.trim())) return true
  if (new RegExp(`[—–-]\\s*${escapeRegExp(option)}$`, "i").test(text.trim()) && !MECHANIC_HINT.test(text)) {
    return true
  }
  return false
}

function isUsefulSummary(text: string, optionName: string): boolean {
  const stripped = stripOptionNamePrefix(text, optionName)
  const candidate = stripped || text.trim()
  if (!candidate) return false
  if (isTitleOnlyLabel(candidate, optionName) && candidate === text.trim()) return false
  if (isTitleOnlyLabel(text, optionName) && !MECHANIC_HINT.test(candidate)) return false
  if (MECHANIC_HINT.test(candidate)) return true
  return candidate.length >= 24 && !isTitleOnlyLabel(candidate, optionName)
}

function uniqueUseful(texts: string[], optionName: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of texts) {
    const stripped = stripOptionNamePrefix(raw, optionName)
    const candidate = (isUsefulSummary(raw, optionName) ? stripped || raw.trim() : "").trim()
    if (!candidate) continue
    const key = normalizeKey(candidate)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(candidate)
  }
  return out
}

function collectInstanceTexts(instance: LinkedModifierInstance): { specials: string[]; labels: string[] } {
  const specials: string[] = []
  const labels: string[] = []
  for (const characteristic of instance.characteristics ?? []) {
    if (characteristic.type === "uses") {
      const special = characteristic.uses?.specialDescription?.trim()
      if (special) specials.push(special)
    }
    const label = characteristic.label?.trim()
    if (label) labels.push(label)
  }
  for (const effect of instance.activation?.effects ?? instance.effects ?? []) {
    const label = effect.label?.trim()
    if (label) labels.push(label)
  }
  return { specials, labels }
}

export function descriptionFromLinkedModifiers(
  instances: LinkedModifierInstance[] | null | undefined,
  optionName: string,
): string {
  const specials: string[] = []
  const labels: string[] = []
  for (const instance of instances ?? []) {
    const collected = collectInstanceTexts(instance)
    specials.push(...collected.specials)
    labels.push(...collected.labels)
  }
  const fromSpecial = [...new Set(specials.map((text) => text.trim()).filter(Boolean))]
  if (fromSpecial.length) return fromSpecial.join(" ")
  return uniqueUseful(labels, optionName).join(" · ")
}

function descriptionFromParentChoiceProse(
  parentDescription: string | null | undefined,
  optionName: string,
): string {
  const name = optionName.trim()
  if (!name) return ""
  const parsed = parseChooseOneNamedOptions(parentDescription)
  const match = parsed.find((option) => normalizeKey(option.name) === normalizeKey(name))
  return match?.description?.trim() ?? ""
}

export function resolveChoiceOptionDescription(
  option: ChoiceOptionDescriptionSource,
  parentDescription?: string | null,
): string {
  const existing = option.description?.trim()
  if (existing) return existing
  const fromModifiers = descriptionFromLinkedModifiers(option.linkedModifiers, option.name ?? "")
  if (fromModifiers) return fromModifiers
  return descriptionFromParentChoiceProse(parentDescription, option.name ?? "")
}

export function fillFeatureChoiceOptionDescriptions<T extends ChoiceOptionDescriptionSource>(
  options: T[],
  parentDescription?: string | null,
): T[] {
  let changed = false
  const next = options.map((option) => {
    const description = resolveChoiceOptionDescription(option, parentDescription)
    if (!description || option.description?.trim()) return option
    changed = true
    return { ...option, description }
  })
  return changed ? next : options
}

export function withFilledChoiceOptionDescriptions<T extends Pick<Trait, "choices" | "description">>(
  trait: T,
): T {
  const options = trait.choices?.options
  if (!options?.length) return trait
  const filled = fillFeatureChoiceOptionDescriptions(options, trait.description)
  if (filled === options) return trait
  return {
    ...trait,
    choices: {
      ...trait.choices!,
      options: filled,
    },
  }
}

export function choiceOptionWantsReadableSummary(option: {
  name: string
  description?: string | null
}): boolean {
  if (isSelfExplanatoryChoiceOptionName(option.name)) return false
  return Boolean(option.description?.trim())
}

export function shouldShowNamedChoiceSummaries(params: {
  optionsSource?: string | null
  options: { name: string; description?: string | null }[]
}): boolean {
  if (params.optionsSource) return false
  return params.options.some(choiceOptionWantsReadableSummary)
}
