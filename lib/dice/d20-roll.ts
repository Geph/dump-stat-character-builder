export type D20RollMode = "normal" | "advantage" | "disadvantage" | "auto_fail"

export type D20RollResult = {
  natural: number
  total: number
  /** Natural d20 values rolled (one or two). */
  naturals: number[]
  mode: D20RollMode
}

/** Merge multiple mode sources using 5e advantage/disadvantage cancellation. */
export function combineRollModes(modes: D20RollMode[]): D20RollMode {
  if (modes.includes("auto_fail")) return "auto_fail"
  const advantageCount = modes.filter((mode) => mode === "advantage").length
  const disadvantageCount = modes.filter((mode) => mode === "disadvantage").length
  if (advantageCount > 0 && disadvantageCount > 0) return "normal"
  if (advantageCount > 0) return "advantage"
  if (disadvantageCount > 0) return "disadvantage"
  return "normal"
}

function rollNatural(): number {
  return 1 + Math.floor(Math.random() * 20)
}

export function isAdvantageOrDisadvantage(mode: D20RollMode): boolean {
  return mode === "advantage" || mode === "disadvantage"
}

function signedModifierText(modifier: number): string {
  return modifier >= 0 ? `+ ${modifier}` : `− ${Math.abs(modifier)}`
}

function modeSuffix(mode: D20RollMode): string {
  if (mode === "advantage") return " (adv)"
  if (mode === "disadvantage") return " (dis)"
  return ""
}

/** Equation after the natural dice, e.g. `+ 5 = 19 (adv)!!`. */
export function formatD20RollEquationTail(
  result: Pick<D20RollResult, "natural" | "total" | "mode">,
  modifier: number,
): string {
  const crit = result.natural === 20 || result.natural === 1 ? " !!" : ""
  return `${signedModifierText(modifier)} = ${result.total}${modeSuffix(result.mode)}${crit}`
}

/**
 * Full d20 line. When two dice were rolled, the unused natural is shown in parentheses
 * so history and overlays still read without a dedicated UI.
 */
export function formatD20RollSummary(result: D20RollResult, modifier: number): string {
  const dice =
    result.naturals.length > 1
      ? result.naturals.map((n) => (n === result.natural ? String(n) : `(${n})`)).join(" / ")
      : String(result.natural)
  return `${dice} ${formatD20RollEquationTail(result, modifier)}`
}

export function rollD20WithMode(mode: D20RollMode, modifier: number): D20RollResult {
  if (mode === "auto_fail") {
    return { natural: 1, total: 1 + modifier, naturals: [1], mode }
  }

  if (mode === "advantage") {
    const a = rollNatural()
    const b = rollNatural()
    const natural = Math.max(a, b)
    return { natural, total: natural + modifier, naturals: [a, b], mode }
  }

  if (mode === "disadvantage") {
    const a = rollNatural()
    const b = rollNatural()
    const natural = Math.min(a, b)
    return { natural, total: natural + modifier, naturals: [a, b], mode }
  }

  const natural = rollNatural()
  return { natural, total: natural + modifier, naturals: [natural], mode: "normal" }
}

/** @deprecated Use rollD20WithMode — kept for spell overlay until migrated. */
export function rollD20(modifier: number): { natural: number; total: number } {
  const result = rollD20WithMode("normal", modifier)
  return { natural: result.natural, total: result.total }
}
