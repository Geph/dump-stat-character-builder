import type { CustomAbility } from "@/lib/types"

const MANEUVER_CLASS =
  /\b(gunslinger|captain|vagabond|battle\s*master|house of kings)\b/i

const KNACK_CLASS = /\b(alternate\s+ranger|ranger)\b/i
const TRICK_CLASS = /\bwarmage\b/i
const EXPLOIT_CLASS =
  /\b(beastheart|alternate\s+(barbarian|fighter|rogue|monk)|barbarian|fighter|rogue)\b/i

function textOf(ability: CustomAbility): string {
  const row = ability as CustomAbility & {
    definition?: string | null
    source_name?: string | null
    eligible_classes?: string[] | null
  }
  return [
    ability.name,
    ability.description,
    row.definition,
    row.source_name,
    ...(row.eligible_classes ?? []),
  ]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(" ")
}

function eligibleAndSource(ability: CustomAbility): string {
  const row = ability as CustomAbility & {
    source_name?: string | null
    eligible_classes?: string[] | null
  }
  return [row.source_name, ...(row.eligible_classes ?? [])].filter(Boolean).join(" ")
}

/** True for Battle-Die / Risk-Die / Battle Master style maneuvers. */
export function isManeuverCustomAbility(ability: CustomAbility): boolean {
  if (/\[maneuver\]/i.test(ability.name) || /\bmaneuvers?\b/i.test(ability.name)) return true
  const row = ability as CustomAbility & { definition?: string | null }
  if (/\bmaneuvers?\b/i.test(row.definition ?? "")) return true
  if (ability.ability_role !== "knack" && ability.ability_role) return false
  const owners = eligibleAndSource(ability)
  if (MANEUVER_CLASS.test(owners)) return true
  return /\b(risk die|battle die)\b/i.test(textOf(ability))
}

const ROLE_LABELS: Record<string, string> = {
  discipline: "Discipline",
  psionic_power: "Psionic power",
  class_talent: "Class talent",
  talent_pool: "Talent pool",
  knack: "Knack",
  upgrade: "Upgrade",
  bomb_formula: "Bomb formula",
  discovery: "Discovery",
  alchemist_bomb: "Alchemist bomb",
  weapon_mastery: "Weapon mastery",
}

/**
 * Player-facing role for a custom ability.
 * `ability_role: knack` is the shared pick-from-a-list pipeline (Warmage Tricks,
 * Vagabond Maneuvers, Ranger Knacks, …) — only Alternate Ranger actually names them Knacks.
 */
export function displayAbilityRoleLabel(ability: CustomAbility): string | null {
  if (isManeuverCustomAbility(ability)) return "Maneuver"
  const owners = eligibleAndSource(ability)
  const role = ability.ability_role?.trim() ?? ""
  if (role === "knack" || !role) {
    if (TRICK_CLASS.test(owners) || /\btricks?\b/i.test(ability.name)) return "Trick"
    if (EXPLOIT_CLASS.test(owners) || /\bexploits?\b/i.test(ability.name)) return "Exploit"
    if (KNACK_CLASS.test(owners)) return "Knack"
    if (role === "knack") return "Knack"
    return null
  }
  return ROLE_LABELS[role] ?? role.replace(/_/g, " ")
}
