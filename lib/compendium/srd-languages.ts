/** Standard Languages table from the D&D 5.5e SRD (SRD 5.2, pg 20). */
export const SRD_STANDARD_LANGUAGES = [
  "Common",
  "Common Sign Language",
  "Draconic",
  "Dwarvish",
  "Elvish",
  "Giant",
  "Gnomish",
  "Goblin",
  "Halfling",
  "Orc",
] as const

/** Rare Languages table from the D&D 5.5e SRD (SRD 5.2, pg 20). */
export const SRD_RARE_LANGUAGES = [
  "Abyssal",
  "Celestial",
  "Deep Speech",
  "Druidic",
  "Infernal",
  "Primordial",
  "Sylvan",
  "Thieves' Cant",
  "Undercommon",
] as const

/** All SRD languages (standard + rare). */
export const SRD_LANGUAGES = [...SRD_STANDARD_LANGUAGES, ...SRD_RARE_LANGUAGES] as const

export type LanguageChoicePool = "standard" | "standard_and_rare"

/** Languages a player may pick from for a given choice pool, excluding already-granted ones. */
export function languageOptionsForPool(
  pool: LanguageChoicePool | null | undefined,
  exclude: string[] = [],
): string[] {
  const excludeSet = new Set(exclude.map((name) => name.toLowerCase()))
  const source = pool === "standard_and_rare" ? SRD_LANGUAGES : SRD_STANDARD_LANGUAGES
  return source.filter((name) => !excludeSet.has(name.toLowerCase()))
}
