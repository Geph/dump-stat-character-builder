import {
  getAllSeedLanguageNames,
  getRareLanguageNames,
  getStandardLanguageNames,
} from "@/lib/compendium/language-options"

/** Standard Languages table from the D&D 5.5e SRD (SRD 5.2, pg 20). */
export const SRD_STANDARD_LANGUAGES = getStandardLanguageNames()

/** Rare Languages table from the D&D 5.5e SRD (SRD 5.2, pg 20). */
export const SRD_RARE_LANGUAGES = getRareLanguageNames()

/** All SRD languages (standard + rare). */
export const SRD_LANGUAGES = getAllSeedLanguageNames()

export type LanguageChoicePool = "standard" | "standard_and_rare"

/** Languages a player may pick from for a given choice pool, excluding already-granted ones. */
export function languageOptionsForPool(
  pool: LanguageChoicePool | null | undefined,
  exclude: string[] = [],
  allLanguages: readonly string[] = SRD_LANGUAGES,
): string[] {
  const excludeSet = new Set(exclude.map((name) => name.toLowerCase()))
  const standardSet = new Set(SRD_STANDARD_LANGUAGES.map((name) => name.toLowerCase()))
  const source =
    pool === "standard_and_rare"
      ? allLanguages
      : allLanguages.filter((name) => standardSet.has(name.toLowerCase()))
  return source.filter((name) => !excludeSet.has(name.toLowerCase()))
}
