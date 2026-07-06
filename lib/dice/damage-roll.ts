/** Parse and roll weapon damage expressions like "1d8+2" or "2d6 - 1 Slashing". */

export type ParsedDamageRoll = {
  dice: { count: number; sides: number }[]
  modifier: number
}

export function parseDamageRoll(expression: string): ParsedDamageRoll | null {
  if (!expression?.trim()) return null

  const withoutType = expression.replace(/\s+[a-z][a-z\s]*$/i, "").trim()
  const dice: { count: number; sides: number }[] = []
  const diceRe = /(\d+)d(\d+)/gi
  let match: RegExpExecArray | null
  while ((match = diceRe.exec(withoutType))) {
    dice.push({ count: parseInt(match[1], 10), sides: parseInt(match[2], 10) })
  }
  if (dice.length === 0) return null

  let modifier = 0
  const afterDice = withoutType.replace(/\d+d\d+/gi, " ")
  const modMatches = [...afterDice.matchAll(/([+-])\s*(\d+)/g)]
  for (const m of modMatches) {
    const sign = m[1] === "-" ? -1 : 1
    modifier += sign * parseInt(m[2], 10)
  }

  return { dice, modifier }
}

export type DamageRollMode = "normal" | "advantage" | "disadvantage"

export function rollDamage(parsed: ParsedDamageRoll): {
  rolls: number[]
  total: number
  modifier: number
} {
  const rolls: number[] = []
  for (const { count, sides } of parsed.dice) {
    for (let i = 0; i < count; i++) {
      rolls.push(1 + Math.floor(Math.random() * sides))
    }
  }
  const diceSum = rolls.reduce((sum, n) => sum + n, 0)
  return {
    rolls,
    modifier: parsed.modifier,
    total: diceSum + parsed.modifier,
  }
}

export function rollDamageWithMode(
  parsed: ParsedDamageRoll,
  mode: DamageRollMode = "normal",
): {
  rolls: number[]
  total: number
  modifier: number
  mode: DamageRollMode
} {
  if (mode === "normal") {
    return { ...rollDamage(parsed), mode }
  }
  const first = rollDamage(parsed)
  const second = rollDamage(parsed)
  const picked = mode === "advantage"
    ? first.total >= second.total
      ? first
      : second
    : first.total <= second.total
      ? first
      : second
  return { ...picked, mode }
}

export function formatDamageRollResult(
  rolls: number[],
  modifier: number,
  total: number,
): string {
  const dicePart = rolls.length ? rolls.join(" + ") : "0"
  if (modifier === 0) return `${dicePart} = ${total}`
  const modStr = modifier >= 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`
  return `${dicePart}${modStr} = ${total}`
}
