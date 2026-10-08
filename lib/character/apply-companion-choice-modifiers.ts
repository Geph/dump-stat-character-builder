import { applyModifierPlayerPicks } from "@/lib/builder/modifier-player-choices"
import { featureChoiceKey } from "@/lib/builder/choices"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import type {
  CompanionNamedBlock,
  CompanionSource,
  CompanionStatBlockTemplate,
} from "@/lib/character/companion-stat-block"
import { characteristicsFromLinkedModifiers } from "@/lib/compendium/builder-modifier-refs"
import {
  companionSourceMatchesChoice,
  featureChoiceAppliesToCompanion,
  findChoiceOption,
} from "@/lib/compendium/feature-choice-target"
import { effectiveLinkedModifiers } from "@/lib/compendium/linked-modifiers"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import type { CustomAbility, Feature } from "@/lib/types"
import { inferCompanionAttackFromText } from "@/lib/character/infer-companion-attack"

function uniqLabels(values: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of values) {
    const name = raw.trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}

function appendCsv(line: string | null | undefined, names: string[]): string | null {
  const existing = (line ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
  const merged = uniqLabels([...existing, ...names])
  return merged.length ? merged.join(", ") : (line ?? null)
}

function pushTrait(template: CompanionStatBlockTemplate, trait: CompanionNamedBlock): CompanionStatBlockTemplate {
  const text = trait.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
  const activation = text.match(/(?:^|\.\s+)As (?:an?|your) (bonus action|reaction|action)\b/i)?.[1]?.toLowerCase()
  if (activation) {
    const key = activation === "bonus action" ? "bonusActions" : activation === "reaction" ? "reactions" : "actions"
    const entries = template[key] ?? []
    if (entries.some((entry) => entry.name.toLowerCase() === trait.name.toLowerCase())) return template
    return { ...template, [key]: [...entries, { ...trait, attack: inferCompanionAttackFromText(trait.description) }] }
  }
  if (
    template.traits.some(
      (entry) => entry.name.trim().toLowerCase() === trait.name.trim().toLowerCase(),
    )
  ) {
    return template
  }
  return { ...template, traits: [...template.traits, trait] }
}

function applyLinkedToTemplate(
  template: CompanionStatBlockTemplate,
  optionName: string,
  optionDescription: string,
  instances: ReturnType<typeof effectiveLinkedModifiers>,
  characteristics: ReturnType<typeof characteristicsFromLinkedModifiers>,
  extras?: { omitTrait?: boolean },
): CompanionStatBlockTemplate {
  let next = template

  const resistances = characteristics.flatMap((mod) =>
    mod.type === "damage_resistance" ? (mod.damageTypes ?? []) : [],
  )
  const immunities = characteristics.flatMap((mod) =>
    mod.type === "condition_immunity" ? (mod.conditions ?? []) : [],
  )
  const saves = characteristics.flatMap((mod) => (mod.type === "saving_throws" ? mod.values : []))
  const skills = characteristics.flatMap((mod) =>
    mod.type === "skills" ? (mod.entries ?? []).map((entry) => entry.skill) : [],
  )

  if (resistances.length) {
    next = { ...next, resistances: uniqLabels([...(next.resistances ?? []), ...resistances]) }
  }
  if (immunities.length) {
    next = {
      ...next,
      conditionImmunities: uniqLabels([...(next.conditionImmunities ?? []), ...immunities]),
    }
  }
  if (saves.length) {
    next = { ...next, savingThrows: appendCsv(next.savingThrows, saves) }
  }
  if (skills.length) {
    next = { ...next, skills: appendCsv(next.skills, skills) }
  }

  const relentless = instances.some((instance) => instance.activation?.onDropToZeroHp)
  if (!extras?.omitTrait) {
    const traitName = optionName.trim() || "Species Trait"
    next = pushTrait(next, {
      name: traitName,
      description: optionDescription.trim() || traitName,
      tag: relentless ? "1/Day" : null,
    })
  }

  return next
}

export function applyCompanionScopedChoiceModifiers(params: {
  template: CompanionStatBlockTemplate
  source: CompanionSource
  classDetails: CharacterClassDetail[]
  featureChoicePicks?: Record<string, string[]>
  modifierPlayerPicks?: Record<string, string[]>
  modifierCatalog?: ModifierCatalogEntry[]
  /** Already filtered to the character's selected/granted abilities. */
  customAbilities?: CustomAbility[]
}): CompanionStatBlockTemplate {
  const catalog = params.modifierCatalog ?? []
  const picks = params.featureChoicePicks ?? {}
  const playerPicks = params.modifierPlayerPicks ?? {}
  let template = params.template

  for (const entry of params.classDetails) {
    if (entry.row.class_id !== params.source.classId) continue
    const features = [
      ...((entry.class?.features as Feature[] | undefined) ?? []),
      ...((entry.subclass?.features as Feature[] | undefined) ?? []),
      ...(params.customAbilities ?? [])
        .filter((ability) => featureChoiceAppliesToCompanion(ability) &&
          ((ability.attached_to_type === "subclass" && [entry.subclass?.id, entry.subclass?.name].includes(ability.attached_to_id ?? "")) ||
           (ability.attached_to_type === "class" && [entry.class?.id, entry.class?.name].includes(ability.attached_to_id ?? ""))))
        .map((ability) => ({ name: ability.name, description: ability.description ?? "", level: ability.level_requirement ?? 1,
          isChoice: ability.isChoice ?? false, choices: ability.choices ?? undefined,
          linkedModifiers: ability.linked_modifiers ?? [], modifierRefs: ability.modifierRefs ?? [],
        })),
    ]
    for (const feature of features) {
      if ((feature.level ?? 1) > entry.row.level) continue
      if (!featureChoiceAppliesToCompanion(feature)) continue
      if (!companionSourceMatchesChoice(feature, params.source)) continue
      if (!feature.choices?.options?.length) template = pushTrait(template, { name: feature.name, description: feature.description })
      const key = featureChoiceKey(entry.row.class_id, feature.name, feature.level)
      const featureInstances = effectiveLinkedModifiers(
        feature.linkedModifiers,
        feature.modifierRefs,
        catalog,
      )
      if (featureInstances.length) {
        const featureCharacteristics = applyModifierPlayerPicks(
          characteristicsFromLinkedModifiers(catalog, featureInstances, feature.modifierRefs),
          key,
          playerPicks,
        )
        template = applyLinkedToTemplate(
          template,
          feature.name,
          feature.description,
          featureInstances,
          featureCharacteristics,
          { omitTrait: Boolean(feature.choices?.options?.length) },
        )
      }
      const chosen = feature.isChoice
        ? (picks[key] ?? picks[featureChoiceKey(entry.row.class_id, feature.name)] ?? [])
        : (feature.choices?.options ?? []).map((option) => option.name)
      for (const optionName of chosen) {
        const option = findChoiceOption(feature.choices?.options, optionName)
        if (!option) continue
        const instances = effectiveLinkedModifiers(
          option.linkedModifiers,
          option.modifierRefs,
          catalog,
        )
        const characteristics = applyModifierPlayerPicks(
          characteristicsFromLinkedModifiers(catalog, instances, option.modifierRefs),
          key,
          playerPicks,
        )
        template = applyLinkedToTemplate(
          template,
          option.name,
          option.description,
          instances,
          characteristics,
        )
      }
    }
  }

  return template
}
