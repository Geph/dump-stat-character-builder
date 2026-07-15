export type DeathSaveState = {
  successes: number
  failures: number
}

/**
 * @param critThreshold Rolls at or above this count as a natural 20 (e.g. Champion's Survivor:
 *   "when you roll 18-20 on a Death Saving Throw, you gain the benefit of rolling a 20"). Defaults
 *   to 20 (only a true natural 20 counts).
 */
export function applyDeathSaveRoll(
  natural: number,
  current: DeathSaveState,
  critThreshold = 20,
): DeathSaveState {
  if (natural !== 1 && natural >= critThreshold) {
    return { successes: 0, failures: 0 }
  }
  if (natural === 1) {
    return { ...current, failures: Math.min(3, current.failures + 2) }
  }
  if (natural >= 10) {
    return { ...current, successes: Math.min(3, current.successes + 1) }
  }
  return { ...current, failures: Math.min(3, current.failures + 1) }
}

export function deathSaveRollSummary(natural: number, critThreshold = 20): string {
  if (natural !== 1 && natural >= critThreshold) {
    const asNat20 = natural === 20 ? "" : " (counts as 20)"
    return `${natural}${asNat20} — regain 1 HP, become conscious (death saves cleared)!!`
  }
  if (natural === 1) {
    return `${natural} — 2 failures!!`
  }
  if (natural >= 10) {
    return `${natural} — success`
  }
  return `${natural} — failure`
}
