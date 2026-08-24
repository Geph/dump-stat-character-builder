import type { Feature } from "@/lib/types"

/** Words that read wrong when pluralized directly ("Metamagics"). */
const MASS_NOUN = /(metamagic|magic|lore|knowledge|mastery)$/i

/** Pool nouns a feature name can imply when the choice has no category. */
const NAME_NOUN =
  /\b(knack|trick|exploit|maneuver|manoeuvre|technique|rite|manifestation|metamagic|art|stunt)s?\b/i

function titleCase(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

/**
 * Display noun for a player-choice pool. The `class_knacks` options source is
 * shared by Knacks, Exploits, Maneuvers, Occult Rites and friends, so the
 * feature's own category wins over the pipeline name.
 */
export function choicePoolNoun(feature: Feature, fallback = "Knack"): string {
  const category = feature.choices?.category?.trim()
  if (category) return category
  const match = NAME_NOUN.exec(feature.name ?? "")
  return match ? titleCase(match[1]) : fallback
}

export function pluralizeChoiceNoun(noun: string, count: number): string {
  const trimmed = noun.trim()
  if (!trimmed) return count === 1 ? "option" : "options"
  if (MASS_NOUN.test(trimmed)) return `${trimmed} option${count === 1 ? "" : "s"}`
  if (count === 1) return trimmed
  if (/(s|x|z|ch|sh)$/i.test(trimmed)) return `${trimmed}es`
  if (/[^aeiou]y$/i.test(trimmed)) return `${trimmed.slice(0, -1)}ies`
  return `${trimmed}s`
}

/** "Choose 3 Occult Rites (replace one when you level up)." */
export function choicePoolHint(feature: Feature, count: number, fallbackNoun = "Knack"): string {
  const noun = pluralizeChoiceNoun(choicePoolNoun(feature, fallbackNoun), count)
  const swapNote = feature.choices?.swappableOnRest ? " (replace one when you level up)" : ""
  return `Choose ${count} ${noun}${swapNote}.`
}
