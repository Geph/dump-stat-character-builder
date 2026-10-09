import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`
  if (value && typeof value === "object") return JSON.stringify(Object.fromEntries(
    Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)]),
  ))
  return JSON.stringify(value)
}

/** One owning feature at a time: never compare damage across independent sources. */
export function removeRedundantTriggerDamage(linked: LinkedModifierInstance[]): LinkedModifierInstance[] {
  const conditional = new Set<string>()
  for (const instance of linked) for (const mod of instance.characteristics ?? []) {
    if (mod.type !== "on_hit_trigger") continue
    for (const effect of mod.effect?.characteristics ?? []) {
      if (effect.type === "damage_roll_modifiers") conditional.add(stable(effect.entries))
    }
  }
  if (!conditional.size) return linked
  const duplicate = (mod: CharacteristicModifier) => mod.type === "damage_roll_modifiers" &&
    mod.id.startsWith("mod_import_") && /^Extra\s+\d+d\d+\b/i.test(mod.label ?? "") &&
    !mod.limitations?.length && !mod.requiresSheetToggle && conditional.has(stable(mod.entries))
  return linked.flatMap((instance) => {
    if (!instance.characteristics?.some(duplicate)) return [instance]
    const characteristics = instance.characteristics.filter((mod) => !duplicate(mod))
    return characteristics.length || instance.activation ? [{ ...instance, characteristics }] : []
  })
}
