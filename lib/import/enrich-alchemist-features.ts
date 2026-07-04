import { charInstance, modId } from "@/lib/compendium/modifier-instance-builders"
import { createModifierInstanceId } from "@/lib/compendium/linked-modifiers"
import { characteristicCatalogRefId } from "@/lib/compendium/modifier-catalog-refs"
import { syncModifierRefs } from "@/lib/compendium/linked-modifiers"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import { parseCompanionStatBlock } from "@/lib/character/parse-companion-stat-block"
import type { ImportContent } from "@/lib/import/content-schema"
import { parseCraftableItemsTable } from "@/lib/import/parse-craftable-items-table"
import type { Feature, UsesConfig } from "@/lib/types"

const REAGENTS_KEY = "reagents"

function isAlchemistSource(name: string | null | undefined): boolean {
  return /alchemist/i.test(name ?? "")
}

function bombAttackCharacteristic(damageTypes: string[]): CharacteristicModifier {
  return {
    id: modId("bomb_attack"),
    type: "special_attack",
    label: "Bomb — Attack",
    attackName: "Bomb",
    attackProfile: "ranged",
    attackVariant: "attack",
    targetMode: "single",
    properties: ["Martial", "Thrown"],
    damageTypes,
    damageDiceCount: 1,
    damageDieType: "d10",
    rangeFeet: 60,
    resourceScaleKey: REAGENTS_KEY,
    bonusDicePerResource: "1d10",
    maxResourcesSpentByLevel: [
      { level: 1, mode: "fixed", fixed: 0 },
      { level: 5, mode: "fixed", fixed: 1 },
      { level: 11, mode: "fixed", fixed: 2 },
      { level: 17, mode: "fixed", fixed: 3 },
    ],
  }
}

function bombExplodeCharacteristic(damageTypes: string[]): CharacteristicModifier {
  return {
    id: modId("bomb_explode"),
    type: "special_attack",
    label: "Bomb — Explode",
    attackName: "Bomb",
    attackProfile: "force_save",
    attackVariant: "explode",
    targetMode: "area",
    areaShape: "sphere",
    areaLengthFeet: 5,
    properties: ["Martial", "Thrown"],
    damageTypes,
    damageDiceCount: 1,
    damageDieType: "d10",
    saveAbility: "DEX",
    saveDCBase: 8,
    saveDCAbilityChoice: "higher_str_dex",
    saveHalfDamage: true,
    omitPositiveAbilityModFromDamage: true,
    resourceScaleKey: REAGENTS_KEY,
    bonusDicePerResource: "1d10",
    radiusIncreaseFeetPerResource: 5,
    maxResourcesSpentByLevel: [
      { level: 1, mode: "fixed", fixed: 0 },
      { level: 5, mode: "fixed", fixed: 1 },
      { level: 11, mode: "fixed", fixed: 2 },
      { level: 17, mode: "fixed", fixed: 3 },
    ],
  }
}

function unifiedBombModifiers(damageTypes = ["Fire"]): ReturnType<typeof charInstance>[] {
  const instanceId = createModifierInstanceId()
  return [
    charInstance(instanceId, characteristicCatalogRefId("special_attack"), [
      bombAttackCharacteristic(damageTypes),
      bombExplodeCharacteristic(damageTypes),
    ]),
  ]
}

function formulaDamageTypes(name: string): string[] {
  if (/acid/i.test(name)) return ["Acid"]
  if (/cold/i.test(name)) return ["Cold"]
  if (/lightning/i.test(name)) return ["Lightning"]
  if (/poison/i.test(name)) return ["Poison"]
  if (/holy|radiant/i.test(name)) return ["Radiant"]
  if (/shadow|necrotic/i.test(name)) return ["Necrotic"]
  return ["Fire"]
}

function enrichBombFormulaAbility<T extends Record<string, unknown>>(row: T): T {
  const name = String(row.name ?? "")
  if (row.ability_role !== "bomb_formula" && !/\bbomb formula\b/i.test(name)) return row
  const damageTypes = formulaDamageTypes(name)
  const existing = (row.linked_modifiers ?? row.linkedModifiers ?? []) as Feature["linkedModifiers"]
  if (existing?.some((mod) => mod.characteristics?.some((char) => char.type === "special_attack"))) {
    return row
  }
  return syncModifierRefs({
    ...row,
    ability_role: "bomb_formula",
    linkedModifiers: [...(existing ?? []), ...unifiedBombModifiers(damageTypes)],
  }) as T
}

