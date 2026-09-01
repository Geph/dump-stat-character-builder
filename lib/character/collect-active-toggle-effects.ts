import type { CharacterClassDetail } from "@/lib/character/character-classes"
import {
  DEFAULT_DANCER_DANCE_STYLES,
  danceStyleToggleIdForName,
  displayDanceStyleName,
  isSubclassDanceStyleFeature,
} from "@/lib/character/dancer-dance-styles"
import { requiredToggleFromResourceMenu } from "@/lib/character/resource-die-use"
import { characteristicsFromLinkedModifiers } from "@/lib/compendium/builder-modifier-refs"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import { formatFeatureDuration } from "@/lib/compendium/feature-duration"
import { readLinkedModifiers } from "@/lib/compendium/linked-modifiers"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import { expandLegacyLimitations, type LimitationSource } from "@/lib/compendium/modifier-limitations"
import type { SheetToggleDefinition } from "@/lib/compendium/sheet-toggle-registry"
import { mergeActivationModeRidersIntoFeature } from "@/lib/character/activation-mode-riders"
import type { CustomAbility, Feature } from "@/lib/types"

export type SheetToggleEffectLine = {
  text: string
  source?: string
}

export type SheetToggleEffectsSection = {
  toggleId: string
  label: string
  remaining?: string | null
  note?: string | null
  hint?: string | null
  effects: SheetToggleEffectLine[]
}

export type ToggleEffectsSheetAction = {
  name: string
  description?: string | null
  requiresSheetToggle?: string | null
  reminderOnly?: boolean
  menuOptions?: { name: string; description?: string | null }[]
}

/** Feature / feat / trait / custom ability row we can walk for toggle-gated riders. */
export type ToggleEffectsSourceRow = {
  name?: string | null
  description?: string | null
  linkedModifiers?: unknown
  linked_modifiers?: unknown
  modifierRefs?: string[] | null
  choices?: Feature["choices"] | null
}

function requiredToggleIds(source: LimitationSource | null | undefined): string[] {
  if (!source) return []
  const ids: string[] = []
  for (const limitation of expandLegacyLimitations(source)) {
    if (limitation.kind === "sheet_toggle" && limitation.rule === "requires_active") {
      ids.push(limitation.value)
    }
  }
  if ("requiresSheetToggle" in source && source.requiresSheetToggle) {
    ids.push(source.requiresSheetToggle)
  }
  return ids
}

function firstSentence(text: string, max = 220): string {
  const trimmed = text.replace(/\s+/g, " ").trim()
  if (!trimmed) return ""
  const match = trimmed.match(/^[^.!?]+[.!?]/)
  const sentence = (match?.[0] ?? trimmed).trim()
  return sentence.length > max ? `${sentence.slice(0, max - 1)}…` : sentence
}

function summarizeCharacteristic(mod: CharacteristicModifier): string[] {
  if (mod.type === "resource_ability_menu") {
    const lines = (mod.options ?? [])
      .map((option) => {
        const detail = option.description?.trim()
        return detail ? `${option.name} — ${detail}` : option.name
      })
      .filter(Boolean)
    if (lines.length) return lines
  }

  if (mod.label?.trim()) return [mod.label.trim()]

  switch (mod.type) {
    case "movement_effects": {
      const bits: string[] = []
      if (mod.moveWithoutOpportunityAttacks) {
        bits.push("Movement doesn't provoke Opportunity Attacks")
      }
      if (mod.ignoreDifficultTerrain) bits.push("Ignore Difficult Terrain")
      if (mod.spiderClimb) bits.push("Climb speed equal to walking speed")
      if (mod.movementDash) bits.push("Dash as part of this movement")
      if (mod.movementDisengage) bits.push("Disengage as part of this movement")
      if (mod.movementHide) bits.push("Hide as part of this movement")
      return bits
    }
    case "speed": {
      const feet = mod.valueByLevel?.length ? null : mod.value
      if (feet == null) return ["Speed change"]
      const signed = feet >= 0 ? `+${feet}` : String(feet)
      return [`${signed} ft Speed`]
    }
    case "damage_resistance": {
      const types = [
        ...(mod.damageTypes ?? []),
        ...(mod.fromSpells ? ["Spell damage"] : []),
      ]
      return types.length ? [`Resistance to ${types.join(", ")}`] : ["Damage resistance"]
    }
    case "damage_immunity": {
      const types = [
        ...(mod.damageTypes ?? []),
        ...(mod.fromSpells ? ["Spell damage"] : []),
      ]
      return types.length ? [`Immunity to ${types.join(", ")}`] : ["Damage immunity"]
    }
    case "condition_immunity":
      return (mod.conditions ?? []).length
        ? [`Immunity to ${mod.conditions.join(", ")}`]
        : ["Condition immunity"]
    case "ac":
      return ["Armor Class bonus"]
    default:
      return [mod.type.replace(/_/g, " ")]
  }
}

