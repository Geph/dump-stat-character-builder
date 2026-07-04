/** Provenance for a single line in a derived-stat breakdown. */
export type StatContributionSourceType =
  | "base"
  | "ability"
  | "feature"
  | "item"
  | "feat"
  | "species"
  | "background"
  | "class"

export type StatContributionSource = {
  source: string
  sourceType: StatContributionSourceType
  label: string
  sourceId?: string
  href?: string
}

export type StatContribution = StatContributionSource & {
  amount: number
}

export type DerivedStatKey =
  | "ac"
  | "hp"
  | "initiative"
  | "speed"
  | "passivePerception"
  | "spellSaveDc"
  | `save:${string}`
  | `skill:${string}`
  | "weaponAttack"

export type DerivedStatBreakdowns = Partial<Record<DerivedStatKey, StatContribution[]>>

/** Optional tag attached during modifier collection; stripped before persistence. */
export type ContributionTaggedModifier = {
  _contributionSource?: StatContributionSource
}

export class ContributionRecorder {
  private readonly lines = new Map<DerivedStatKey, StatContribution[]>()

  add(key: DerivedStatKey, contribution: StatContribution): void {
    const list = this.lines.get(key) ?? []
    list.push(contribution)
    this.lines.set(key, list)
  }

  addSimple(
    key: DerivedStatKey,
    source: StatContributionSource,
    amount: number,
  ): void {
    if (amount === 0) return
    this.add(key, { ...source, amount })
  }

  snapshot(): DerivedStatBreakdowns {
    return Object.fromEntries(this.lines.entries()) as DerivedStatBreakdowns
  }
}

export function contributionsFromStatParts(
  parts: { label: string; value: number }[],
  source: StatContributionSource,
): StatContribution[] {
  return parts.map((part) => ({
    ...source,
    label: part.label,
    amount: part.value,
  }))
}

export function sumContributions(lines: StatContribution[]): number {
  return lines.reduce((sum, line) => sum + line.amount, 0)
}
