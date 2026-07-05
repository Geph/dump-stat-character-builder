export type DeathSaveState = {
  successes: number
  failures: number
}

export function applyDeathSaveRoll(natural: number, current: DeathSaveState): DeathSaveState {
  if (natural === 20) {
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

export function deathSaveRollSummary(natural: number): string {
  if (natural === 20) {
    return `${natural} — regain 1 HP, become conscious (death saves cleared)!!`
  }
  if (natural === 1) {
    return `${natural} — 2 failures!!`
  }
  if (natural >= 10) {
    return `${natural} — success`
  }
  return `${natural} — failure`
}