function relatedToggleIds(focusToggleId: string, activeToggleIds: readonly string[]): string[] {
  const active = new Set(activeToggleIds)
  const ids: string[] = []
  if (active.has(focusToggleId)) ids.push(focusToggleId)
  if (focusToggleId === "while_dancing") {
    for (const id of activeToggleIds) {
      if (id.startsWith("dance_style_") && !ids.includes(id)) ids.push(id)
    }
  }
  return ids
}

function pushUniqueLine(
  effects: SheetToggleEffectLine[],
  text: string,
  source?: string,
) {
  const trimmed = text.replace(/\s+/g, " ").trim()
  if (!trimmed) return
  if (effects.some((line) => line.text.toLowerCase() === trimmed.toLowerCase())) return
  effects.push(source ? { text: trimmed, source } : { text: trimmed })
}

function assignToSection(
  requiredIds: string[],
  sectionIds: readonly string[],
): string | null {
  if (!requiredIds.length) return null
  const specific = requiredIds.find(
    (id) => sectionIds.includes(id) && id.startsWith("dance_style_"),
  )
  if (specific) return specific
  return requiredIds.find((id) => sectionIds.includes(id)) ?? null
}

function danceStyleCatalogDescription(toggleId: string): string | null {
  return (
    DEFAULT_DANCER_DANCE_STYLES.find((style) => style.toggleId === toggleId)?.description ?? null
  )
}

function collectFromFeatureLike(
  row: ToggleEffectsSourceRow,
  catalog: ModifierCatalogEntry[],
  sectionIds: readonly string[],
  add: (toggleId: string, text: string, source?: string) => void,
) {
  const name = row.name?.trim() ?? ""
  const description = row.description?.trim() ?? ""

  if (isSubclassDanceStyleFeature({ name })) {
    const toggleId = danceStyleToggleIdForName(name)
    if (toggleId && sectionIds.includes(toggleId) && description) {
      add(toggleId, firstSentence(description), displayDanceStyleName(name))
    }
  }

  const linked = readLinkedModifiers(row as Parameters<typeof readLinkedModifiers>[0], catalog)
  const mods = characteristicsFromLinkedModifiers(catalog, linked, null)
  for (const mod of mods) {
    const required = requiredToggleIds(mod)
    if (mod.type === "resource_ability_menu") {
      for (const option of mod.options ?? []) {
        const toggle =
          requiredToggleFromResourceMenu(mod, option, name) ?? assignToSection(required, sectionIds)
        if (!toggle || !sectionIds.includes(toggle)) continue
        const detail = option.description?.trim()
        add(toggle, detail ? `${option.name} — ${detail}` : option.name, name || undefined)
      }
      continue
    }
    if (mod.type === "attack_roll_modifiers") {
      for (const entry of mod.entries ?? []) {
        const entryRequired = requiredToggleIds(entry as LimitationSource)
        const toggle = assignToSection(entryRequired.length ? entryRequired : required, sectionIds)
        if (!toggle) continue
        const text =
          (entry as { label?: string }).label?.trim() ||
          mod.label?.trim() ||
          "Attack roll bonus"
        add(toggle, text, name || undefined)
      }
      continue
    }
    const toggle = assignToSection(required, sectionIds)
    if (!toggle) continue
    for (const line of summarizeCharacteristic(mod)) {
      add(toggle, line, name || undefined)
    }
  }

  for (const instance of linked) {
    for (const effect of instance.activation?.effects ?? []) {
      const toggle = assignToSection(requiredToggleIds(effect), sectionIds)
      if (!toggle) continue
      const text = effect.label?.trim() || effect.kind.replace(/_/g, " ")
      add(toggle, text, name || undefined)
    }
  }
}

