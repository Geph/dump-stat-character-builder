/** Bloodied — at or below half hit point maximum (used by riders and some homebrew features). */
export const BLOODIED_LABEL = "Bloodied"

export const BLOODIED_DESCRIPTION =
  "You are bloodied: your current hit points are at or below half your hit point maximum. Some features only apply against bloodied creatures or while you are bloodied."

export function isBloodied(currentHp: number, maxHp: number): boolean {
  return maxHp > 0 && currentHp <= Math.floor(maxHp / 2)
}