function enrichAlchemistBombAbility<T extends Record<string, unknown>>(row: T): T {
  const name = String(row.name ?? "")
  const role = row.ability_role
  if (role !== "alchemist_bomb" && !/^bomb$/i.test(name.trim())) return row
  const existing = (row.linked_modifiers ?? row.linkedModifiers ?? []) as Feature["linkedModifiers"]
  if (existing?.some((mod) => mod.characteristics?.some((char) => char.type === "special_attack"))) {
    return { ...row, ability_role: "alchemist_bomb" } as T
  }
  const uses: UsesConfig = {
    type: "class_resource",
    classResourceKey: REAGENTS_KEY,
    classResourceAmount: 1,
  }
  return syncModifierRefs({
    ...row,
    ability_role: "alchemist_bomb",
    uses,
    linkedModifiers: [...(existing ?? []), ...unifiedBombModifiers()],
  }) as T
}

function enrichDiscoveryAbility<T extends Record<string, unknown>>(row: T): T {
  const name = String(row.name ?? "")
  if (row.ability_role !== "discovery" && !isAlchemistSource(String(row.source_name ?? ""))) {
    return row
  }
  if (
    row.ability_role !== "discovery" &&
    !/discovery|homunculus|batch brewing|double dose|alchemy of/i.test(name)
  ) {
    return row
  }

  let next = { ...row, ability_role: "discovery" } as T
  const description = String(row.description ?? "")
  const linked = [
    ...((next.linked_modifiers ?? next.linkedModifiers ?? []) as Feature["linkedModifiers"] ?? []),
  ]

  if (/batch brewing/i.test(name)) {
    linked.push(
      charInstance(createModifierInstanceId(), characteristicCatalogRefId("held_items_cap"), [
        {
          id: modId("batch_brewing_cap"),
          type: "held_items_cap",
          flatBonus: 2,
          baseAbility: "intelligence",
          label: "Batch Brewing +2 held potions",
        },
      ]),
    )
  }

  if (/double dose/i.test(name)) {
    linked.push(
      charInstance(createModifierInstanceId(), characteristicCatalogRefId("craftable_items"), [
        {
          id: modId("double_dose_healing"),
          type: "craftable_items",
          category: "Potion",
          items: [
            {
              itemName: "Healing Potion",
              resourceCost: 1,
              unlocksAtClassLevel: 1,
              usesPerItem: 2,
              category: "Potion",
            },
          ],
          label: "Healing potions have two doses",
        },
      ]),
    )
  }

  if (/homunculus/i.test(name) && !row.companion_stat_block) {
    const companion_stat_block = parseCompanionStatBlock(name, description)
    next = { ...next, companion_stat_block } as T
  }

  if (/restricted reagents?|brewing only/i.test(description)) {
    next = {
      ...next,
      uses: {
        ...(typeof next.uses === "object" && next.uses ? next.uses : {}),
        type: "class_resource",
        classResourceKey: REAGENTS_KEY,
        spendPurpose: "brewing",
      },
    } as T
  }

  const originalLength =
    ((row.linked_modifiers ?? row.linkedModifiers) as unknown[] | undefined)?.length ?? 0
  if (linked.length > originalLength) {
    next = syncModifierRefs({ ...next, linkedModifiers: linked }) as T
  }
  return next
}

function enrichReagentResourceUses(uses: UsesConfig): UsesConfig {
  const recharges = [...(uses.recharges ?? [])]
  const hasSynthesis = recharges.some(
    (rule) => rule.kind !== "real_time" && rule.amountFormula === "ability_modifier",
  )
  if (!hasSynthesis) {
    recharges.unshift({
      rest: "short_rest",
      amountFormula: "ability_modifier",
      amountFormulaAbility: "INT",
      maxPerLongRest: 1,
    })
  }
  if (!recharges.some((rule) => rule.kind !== "real_time" && rule.rest === "long_rest")) {
    recharges.push({ rest: "long_rest" })
  }
  return { ...uses, recharges }
}

