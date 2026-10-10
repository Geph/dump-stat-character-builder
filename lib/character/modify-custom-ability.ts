import type { ModifyCustomAbilityCharacteristic } from "@/lib/compendium/characteristic-modifiers"
import type { CustomAbility, FeatureChoice, UsesConfig } from "@/lib/types"

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

function appendDescription(existing: string | null, addition: string): string {
  const text = addition.trim()
  if (!text) return existing ?? ""
  if (!existing) return text
  return looksLikeHtml(existing) ? `${existing}\n<p>${text}</p>` : `${existing}\n\n${text}`
}

function appendOptions(
  choices: FeatureChoice,
  options: { name: string; description: string }[],
): FeatureChoice {
  const existing = choices.options ?? []
  const seen = new Set(existing.map((option) => normalizeName(option.name)))
  const added = options.filter((option) => {
    const key = normalizeName(option.name)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
  if (!added.length) return choices
  return { ...choices, options: [...existing, ...added] }
}

/**
 * Apply `modify_custom_ability` upgrades to the abilities a character knows.
 *
 * Names must match exactly (case and whitespace insensitive). Unlike
 * `grant_custom_ability`, upgrades deliberately avoid substring matching, so
 * "Mind" cannot silently rewrite every ability with "Mind" in its name.
 *
 * Extra options land in the target's own choice pool when it has one. When it
 * does not, they are folded into the description instead of being dropped.
 */
export function applyCustomAbilityModifications(
  abilities: CustomAbility[],
  modifications: readonly ModifyCustomAbilityCharacteristic[],
): CustomAbility[] {
  if (!modifications.length) return abilities

  const byName = new Map<string, ModifyCustomAbilityCharacteristic[]>()
  for (const mod of modifications) {
    for (const rawName of mod.abilityNames ?? []) {
      const key = normalizeName(rawName)
      if (!key) continue
      const list = byName.get(key)
      if (list) list.push(mod)
      else byName.set(key, [mod])
    }
  }
  if (!byName.size && !modifications.some((mod) => mod.abilityFilter)) return abilities

  return abilities.map((ability) => {
    const matched = [...new Set([...(byName.get(normalizeName(ability.name)) ?? []), ...modifications.filter((mod) => {
      const filter = mod.abilityFilter
      if (!filter || ability.ability_role !== filter.role) return false
      const level = ability.level_requirement ?? 1
      if (filter.minLevel != null && level < filter.minLevel) return false
      if (filter.maxLevel != null && level > filter.maxLevel) return false
      return !filter.eligibleClassNames?.length || filter.eligibleClassNames.some((name) =>
        ability.eligible_classes?.some((eligible) => normalizeName(eligible) === normalizeName(name)))
    })])]
    if (!matched?.length) return ability

    let next = ability
    for (const mod of matched) {
      const options = mod.appendOptions ?? []
      let description = next.description ?? null
      let choices = next.choices ?? null

      if (options.length) {
        if (choices) {
          choices = appendOptions(choices, options)
        } else {
          for (const option of options) {
            description = appendDescription(description, `${option.name}. ${option.description}`)
          }
        }
      }
      if (mod.addendum) description = appendDescription(description, mod.addendum)

      next = { ...next, description, choices }
      if (mod.removeUseLimit || mod.resourceCostWaiver) {
        const updateUses = (uses: UsesConfig): UsesConfig => ({
          ...uses,
          ...(mod.removeUseLimit ? { type: uses.classResourceKey ? "class_resource" : "unlimited", recharges: [] } : {}),
          ...(mod.resourceCostWaiver ? { resourceCostWaiver: mod.resourceCostWaiver } : {}),
        })
        next = {
          ...next,
          uses: updateUses(next.uses ?? { type: "unlimited" }),
          characteristics: next.characteristics?.map((c) => c.type === "uses" ? { ...c, uses: updateUses(c.uses) } : c) ?? null,
          linked_modifiers: next.linked_modifiers?.map((instance) => ({ ...instance,
            characteristics: instance.characteristics?.map((c) => c.type === "uses" ? { ...c, uses: updateUses(c.uses) } : c),
          })),
        }
      }
    }
    return next
  })
}
