import { computeRollBonusAmount } from "@/lib/character/collect-limited-feature-effects"
import type { SheetActionUseBonus } from "@/lib/character/action-use-bonuses"
import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import type {
  ResourceAbilityMenuCharacteristic,
  ResourceAbilityMenuOption,
} from "@/lib/compendium/characteristic-modifiers"
import { expandLegacyLimitations } from "@/lib/compendium/modifier-limitations"
import type { RollBonusConfig } from "@/lib/compendium/roll-bonus-config"
import { getSheetToggleDefinition } from "@/lib/compendium/sheet-toggle-registry"

export function isResourceDieBonusConfig(
  config: RollBonusConfig | null | undefined,
): config is RollBonusConfig & { mode: "die" } {
  return config?.mode === "die"
}

export function resourceDieMenuOptionBonus(
  option: ResourceAbilityMenuOption,
): RollBonusConfig | null {
  return isResourceDieBonusConfig(option.bonusConfig) ? option.bonusConfig : null
}

export function appliesToFromResourceDieOption(option: ResourceAbilityMenuOption): string {
  const text = `${option.name} ${option.description ?? ""}`
  if (/\b(?:AC|Armor Class)\b/i.test(text)) return "AC against one attack"
  if (/saving throws?/i.test(text)) return "saving throws"
  if (/attack rolls?/i.test(text)) return "attack rolls"
  if (/\bdamage\b/i.test(text)) return "damage"
  return option.description?.trim() || "the triggering roll"
}

export function requiredToggleFromResourceMenu(
  menu: ResourceAbilityMenuCharacteristic,
  option: ResourceAbilityMenuOption,
  featureName?: string | null,
): string | null {
  const toggle = expandLegacyLimitations(menu).find(
    (entry) => entry.kind === "sheet_toggle" && entry.rule === "requires_active",
  )
  if (toggle?.value) return toggle.value
  const haystack = `${featureName ?? ""} ${option.name} ${option.description ?? ""} ${menu.label ?? ""}`
  if (
    menu.resourceKey === "dance_die" ||
    /\bwhile\s+(?:you\s+are\s+)?dancing\b/i.test(haystack) ||
    /\bwhile\s+your\s+dance\s+is\s+active\b/i.test(haystack)
  ) {
    return "while_dancing"
  }
  return null
}

export function triggerLabelForRequiredToggle(toggleId: string | null): string {
  if (!toggleId) return "No action required"
  if (toggleId === "while_dancing") return "While Dancing"
  const label = getSheetToggleDefinition(toggleId)?.label?.trim()
  return label ? `While ${label}` : "While active"
}

export function bonusFromResourceDieOption(
  option: ResourceAbilityMenuOption,
): SheetActionUseBonus | null {
  const bonusConfig = resourceDieMenuOptionBonus(option)
  if (!bonusConfig) return null
  return {
    appliesTo: appliesToFromResourceDieOption(option),
    rollMode: "bonus",
    bonusConfig,
  }
}

export type ResourceDieRollLine = {
  line: string
  label: string
  summary: string
  natural: number
}

export function rollResourceDieUseBonuses(
  bonuses: SheetActionUseBonus[] | undefined,
  params: {
    proficiencyBonus: number
    abilityMods: Record<AbilityScoreKey, number>
    characterLevel: number
    classResourceDieSides?: Record<string, number>
    classResourceCounts?: Record<string, number>
  },
): ResourceDieRollLine[] {
  const lines: ResourceDieRollLine[] = []
  for (const bonus of bonuses ?? []) {
    if (bonus.rollMode !== "bonus" || !isResourceDieBonusConfig(bonus.bonusConfig)) continue
    const config = bonus.bonusConfig
    const amount = computeRollBonusAmount(config, params)
    if (amount <= 0) continue
    const sides =
      config.dieScaling === "class_resource" && config.classResourceKey
        ? params.classResourceDieSides?.[config.classResourceKey]
        : null
    const notation =
      sides != null ? `${config.dieCount ?? 1}d${sides}` : (config.classResourceKey ?? "die")
    const signed = bonus.subtract ? `−${amount}` : `+${amount}`
    const line = `${signed} (${notation}) to ${bonus.appliesTo}`
    lines.push({
      line,
      label: bonus.appliesTo,
      summary: line,
      natural: amount,
    })
  }
  return lines
}
