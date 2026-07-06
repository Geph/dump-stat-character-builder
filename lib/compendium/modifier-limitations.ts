import type { Equipment } from "@/lib/types"
import type { SheetToggleKey } from "@/lib/compendium/sheet-toggle-registry"

export type ModifierLimitationKind = "condition" | "armor_type" | "sheet_toggle" | "hp_threshold"

/** How the limitation gates whether the modifier applies. */
export type ModifierLimitationRule =
  /** Modifier is off while the character has this condition. */
  | "blocked_when_has"
  /** Modifier applies only while wearing this armor type (or shield). */
  | "requires_wearing"
  /** Modifier is off while wearing this armor type (or shield). */
  | "requires_not_wearing"
  /** Modifier applies only while this sheet toggle is active. */
  | "requires_active"
  /** Modifier applies only while current HP is at or below the value. */
  | "requires_at_most_hp"
  /** Modifier applies only while current HP is above the value. */
  | "requires_above_hp"

export interface ModifierLimitation {
  id: string
  kind: ModifierLimitationKind
  rule: ModifierLimitationRule
  /** Condition name, armor category, or sheet toggle id. */
  value: string
}

export type LimitationEvaluationContext = {
  activeConditions?: string[]
  activeSheetToggles?: ReadonlySet<SheetToggleKey>
  equippedArmor?: Equipment | null
  equippedShield?: Equipment | null
  currentHp?: number
}

export const ARMOR_LIMITATION_OPTIONS = [
  { value: "Light armor", label: "Light armor" },
  { value: "Medium armor", label: "Medium armor" },
  { value: "Heavy armor", label: "Heavy armor" },
  { value: "Any armor", label: "Any armor" },
  { value: "Shield", label: "Shield" },
] as const

export const LIMITATION_RULE_LABELS: Record<
  ModifierLimitationKind,
  { value: ModifierLimitationRule; label: string }[]
> = {
  condition: [{ value: "blocked_when_has", label: "Disabled while character has" }],
  armor_type: [
    { value: "requires_not_wearing", label: "Not while wearing" },
    { value: "requires_wearing", label: "Only while wearing" },
  ],
  sheet_toggle: [{ value: "requires_active", label: "Only while active" }],
  hp_threshold: [
    { value: "requires_at_most_hp", label: "Only at or below HP" },
    { value: "requires_above_hp", label: "Only above HP" },
  ],
}

let limitationIdCounter = 0

export function createModifierLimitation(
  partial: Omit<ModifierLimitation, "id"> & { id?: string },
): ModifierLimitation {
  return {
    id: partial.id ?? `lim_${++limitationIdCounter}`,
    kind: partial.kind,
    rule: partial.rule,
    value: partial.value,
  }
}

export function blockedWhenConditionLimitation(condition: string): ModifierLimitation {
  return createModifierLimitation({
    kind: "condition",
    rule: "blocked_when_has",
    value: condition,
  })
}

export function notWearingArmorLimitation(armorType: string): ModifierLimitation {
  return createModifierLimitation({
    kind: "armor_type",
    rule: "requires_not_wearing",
    value: armorType,
  })
}

export function requiresAtMostHpLimitation(hp: number): ModifierLimitation {
  return createModifierLimitation({
    kind: "hp_threshold",
    rule: "requires_at_most_hp",
    value: String(hp),
  })
}

export function requiresActiveToggleLimitation(toggleId: SheetToggleKey): ModifierLimitation {
  return createModifierLimitation({
    kind: "sheet_toggle",
    rule: "requires_active",
    value: toggleId,
  })
}

export function resolveEquippedArmorCategory(armor: Equipment | null | undefined): string | null {
  if (!armor) return null
  const sub = (armor.subcategory ?? armor.category ?? "").toLowerCase()
  if (sub.includes("heavy")) return "Heavy armor"
  if (sub.includes("medium")) return "Medium armor"
  if (sub.includes("light")) return "Light armor"
  if (sub.includes("shield")) return "Shield"
  if (sub.includes("armor")) return "Any armor"
  return null
}

