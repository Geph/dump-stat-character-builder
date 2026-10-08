import { parseMinimumLevelFromPrerequisite } from "@/lib/builder/choice-prerequisite"
import type { CustomAbility } from "@/lib/types"

/** Selected nested options are actionable leaves; package/sibling mechanics are not inherited. */
export function selectedCustomAbilityOptions(
  abilities: CustomAbility[],
  picks: Record<string, string[]> | undefined,
): CustomAbility[] {
  const selected = new Set(Object.values(picks ?? {}).flat().map((name) => name.trim().toLowerCase()))
  const existing = new Set(abilities.map((ability) => ability.name.trim().toLowerCase()))
  const leaves: CustomAbility[] = []
  for (const parent of abilities) {
    for (const choices of [parent.choices, parent.specialization_choices]) {
      if (choices?.applyTo === "companion") continue
      for (const option of choices?.options ?? []) {
        const key = option.name.trim().toLowerCase()
        if (!selected.has(key) || existing.has(key)) continue
        existing.add(key)
        leaves.push({
          ...parent,
          id: `${parent.id}:option:${key}`,
          name: option.name,
          description: option.description,
          ability_role: "class_talent",
          level_requirement: Math.max(parent.level_requirement ?? 1, option.level_requirement ?? 1, parseMinimumLevelFromPrerequisite(option.prerequisite) ?? 1),
          prerequisites: option.prerequisite ?? null,
          linked_modifiers: option.linkedModifiers ?? [],
          modifierRefs: option.modifierRefs ?? [],
          characteristics: [],
          choices: null,
          specialization_choices: null,
          modifier_catalog: null,
          uses: null,
          casting_time: null,
          execution: null,
          range: null,
          components: null,
          duration: null,
          concentration: false,
          psionic_augments: null,
        })
      }
    }
  }
  return leaves
}
