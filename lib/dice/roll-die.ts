/** Generic single-die roller shared by class-resource-die bonuses (checks/saves, damage riders). */

export function rollDie(sides: number): number {
  return 1 + Math.floor(Math.random() * sides)
}

export function rollDice(count: number, sides: number): number {
  let total = 0
  for (let i = 0; i < count; i++) total += rollDie(sides)
  return total
}
