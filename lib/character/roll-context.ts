import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"

export type RollKind = "ability" | "skill" | "save" | "attack" | "initiative"

export type RollContext = {
  kind: RollKind
  /** Ability score key for saves, ability checks, and initiative. */
  ability?: AbilityScoreKey
  /** Skill name for skill checks. */
  skillName?: string
}

export function rollContextLabel(context: RollContext): string {
  if (context.kind === "skill" && context.skillName) return context.skillName
  if (context.ability) {
    const abbr = context.ability.slice(0, 3)
    const capitalized = abbr.charAt(0).toUpperCase() + abbr.slice(1)
    if (context.kind === "save") return `${capitalized} save`
    if (context.kind === "attack") return `${capitalized} attack`
    if (context.kind === "initiative") return "Initiative"
    return `${capitalized} check`
  }
  return context.kind
}
