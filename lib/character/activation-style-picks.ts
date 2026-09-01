import { featureChoiceKey } from "@/lib/builder/choices"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import {
  DEFAULT_DANCER_DANCE_STYLES,
  danceStyleToggleIdForName,
  displayDanceStyleName,
  isDanceStyleChoiceFeature,
  isSubclassDanceStyleFeature,
  normalizeDanceStyleName,
} from "@/lib/character/dancer-dance-styles"
import { resolveChoiceOptionDescription } from "@/lib/compendium/choice-option-description"
import { resolveFeatureChoiceCount } from "@/lib/compendium/resolve-feature-choice-count"
import { sheetToggleIdActivatedByAction } from "@/lib/compendium/sheet-toggle-registry"
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

function descriptionForStyle(
  name: string,
  feature: Feature | undefined,
  customAbilities: CustomAbility[] | undefined,
): string | null {
  const needle = normalizeDanceStyleName(name)
  const inline = (feature?.choices?.options ?? []).find(
    (option) => normalizeDanceStyleName(option.name) === needle,
  )
  if (inline) {
    const text = resolveChoiceOptionDescription(inline, null).trim()
    if (text) return text
  }
  const fallback = DEFAULT_DANCER_DANCE_STYLES.find(
    (style) => normalizeDanceStyleName(style.name) === needle,
  )
  const upgrades = (customAbilities ?? []).filter((ability) => {
    if (normalizeDanceStyleName(ability.name) !== needle) return false
    const role = ability.ability_role ?? ""
    if (role === "weapon_mastery") return false
    return role === "upgrade" || !role
  })
  const preferred =
    upgrades.find((ability) => ability.ability_role === "upgrade") ?? upgrades[0]
  if (preferred?.description?.trim()) return preferred.description.trim()
  return fallback?.description ?? null
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
  let hasStyleFeature = false

  const push = (name: string, description: string | null) => {
    const display = displayDanceStyleName(name)
    const key = normalizeDanceStyleName(display)
    if (!key || seen.has(key)) return
    seen.add(key)
    options.push({
      name: display,
      description,
      sheetToggleId: danceStyleToggleIdForName(display),
    })
  }

  for (const entry of params.classDetails) {
    const classId = entry.row.class_id
    const classLevel = entry.row.level
    const className = entry.class?.name ?? ""
    for (const feature of (entry.class?.features ?? []) as Feature[]) {
      if ((feature.level ?? 0) > classLevel) continue
      if (!isDanceStyleChoiceFeature(feature) || !feature.choices) continue
      hasStyleFeature = true
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
      for (const style of DEFAULT_DANCER_DANCE_STYLES) {
        push(style.name, descriptionForStyle(style.name, feature, params.customAbilities))
      }
      const picks =
        params.featureChoicePicks?.[featureChoiceKey(classId, feature.name, feature.level)] ?? []
      for (const pick of picks) {
        const description = descriptionForStyle(pick, feature, params.customAbilities)
        // Skip stale builder picks that only collide with weapon mastery names (e.g. Shift).
        if (!description) continue
        push(pick, description)
      }
    }
    for (const feature of (entry.subclass?.features ?? []) as Feature[]) {
      if ((feature.level ?? 0) > classLevel) continue
      if (!isSubclassDanceStyleFeature(feature)) continue
      hasStyleFeature = true
      push(feature.name, feature.description?.trim() || null)
    }
  }

  if (!hasStyleFeature || !options.length) return null
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
