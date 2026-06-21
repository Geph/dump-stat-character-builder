import type { RechargeRule, RestType, UsesConfig } from "@/lib/types"

const REST_LABELS: Record<RestType, string> = {
  short_rest: "short rest",
  long_rest: "long rest",
  initiative: "initiative",
}

export function getRechargeRules(uses: UsesConfig): RechargeRule[] {
  if (uses.recharges?.length) return uses.recharges
  if (uses.recharge) return [{ rest: uses.recharge }]
  return []
}

export function normalizeUsesConfig(uses: UsesConfig): UsesConfig {
  const recharges = getRechargeRules(uses)
  if (!recharges.length) {
    const { recharge: _legacy, ...rest } = uses
    return rest
  }
  return {
    ...uses,
    recharges,
    recharge: undefined,
  }
}

function formatRechargeRule(rule: RechargeRule): string {
  const label = REST_LABELS[rule.rest]
  if (rule.amount == null || rule.amount <= 0) return label
  return `${rule.amount} on ${label}`
}

export function formatUsesRecharges(uses: UsesConfig): string {
  const rules = getRechargeRules(uses)
  const parts: string[] = []

  if (uses.rechargeOnInitiative != null && uses.rechargeOnInitiative !== false) {
    if (uses.rechargeOnInitiative === true) {
      parts.push("initiative (full pool)")
    } else {
      parts.push(`${uses.rechargeOnInitiative} on initiative`)
    }
  }

  if (!rules.length) return parts.length ? parts.join(", ") : "rest"

  const allFullPool = rules.every((rule) => rule.amount == null || rule.amount <= 0)
  if (rules.length === 2 && allFullPool) {
    parts.push("short or long rest")
  } else {
    parts.push(...rules.map(formatRechargeRule))
  }

  return parts.join(", ")
}

export function isRestRechargeEnabled(uses: UsesConfig, rest: RestType): boolean {
  return getRechargeRules(uses).some((rule) => rule.rest === rest)
}

export function getRechargeAmount(uses: UsesConfig, rest: RestType): number | null {
  const rule = getRechargeRules(uses).find((entry) => entry.rest === rest)
  if (!rule || rule.amount == null || rule.amount <= 0) return null
  return rule.amount
}

export function setRestRecharge(
  uses: UsesConfig,
  rest: RestType,
  enabled: boolean,
  amount?: number | null,
): UsesConfig {
  const current = getRechargeRules(uses).filter((rule) => rule.rest !== rest)
  const next = enabled
    ? [
        ...current,
        {
          rest,
          amount: amount == null || amount <= 0 ? undefined : amount,
        },
      ]
    : current

  const sorted: RechargeRule[] = []
  if (next.some((rule) => rule.rest === "short_rest")) {
    sorted.push(next.find((rule) => rule.rest === "short_rest")!)
  }
  if (next.some((rule) => rule.rest === "long_rest")) {
    sorted.push(next.find((rule) => rule.rest === "long_rest")!)
  }

  const normalized = normalizeUsesConfig({ ...uses, recharges: sorted.length ? sorted : undefined })
  return normalized
}

export function getRechargeAmountOnInitiative(uses: UsesConfig): number | null {
  const value = uses.rechargeOnInitiative
  if (value == null || value === false) return null
  if (value === true) return null
  return value > 0 ? value : null
}

export function hasInitiativeRecharge(uses: UsesConfig): boolean {
  return uses.rechargeOnInitiative != null && uses.rechargeOnInitiative !== false
}

export function updateRestRechargeAmount(
  uses: UsesConfig,
  rest: RestType,
  amount: number | null,
): UsesConfig {
  const rules = getRechargeRules(uses).map((rule) =>
    rule.rest === rest
      ? {
          ...rule,
          amount: amount == null || amount <= 0 ? undefined : amount,
        }
      : rule,
  )
  return normalizeUsesConfig({ ...uses, recharges: rules.length ? rules : undefined })
}
