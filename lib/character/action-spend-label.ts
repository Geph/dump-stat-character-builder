/** Strip a trailing " (ClassName)" qualifier used on multiclass resource trackers. */
export function stripResourceClassQualifier(name: string): string {
  return name.replace(/\s+\([^)]+\)\s*$/, "").trim()
}

function singularizeCountNoun(name: string): string {
  const trimmed = name.trim()
  if (/ies$/i.test(trimmed)) return trimmed.replace(/ies$/i, "y")
  if (/(?:ses|xes|zes|ches|shes)$/i.test(trimmed)) return trimmed.replace(/es$/i, "")
  if (/s$/i.test(trimmed) && !/ss$/i.test(trimmed)) return trimmed.replace(/s$/i, "")
  return trimmed
}

function nounForCount(name: string, count: number): string {
  return count === 1 ? singularizeCountNoun(name) : name.trim()
}

function resourceMatchesActionName(resourceName: string, actionName: string): boolean {
  const resource = stripResourceClassQualifier(resourceName).toLowerCase()
  const action = actionName.trim().toLowerCase()
  if (!resource || !action) return false
  return singularizeCountNoun(resource).toLowerCase() === singularizeCountNoun(action).toLowerCase()
}

/** Compact spend text for Use buttons and action-card cost chips. */
export function formatActionSpendLabel(
  amount: number,
  resourceName: string,
  actionName?: string,
): string {
  const qty = Math.abs(amount)
  const bare = stripResourceClassQualifier(resourceName) || "resource"
  if (actionName && resourceMatchesActionName(bare, actionName)) {
    return String(qty)
  }
  return `${qty} ${nounForCount(bare, qty)}`
}