function enrichPotionsFeature(feature: Feature): Feature {
  const description = feature.description ?? ""
  if (!/brew the following potions|craftable potions/i.test(description)) return feature
  const items = parseCraftableItemsTable(description)
  if (!items.length) return feature

  const instanceId = createModifierInstanceId()
  const modifier = charInstance(instanceId, characteristicCatalogRefId("craftable_items"), [
    {
      id: modId("alchemist_potions_known"),
      type: "craftable_items",
      category: "Potion",
      items,
      label: "Known potions",
    },
  ])
  return syncModifierRefs({
    ...feature,
    linkedModifiers: [...(feature.linkedModifiers ?? []), modifier],
  })
}

function enrichHeldItemsFeature(feature: Feature): Feature {
  if (!/held potions|held items/i.test(feature.name)) return feature
  if (
    (feature.linkedModifiers ?? []).some((mod) =>
      mod.characteristics?.some((char) => char.type === "held_items_cap"),
    )
  ) {
    return feature
  }
  const instanceId = createModifierInstanceId()
  return syncModifierRefs({
    ...feature,
    linkedModifiers: [
      ...(feature.linkedModifiers ?? []),
      charInstance(instanceId, characteristicCatalogRefId("held_items_cap"), [
        {
          id: modId("alchemist_held_cap"),
          type: "held_items_cap",
          baseAbility: "intelligence",
          flatBonus: 0,
          label: "Held potions cap (INT mod)",
        },
      ]),
    ],
  })
}

function enrichAlchemistClassFeature(feature: Feature, className: string): Feature {
  if (!isAlchemistSource(className)) return feature
  let next = feature
  next = enrichPotionsFeature(next)
  next = enrichHeldItemsFeature(next)

  if (/reagent synthesis/i.test(feature.name)) {
    next = {
      ...next,
      description: `${next.description ?? ""}\n\nOn a Short Rest, regain Reagents equal to your Intelligence modifier (once per Long Rest).`.trim(),
    }
  }

  return next
}

type ProposalAbility = NonNullable<
  NonNullable<ImportContent["import_proposals"]>["custom_abilities"]
>[number]

function enrichProposalAbility(ability: ProposalAbility): ProposalAbility {
  if (!isAlchemistSource(ability.source_name)) return ability
  let row = { ...ability } as Record<string, unknown>
  row = enrichAlchemistBombAbility(row)
  row = enrichBombFormulaAbility(row)
  row = enrichDiscoveryAbility(row)
  return row as ProposalAbility
}

/** Wire Bomb modes, formulas, discoveries, potions tables, and Reagent recharge on import. */
export function enrichAlchemistFeatures(content: ImportContent): ImportContent {
  const next: ImportContent = { ...content }

  if (content.classes?.length) {
    next.classes = content.classes.map((cls) => {
      if (!isAlchemistSource(cls.name)) return cls
      return {
        ...cls,
        features: (cls.features ?? []).map((feature) =>
          enrichAlchemistClassFeature(feature as Feature, cls.name),
        ),
      }
    })
  }

  if (content.import_proposals?.custom_abilities?.length) {
    next.import_proposals = {
      ...content.import_proposals,
      custom_abilities: content.import_proposals.custom_abilities.map(enrichProposalAbility),
    }
  }

  if (content.import_proposals?.class_resources?.length) {
    next.import_proposals = {
      ...next.import_proposals,
      class_resources: (next.import_proposals?.class_resources ?? []).map((resource) => {
        if (!isAlchemistSource(resource.class_name)) return resource
        if (resource.resource_key !== REAGENTS_KEY) return resource
        return {
          ...resource,
          uses: enrichReagentResourceUses(resource.uses),
        }
      }),
    }
  }

  if (content.class_resources?.length) {
    next.class_resources = content.class_resources.map((resource) => {
      if (!isAlchemistSource(resource.class_name)) return resource
      if (resource.resource_key !== REAGENTS_KEY) return resource
      return {
        ...resource,
        uses: enrichReagentResourceUses(resource.uses),
      }
    })
  }

  return next
}
