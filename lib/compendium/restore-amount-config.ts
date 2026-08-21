import type { AbilityModifierKey } from "@/lib/compendium/characteristic-modifiers"
import type { RestRechargeRule, RestoreAmountConfig } from "@/lib/types"

export type RestoreAmountMode = "full" | "fixed" | "proficiency" | "ability_modifier"

export type { RestoreAmountConfig }

export type ResolveRestoreAmountContext = {
  proficiencyBonus?: number | null
  abilityModifiers?: Partial<Record<string, number>> | null
}

function lookupAbilityModifier(
  abilityModifiers: Partial<Record<string, number>> | null | undefined,
  ability: AbilityModifierKey,
): number {
  if (!abilityModifiers) return 0
  const upper = ability.toUpperCase()
  const lower = ability.toLowerCase()
  return abilityModifiers[upper] ?? abilityModifiers[lower] ?? abilityModifiers[ability] ?? 0
}

export function resolveRestoreAmount(
  config: RestoreAmountConfig,
  ctx: ResolveRestoreAmountContext = {},
): number {
  let amount = 0
  if (config.mode === "fixed") {
    amount = config.amount ?? 0
  } else if (config.mode === "proficiency") {
    amount = (ctx.proficiencyBonus ?? 0) + (config.amount ?? 0)
  } else {
    const ability = config.ability ?? "INT"
    amount = lookupAbilityModifier(ctx.abilityModifiers, ability) + (config.amount ?? 0)
  }
  if (config.minimum != null && Number.isFinite(config.minimum)) {
    amount = Math.max(config.minimum, amount)
  }
  return Math.max(0, amount)
}

export function restoreAmountFromRechargeRule(
  rule: Pick<
    RestRechargeRule,
    "amount" | "amountFormula" | "amountFormulaAbility" | "amountFormulaBonus" | "amountFormulaMinimum"
  >,
): RestoreAmountConfig | "full" {
  if (rule.amountFormula === "proficiency_bonus") {
    return {
      mode: "proficiency",
      amount: rule.amountFormulaBonus ?? null,
      minimum: rule.amountFormulaMinimum ?? null,
    }
  }
  if (rule.amountFormula === "ability_modifier") {
    return {
      mode: "ability_modifier",
      ability: rule.amountFormulaAbility ?? "INT",
      amount: rule.amountFormulaBonus ?? null,
      minimum: rule.amountFormulaMinimum ?? null,
    }
  }
  if (rule.amount == null || rule.amount <= 0) return "full"
  return { mode: "fixed", amount: rule.amount }
}

export function rechargeFieldsFromRestoreAmount(
  value: RestoreAmountConfig | "full",
): Pick<
  RestRechargeRule,
  "amount" | "amountFormula" | "amountFormulaAbility" | "amountFormulaBonus" | "amountFormulaMinimum"
> {
  if (value === "full") {
    return {
      amount: undefined,
      amountFormula: undefined,
      amountFormulaAbility: undefined,
      amountFormulaBonus: undefined,
      amountFormulaMinimum: undefined,
    }
  }
  if (value.mode === "fixed") {
    return {
      amount: value.amount != null && value.amount > 0 ? value.amount : undefined,
      amountFormula: undefined,
      amountFormulaAbility: undefined,
      amountFormulaBonus: undefined,
      amountFormulaMinimum: undefined,
    }
  }
  if (value.mode === "proficiency") {
    return {
      amount: undefined,
      amountFormula: "proficiency_bonus",
      amountFormulaAbility: undefined,
      amountFormulaBonus: value.amount ?? undefined,
      amountFormulaMinimum: value.minimum ?? undefined,
    }
  }
  return {
    amount: undefined,
    amountFormula: "ability_modifier",
    amountFormulaAbility: value.ability ?? "INT",
    amountFormulaBonus: value.amount ?? undefined,
    amountFormulaMinimum: value.minimum ?? undefined,
  }
}
