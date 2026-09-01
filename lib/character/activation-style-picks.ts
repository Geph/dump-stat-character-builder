import { featureChoiceKey } from "@/lib/builder/choices"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import { resolveChoiceOptionDescription } from "@/lib/compendium/choice-option-description"
import { resolveFeatureChoiceCount } from "@/lib/compendium/resolve-feature-choice-count"
import {
  getSheetToggleDefinition,
  sheetToggleIdActivatedByAction,
} from "@/lib/compendium/sheet-toggle-registry"
import type { CustomAbility, Feature } from "@/lib/types"

export type SheetActivationPickOption = {
  name: string
  description?: string | null
  sheetToggleId?: string | null
}

/** Known styles / modes the player picks when using an action (e.g. Dance Styles). */
export type SheetActivationPicks = {
  title: string
  chooseCount: number
  options: SheetActivationPickOption[]
}

function normalizeStyleName(name: string): string {
  return name.replace(/\s*\[dance style\]\s*/gi, "").trim().toLowerCase()
}

function displayStyleName(name: string): string {
  return name.replace(/\s*\[dance style\]\s*/gi, "").trim()
}

function isDanceStyleChoiceFeature(feature: Feature): boolean {
  const choices = feature.choices
  if (choices?.resourceKey === "dance_styles_known") return true
  if (/^dance styles?$/i.test(choices?.category ?? "")) return true
  return /^dance styles?$/i.test(feature.name)
}

function isSubclassDanceStyleFeature(feature: Feature): boolean {
  return /\[dance style\]/i.test(feature.name)
}

function styleToggleIdForName(name: string): string | null {
  const slug = normalizeStyleName(name)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
  if (!slug) return null
  const id = `dance_style_${slug}`
  return getSheetToggleDefinition(id)?.id ?? null
}

function descriptionForStyle(
  name: string,
  feature: Feature | undefined,
  customAbilities: CustomAbility[] | undefined,
): string | null {
  const needle = normalizeStyleName(name)
  const inline = (feature?.choices?.options ?? []).find(
    (option) => normalizeStyleName(option.name) === needle,
  )
  if (inline) {
    const text = resolveChoiceOptionDescription(inline, null).trim()
    if (text) return text
  }
  const upgrades = (customAbilities ?? []).filter((ability) => {
    if (normalizeStyleName(ability.name) !== needle) return false
    const role = ability.ability_role ?? ""
    if (role === "weapon_mastery") return false
    return role === "upgrade" || !role
  })
  const preferred =
    upgrades.find((ability) => ability.ability_role === "upgrade") ?? upgrades[0]
  if (preferred?.description?.trim()) return preferred.description.trim()
  return null
}

function collectDanceStyleOptions(params: {
  classDetails: CharacterClassDetail[]
  featureChoicePicks?: Record<string, string[]>
  customAbilities?: CustomAbility[]
}): { title: string; chooseCount: number; options: SheetActivationPickOption[] } | null {
  const options: SheetActivationPickOption[] = []
  const seen = new Set<string>()
  let title = "Choose a Dance Style"
  let chooseCount = 1

  const push = (name: string, description: string | null) => {
    const display = displayStyleName(name)
    const key = normalizeStyleName(display)
    if (!key || seen.has(key)) return
    seen.add(key)
    options.push({
      name: display,
      description,
      sheetToggleId: styleToggleIdForName(display),
    })
  }

  for (const entry of params.classDetails) {
    const classId = entry.row.class_id
    const classLevel = entry.row.level
    const className = entry.class?.name ?? ""
    for (const feature of (entry.class?.features ?? []) as Feature[]) {
      if ((feature.level ?? 0) > classLevel) continue
      if (!isDanceStyleChoiceFeature(feature) || !feature.choices) continue
      title = feature.choices.category?.trim()
        ? `Choose a ${feature.choices.category.trim()}`
        : "Choose a Dance Style"
      const tableCount = resolveFeatureChoiceCount(
        feature.choices,
        classLevel,
        className,
        undefined,
        { featureName: feature.name },
      )
      if (tableCount > chooseCount) chooseCount = tableCount
      const picks =
        params.featureChoicePicks?.[featureChoiceKey(classId, feature.name, feature.level)] ?? []
      for (const pick of picks) {
        push(pick, descriptionForStyle(pick, feature, params.customAbilities))
      }
    }
    for (const feature of (entry.subclass?.features ?? []) as Feature[]) {
      if ((feature.level ?? 0) > classLevel) continue
      if (!isSubclassDanceStyleFeature(feature)) continue
      push(feature.name, feature.description?.trim() || null)
    }
  }

  if (!options.length) return null
  return {
    title,
    chooseCount: Math.min(options.length, Math.max(1, chooseCount)),
    options,
  }
}

/** Attach known Dance Style picks to the action that starts Dancing. */
export function attachActivationPicksToActions<
  T extends { name: string; classResourceKey?: string | null; activationPicks?: SheetActivationPicks },
>(
  actions: T[],
  params: {
    classDetails: CharacterClassDetail[]
    featureChoicePicks?: Record<string, string[]>
    customAbilities?: CustomAbility[]
  },
): T[] {
  const danceStyles = collectDanceStyleOptions(params)
  if (!danceStyles) return actions
  return actions.map((action) => {
    if (sheetToggleIdActivatedByAction(action) !== "while_dancing") return action
    if (action.activationPicks?.options.length) return action
    return { ...action, activationPicks: danceStyles }
  })
}
