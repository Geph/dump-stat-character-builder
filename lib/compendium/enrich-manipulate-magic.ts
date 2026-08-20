import { buildGrantFeatModifier } from "@/lib/compendium/shared-feature-modifier-builders"
import {
  effectiveLinkedModifiers,
  syncModifierRefs,
  type LinkedModifierInstance,
} from "@/lib/compendium/linked-modifiers"
import { usesInstance } from "@/lib/compendium/modifier-instance-builders"
import type { CustomAbility } from "@/lib/types"

const MANIPULATE_MAGIC_NAME = /^manipulate magic$/i
const LEARN_ONE_METAMAGIC =
  /\blearn one metamagic option of your choice(?:\s+from the sorcerer class)?\b/i

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

type AbilityLike = {
  name?: string | null
  description?: string | null
  linked_modifiers?: LinkedModifierInstance[] | null
  linkedModifiers?: LinkedModifierInstance[] | null
  modifier_refs?: string[] | null
  modifierRefs?: string[] | null
}

export function isManipulateMagicAbility(ability: AbilityLike): boolean {
  if (MANIPULATE_MAGIC_NAME.test(ability.name?.trim() ?? "")) return true
  return LEARN_ONE_METAMAGIC.test(stripHtml(ability.description ?? ""))
}

export function abilityGrantsMetamagicFeat(ability: AbilityLike): boolean {
  const linked = effectiveLinkedModifiers(
    ability.linkedModifiers ?? ability.linked_modifiers,
    ability.modifierRefs ?? ability.modifier_refs,
    [],
  )
  return linked.some((instance) =>
    (instance.characteristics ?? []).some(
      (char) =>
        char.type === "grant_feat" &&
        Array.isArray(char.featCategories) &&
        char.featCategories.some((category) => /metamagic/i.test(category)),
    ),
  )
}

function abilityHasLongRestUse(ability: AbilityLike): boolean {
  const linked = effectiveLinkedModifiers(
    ability.linkedModifiers ?? ability.linked_modifiers,
    ability.modifierRefs ?? ability.modifier_refs,
    [],
  )
  return linked.some((instance) =>
    (instance.characteristics ?? []).some((char) => {
      if (char.type !== "uses" || !char.uses) return false
      return (char.uses.recharges ?? []).some((row) => row.rest === "long_rest")
    }),
  )
}

/**
 * Hedge Mage Occult Rite: pick one PHB Metamagic option, 1 free use / long rest
 * (treat as ≤3 SP), extra uses spend a matching-level spell slot.
 */
export function enrichManipulateMagicAbility<T extends AbilityLike>(ability: T): T {
  if (!isManipulateMagicAbility(ability)) return ability

  const linked = [
    ...effectiveLinkedModifiers(
      ability.linkedModifiers ?? ability.linked_modifiers,
      ability.modifierRefs ?? ability.modifier_refs,
      [],
    ),
  ]
  if (!abilityGrantsMetamagicFeat(ability)) {
    linked.push(buildGrantFeatModifier(["Metamagic"], "Metamagic option", "modinst_manipulate_magic_grant"))
  }
  if (!abilityHasLongRestUse(ability)) {
    linked.push(
      usesInstance(
        "modinst_manipulate_magic_uses",
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Manipulate Magic",
      ),
    )
  }

  const synced = syncModifierRefs({
    linkedModifiers: linked,
    modifierRefs: ability.modifierRefs ?? ability.modifier_refs ?? [],
  })
  return {
    ...ability,
    linkedModifiers: synced.linkedModifiers,
    linked_modifiers: synced.linkedModifiers,
    modifierRefs: synced.modifierRefs,
    modifier_refs: synced.modifierRefs,
  }
}

export function enrichManipulateMagicAbilities(abilities: CustomAbility[]): CustomAbility[] {
  return abilities.map((ability) => enrichManipulateMagicAbility(ability))
}