export function isWearingArmorLimitation(
  armorType: string,
  equippedArmor: Equipment | null | undefined,
  equippedShield: Equipment | null | undefined,
): boolean {
  const normalized = armorType.trim().toLowerCase()
  if (normalized === "shield" || normalized === "shields") {
    return Boolean(equippedShield)
  }
  if (normalized === "any armor" || normalized === "armor") {
    return Boolean(equippedArmor)
  }
  const category = resolveEquippedArmorCategory(equippedArmor ?? null)
  if (!category) return false
  return category.toLowerCase() === normalized
}

function evaluateLimitation(
  limitation: ModifierLimitation,
  ctx: LimitationEvaluationContext,
): boolean {
  switch (limitation.kind) {
    case "condition": {
      const has = (ctx.activeConditions ?? []).includes(limitation.value)
      if (limitation.rule === "blocked_when_has") return !has
      return true
    }
    case "armor_type": {
      const wearing = isWearingArmorLimitation(
        limitation.value,
        ctx.equippedArmor,
        ctx.equippedShield,
      )
      if (limitation.rule === "requires_not_wearing") return !wearing
      if (limitation.rule === "requires_wearing") return wearing
      return true
    }
    case "sheet_toggle": {
      const active = ctx.activeSheetToggles?.has(limitation.value as SheetToggleKey) ?? false
      if (limitation.rule === "requires_active") return active
      return true
    }
    case "hp_threshold": {
      const threshold = parseInt(limitation.value, 10)
      const hp = ctx.currentHp
      if (hp == null || !Number.isFinite(threshold)) return true
      if (limitation.rule === "requires_at_most_hp") return hp <= threshold
      if (limitation.rule === "requires_above_hp") return hp > threshold
      return true
    }
    default:
      return true
  }
}

export type LimitationSource = {
  limitations?: ModifierLimitation[]
  /** @deprecated Use limitations with blocked_when_has. */
  disabledWhenConditions?: string[]
  /** @deprecated Use limitations with requires_active. */
  requiresSheetToggle?: SheetToggleKey
}

export function expandLegacyLimitations(source: LimitationSource): ModifierLimitation[] {
  const result = [...(source.limitations ?? [])]
  for (const condition of source.disabledWhenConditions ?? []) {
    if (
      !result.some(
        (entry) =>
          entry.kind === "condition" &&
          entry.rule === "blocked_when_has" &&
          entry.value === condition,
      )
    ) {
      result.push(blockedWhenConditionLimitation(condition))
    }
  }
  if (source.requiresSheetToggle) {
    const toggle = source.requiresSheetToggle
    if (
      !result.some(
        (entry) =>
          entry.kind === "sheet_toggle" &&
          entry.rule === "requires_active" &&
          entry.value === toggle,
      )
    ) {
      result.push(requiresActiveToggleLimitation(toggle))
    }
  }
  return result
}

/** True when every limitation passes (modifier may apply). */
export function modifierLimitationsMet(
  source: LimitationSource,
  ctx: LimitationEvaluationContext = {},
): boolean {
  const limitations = expandLegacyLimitations(source)
  if (!limitations.length) return true
  return limitations.every((limitation) => evaluateLimitation(limitation, ctx))
}

export function summarizeLimitations(source: LimitationSource): string {
  const limitations = expandLegacyLimitations(source)
  if (!limitations.length) return ""
  return limitations
    .map((entry) => {
      if (entry.kind === "condition" && entry.rule === "blocked_when_has") {
        return `not while ${entry.value}`
      }
      if (entry.kind === "armor_type" && entry.rule === "requires_not_wearing") {
        return `not while wearing ${entry.value}`
      }
      if (entry.kind === "armor_type" && entry.rule === "requires_wearing") {
        return `while wearing ${entry.value}`
      }
      if (entry.kind === "sheet_toggle" && entry.rule === "requires_active") {
        return `while ${entry.value} active`
      }
      if (entry.kind === "hp_threshold" && entry.rule === "requires_at_most_hp") {
        return `at or below ${entry.value} HP`
      }
      if (entry.kind === "hp_threshold" && entry.rule === "requires_above_hp") {
        return `above ${entry.value} HP`
      }
      return `${entry.rule} ${entry.value}`
    })
    .join("; ")
}
