import type { Background } from "@/lib/types"
import { getBackgroundStartingEquipmentGroups } from "@/lib/compendium/background-equipment"
import {
  formatBackgroundProficiencies,
  normalizeBackgroundProficiencies,
} from "@/lib/compendium/background-proficiencies"
import { formatGrantedSpellLevelKey } from "@/lib/compendium/background-utils"

function formatAbilityLabel(key: string): string {
  const lower = key.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

/** Human-readable ability score increases from a background record. */
export function formatBackgroundAbilityBonuses(
  bonuses: Record<string, number> | null | undefined,
): string | null {
  if (!bonuses || Object.keys(bonuses).length === 0) return null

  const entries = Object.entries(bonuses).map(
    ([ability, value]) => [formatAbilityLabel(ability), value] as const,
  )
  const fixed = entries.filter(([, value]) => value > 0)
  if (fixed.length > 0) {
    return fixed.map(([ability, value]) => `+${value} ${ability}`).join(", ")
  }

  const choices = entries.map(([ability]) => ability)
  if (choices.length === 0) return null

  const list =
    choices.length === 1
      ? choices[0]
      : choices.length === 2
        ? `${choices[0]} or ${choices[1]}`
        : `${choices.slice(0, -1).join(", ")}, or ${choices[choices.length - 1]}`

  return `+2 to one ability and +1 to another (from ${list})`
}

export function formatBackgroundEquipment(background: Background): string | null {
  const groups = getBackgroundStartingEquipmentGroups(background)
  if (groups.length > 0) {
    return groups
      .flatMap((group) =>
        group.options.map((opt) => {
          const items = opt.items
            .map((item) => `${item.quantity > 1 ? `${item.quantity}× ` : ""}${item.name}`)
            .join(", ")
          return `${opt.label}: ${items}`
        }),
      )
      .join("\n")
  }
  if (background.starting_equipment?.length) {
    return background.starting_equipment
      .map((item) => `${item.quantity > 1 ? `${item.quantity}× ` : ""}${item.name}`)
      .join(", ")
  }
  const legacy = background.equipment
  if (typeof legacy === "string" && legacy.trim()) return legacy.trim()
  return null
}

export function formatBackgroundGrantedSpells(
  background: Background,
  spells: { id: string; name: string }[],
): string[] {
  if (!background.grants_spells || !background.granted_spells) return []
  const byId = new Map(spells.map((s) => [s.id, s.name]))
  const lines: string[] = []
  for (const level of Object.keys(background.granted_spells).sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  )) {
    const names = (background.granted_spells[level] ?? [])
      .map((id) => byId.get(id) ?? id)
      .filter(Boolean)
    if (names.length) {
      lines.push(`${formatGrantedSpellLevelKey(level)}: ${names.join(", ")}`)
    }
  }
  return lines
}

export function getBackgroundProficiencySections(background: Background) {
  const proficiencies = normalizeBackgroundProficiencies(
    background.proficiencies,
    background.tool_proficiencies,
  )
  return formatBackgroundProficiencies(proficiencies)
}

export function findBackgroundGrantedFeat(
  featGranted: string | null | undefined,
  feats: { id: string; name: string; description: string | null }[],
): { id: string; name: string; description: string | null } | undefined {
  if (!featGranted?.trim()) return undefined
  const name = featGranted.trim()
  const exact = feats.find((f) => f.name === name)
  if (exact) return exact
  return feats.find(
    (f) => name === f.name || name.startsWith(`${f.name} `) || name.startsWith(`${f.name}(`),
  )
}
