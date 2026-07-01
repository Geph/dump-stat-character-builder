/** Parsed psi-point augment options from KibblesTasty Psion-style psionic power descriptions. */

export type PsionicAugmentCost = {
  /** Fixed cost when not variable (e.g. 3 psi points). */
  fixed?: number | null
  /** Minimum spend for variable costs (e.g. 1+ psi points). */
  min?: number
  /** Maximum spend for ranged costs (e.g. 1–3 psi points). */
  max?: number | null
  /** Each additional point beyond min scales (1+ psi points). */
  scalesPerPoint?: boolean
}

export type PsionicAugmentOption = {
  id: string
  name: string
  description: string
  resourceKey: string
  cost: PsionicAugmentCost
}

export type PsionicAugmentsConfig = {
  resourceKey: string
  allowMultiple: boolean
  augments: PsionicAugmentOption[]
}

export type PsionicAugmentSelection = {
  augmentId: string
  pointsSpent: number
}

function slugifyAugmentId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
}

function stripHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Parse cost parenthetical like "1+ psi points", "3 psi points", "1–3 psi points", "0 psi points". */
export function parsePsionicAugmentCost(raw: string): PsionicAugmentCost | null {
  const text = raw.trim().toLowerCase()
  if (!/psi\s*points?/.test(text)) return null

  const plusRange = text.match(/(\d+)\s*\+\s*psi\s*points?/)
  if (plusRange) {
    return {
      min: parseInt(plusRange[1], 10) || 1,
      scalesPerPoint: true,
    }
  }

  const dashRange = text.match(/(\d+)\s*[–-]\s*(\d+)\s*psi\s*points?/)
  if (dashRange) {
    return {
      min: parseInt(dashRange[1], 10) || 1,
      max: parseInt(dashRange[2], 10) || null,
    }
  }

  const fixed = text.match(/(\d+)\s*psi\s*points?/)
  if (fixed) {
    return { fixed: parseInt(fixed[1], 10) || 0 }
  }

  return null
}

function parseAugmentListItems(html: string): { name: string; costText: string; description: string }[] {
  const items: { name: string; costText: string; description: string }[] = []

  const liPattern =
    /<li>\s*<strong>([^<:]+?)\s*\(([^)]+)\)\s*:\s*<\/strong>\s*([\s\S]*?)<\/li>/gi
  let match: RegExpExecArray | null
  while ((match = liPattern.exec(html)) !== null) {
    items.push({
      name: stripHtml(match[1]),
      costText: match[2],
      description: stripHtml(match[3]),
    })
  }

  if (items.length) return items

  const plainPattern = /(?:^|\n)\s*(?:[-*]|\d+\.)\s*\*?\*?([^:(\n]+?)\s*\(([^)]+)\)\s*:\*?\*?\s*(.+)/gim
  while ((match = plainPattern.exec(html)) !== null) {
    items.push({
      name: stripHtml(match[1]),
      costText: match[2],
      description: stripHtml(match[3]),
    })
  }

  return items
}

export function descriptionHasPsionicAugments(description: string | null | undefined): boolean {
  if (!description) return false
  return /spend\s+psi\s+points?\s+up\s+to\s+your\s+per\s+use\s+limit/i.test(description)
}

/** Extract psi-point augment options from a psionic power description. */
export function parsePsionicAugmentsFromDescription(
  description: string | null | undefined,
  options?: { resourceKey?: string; powerName?: string },
): PsionicAugmentsConfig | null {
  if (!description || !descriptionHasPsionicAugments(description)) return null

  const resourceKey = options?.resourceKey ?? "psi_points"
  const allowMultiple =
    /you can add multiple modifiers/i.test(description) ||
    /add the following modifiers/i.test(description)

  const augmentSection = description.split(/add the following modifiers/i)[1] ?? description
  const listItems = parseAugmentListItems(augmentSection)
  if (!listItems.length) return null

  const augments: PsionicAugmentOption[] = []
  for (const item of listItems) {
    const cost = parsePsionicAugmentCost(item.costText)
    if (!cost) continue
    const name = item.name.trim()
    if (!name) continue
    augments.push({
      id: slugifyAugmentId(name),
      name,
      description: item.description,
      resourceKey,
      cost,
    })
  }

  if (!augments.length) return null

  return {
    resourceKey,
    allowMultiple,
    augments,
  }
}

export function augmentPointsCost(
  augment: PsionicAugmentOption,
  pointsSpent: number,
): number {
  const { cost } = augment
  if (cost.fixed != null) return cost.fixed
  if (cost.scalesPerPoint) {
    const min = cost.min ?? 1
    return Math.max(min, pointsSpent)
  }
  if (cost.min != null && cost.max != null) {
    return Math.min(Math.max(pointsSpent, cost.min), cost.max)
  }
  if (cost.min != null) return Math.max(cost.min, pointsSpent)
  return pointsSpent
}

export function totalPsionicAugmentCost(
  config: PsionicAugmentsConfig,
  selections: PsionicAugmentSelection[],
): number {
  let total = 0
  for (const selection of selections) {
    const augment = config.augments.find((row) => row.id === selection.augmentId)
    if (!augment) continue
    total += augmentPointsCost(augment, selection.pointsSpent)
  }
  return total
}

export function formatPsionicAugmentCost(augment: PsionicAugmentOption): string {
  const { cost } = augment
  if (cost.fixed != null) return `${cost.fixed} psi`
  if (cost.scalesPerPoint) return `${cost.min ?? 1}+ psi`
  if (cost.min != null && cost.max != null) return `${cost.min}–${cost.max} psi`
  if (cost.min != null) return `${cost.min}+ psi`
  return "psi"
}

export function formatPsionicAugmentSelectionSummary(
  config: PsionicAugmentsConfig,
  selections: PsionicAugmentSelection[],
): string {
  if (!selections.length) return ""
  const parts = selections.map((selection) => {
    const augment = config.augments.find((row) => row.id === selection.augmentId)
    if (!augment) return null
    const points = augmentPointsCost(augment, selection.pointsSpent)
    const variable =
      augment.cost.scalesPerPoint ||
      (augment.cost.min != null && augment.cost.max != null && augment.cost.fixed == null)
    return variable && points !== (augment.cost.fixed ?? augment.cost.min)
      ? `${augment.name} (${points} psi)`
      : augment.name
  })
  const names = parts.filter(Boolean)
  const total = totalPsionicAugmentCost(config, selections)
  return `${names.join(", ")} — ${total} psi total`
}
