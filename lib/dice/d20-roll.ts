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