function endsWhenLines(def: SheetToggleDefinition | undefined): string[] {
  const lines: string[] = []
  if (def?.defaultDuration) {
    const duration = formatFeatureDuration(def.defaultDuration)
    if (duration) lines.push(`Lasts ${duration}`)
  }
  if (def?.endsWhen?.incapacitated) lines.push("Ends if you are Incapacitated")
  if (def?.endsWhen?.speedZero) lines.push("Ends if your Speed is 0")
  return lines
}

/** Effects currently applying because this banner toggle (and related hidden ones) is on. */
export function collectActiveSheetToggleEffects(params: {
  focusToggleId: string
  activeToggleIds: readonly string[]
  definitions: readonly SheetToggleDefinition[]
  classDetails: CharacterClassDetail[]
  customAbilities?: CustomAbility[]
  extraFeatures?: ToggleEffectsSourceRow[]
  catalog: ModifierCatalogEntry[]
  sheetActions?: ToggleEffectsSheetAction[]
  remainingByToggleId?: Record<string, string | undefined>
  notesByToggleId?: Record<string, string | undefined>
}): SheetToggleEffectsSection[] {
  const sectionIds = relatedToggleIds(params.focusToggleId, params.activeToggleIds)
  if (!sectionIds.length) return []

  const byId = new Map(params.definitions.map((entry) => [entry.id, entry]))
  const sections = new Map<string, SheetToggleEffectsSection>()

  for (const id of sectionIds) {
    const def = byId.get(id)
    const catalogDesc = danceStyleCatalogDescription(id)
    const effects: SheetToggleEffectLine[] = []
    if (catalogDesc) pushUniqueLine(effects, catalogDesc)
    sections.set(id, {
      toggleId: id,
      label: def?.label ?? id.replace(/_/g, " "),
      remaining: params.remainingByToggleId?.[id] ?? null,
      note: params.notesByToggleId?.[id]?.trim() || null,
      hint: def?.hint?.trim() || endsWhenLines(def).join(". ") || null,
      effects,
    })
  }

  const add = (toggleId: string, text: string, source?: string) => {
    const section = sections.get(toggleId)
    if (!section) return
    pushUniqueLine(section.effects, text, source)
  }

  for (const entry of params.classDetails) {
    for (const feature of (entry.class?.features ?? []) as Feature[]) {
      collectFromFeatureLike(
        mergeActivationModeRidersIntoFeature(feature),
        params.catalog,
        sectionIds,
        add,
      )
    }
    for (const feature of (entry.subclass?.features ?? []) as Feature[]) {
      collectFromFeatureLike(
        mergeActivationModeRidersIntoFeature(feature),
        params.catalog,
        sectionIds,
        add,
      )
    }
  }
  for (const ability of params.customAbilities ?? []) {
    collectFromFeatureLike(ability, params.catalog, sectionIds, add)
  }
  for (const extra of params.extraFeatures ?? []) {
    collectFromFeatureLike(extra, params.catalog, sectionIds, add)
  }

  for (const action of params.sheetActions ?? []) {
    const toggle = action.requiresSheetToggle
    if (!toggle || !sectionIds.includes(toggle)) continue
    if (action.menuOptions?.length) {
      for (const option of action.menuOptions) {
        const detail = option.description?.trim()
        add(toggle, detail ? `${option.name} — ${detail}` : option.name, action.name)
      }
      continue
    }
    const detail = firstSentence(action.description ?? "")
    add(toggle, detail ? `${action.name} — ${detail}` : action.name)
  }

  return sectionIds
    .map((id) => sections.get(id))
    .filter((section): section is SheetToggleEffectsSection => Boolean(section))
}
