/**
 * Cross-surface audit for feature-granted equipment: inventory back-reference,
 * sheet action linkage, and resource-bound limited uses.
 */
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import {
  collectGrantedEquipmentFromFeatures,
  planEquipmentGrants,
  resolveGrantedEquipmentHoldings,
  type GrantedEquipmentHolding,
} from "@/lib/character/granted-equipment"
import { collectSheetActions, inferActivatableActionKinds } from "@/lib/character/sheet-actions"
import { resourceKeysMatch } from "@/lib/compendium/audit-resource-graph"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import type { ImportContent } from "@/lib/import/content-schema"
import { loadMageHandPressPack } from "@/lib/seed-packs/mage-hand-press/load"
import type {
  CustomAbility,
  Equipment,
  Feature,
  UsesConfig,
} from "@/lib/types"

export type GrantedEquipmentViolationKind =
  | "missing_granted_by"
  | "missing_sheet_action"
  | "loose_use_counter"

export type GrantedEquipmentViolation = {
  class: string
  feature: string
  level: number
  item: string
  kind: GrantedEquipmentViolationKind
}

export type GrantedEquipmentGrantRow = {
  class: string
  feature: string
  level: number
  item: string
}

export type GrantedEquipmentAuditResult = {
  violations: GrantedEquipmentViolation[]
  grants: GrantedEquipmentGrantRow[]
}

export function grantedEquipmentViolationKey(row: GrantedEquipmentViolation): string {
  return `${row.class}|${row.feature}|${row.level}|${row.item}|${row.kind}`
}

export function filterImportContentByClasses(
  contents: readonly ImportContent[],
  classNames: readonly string[] | null | undefined,
): ImportContent[] {
  if (!classNames?.length) return [...contents]
  const wanted = new Set(classNames.map((name) => name.trim().toLowerCase()).filter(Boolean))
  return contents.filter((content) =>
    (content.classes ?? []).some((cls) => wanted.has(String(cls.name ?? "").trim().toLowerCase())),
  )
}

function namesMatch(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase()
}

function featureLabel(featureName: string, subclassName?: string | null): string {
  const name = featureName.trim() || "(unnamed)"
  const subclass = subclassName?.trim()
  return subclass ? `${name} (${subclass})` : name
}

function grantEquipmentNames(feature: Feature): string[] {
  const names: string[] = []
  const seen = new Set<string>()
  for (const instance of feature.linkedModifiers ?? []) {
    for (const characteristic of instance.characteristics ?? []) {
      if (characteristic.type !== "grant_equipment") continue
      for (const raw of characteristic.equipmentNames ?? []) {
        const name = raw.trim()
        if (!name) continue
        const key = name.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        names.push(name)
      }
    }
  }
  return names
}

function featureGrantsAbilityNamed(feature: Feature, itemName: string): boolean {
  for (const instance of feature.linkedModifiers ?? []) {
    for (const characteristic of instance.characteristics ?? []) {
      if (characteristic.type !== "grant_custom_ability") continue
      if ((characteristic.abilityNames ?? []).some((name) => namesMatch(name, itemName))) {
        return true
      }
    }
  }
  return false
}

function linkedHasActivation(instances: { characteristics?: unknown[]; activation?: unknown }[] | null | undefined): boolean {
  for (const instance of instances ?? []) {
    const activation = instance.activation as { action?: boolean; bonusAction?: boolean; reaction?: boolean; effects?: { kind?: string }[] } | null
    if (activation?.action || activation?.bonusAction || activation?.reaction) return true
    if ((activation?.effects ?? []).some((effect) =>
      effect.kind === "cast_spell" || effect.kind === "special_attack",
    )) {
      return true
    }
    for (const characteristic of (instance.characteristics ?? []) as { type?: string }[]) {
      if (characteristic.type === "special_attack") return true
    }
  }
  return false
}

function customAbilityLooksActivatable(ability: CustomAbility): boolean {
  if (ability.casting_time?.trim() || ability.execution?.trim()) return true
  if (linkedHasActivation(ability.linked_modifiers ?? undefined)) return true
  const kinds = inferActivatableActionKinds({
    name: ability.name,
    description: ability.description,
    limitedUses: ability.uses,
    linkedModifiers: ability.linked_modifiers ?? undefined,
  })
  return kinds.length > 0
}

function equipmentHasActivation(item: Equipment | undefined): boolean {
  if (!item) return false
  return linkedHasActivation(item.magic_effects ?? undefined)
}

function itemExpectsSheetAction(params: {
  itemName: string
  feature: Feature
  equipment?: Equipment
  abilities: CustomAbility[]
}): boolean {
  const ability = params.abilities.find((entry) => namesMatch(entry.name, params.itemName))
  if (featureGrantsAbilityNamed(params.feature, params.itemName)) {
    if (!ability) return true
    return customAbilityLooksActivatable(ability)
  }
  if (equipmentHasActivation(params.equipment)) return true
  if (ability && customAbilityLooksActivatable(ability)) return true
  return false
}

function usesFromLinked(
  instances: { characteristics?: { type?: string; uses?: UsesConfig }[] }[] | null | undefined,
): UsesConfig | null {
  for (const instance of instances ?? []) {
    for (const characteristic of instance.characteristics ?? []) {
      if (characteristic.type === "uses" && characteristic.uses) return characteristic.uses
    }
  }
  return null
}

function limitedUsesForItem(params: {
  itemName: string
  equipment?: Equipment
  abilities: CustomAbility[]
}): UsesConfig | null {
  const ability = params.abilities.find((entry) => namesMatch(entry.name, params.itemName))
  if (ability?.uses) return ability.uses
  const fromAbility = usesFromLinked(ability?.linked_modifiers ?? undefined)
  if (fromAbility) return fromAbility
  return usesFromLinked(params.equipment?.magic_effects ?? undefined)
}

function isLooseUseCounter(uses: UsesConfig, resourceKeys: string[]): boolean {
  if (uses.type === "unlimited" || uses.type === "special" || uses.type === "spell_slots") {
    return false
  }
  if (uses.type === "class_resource") {
    const key = uses.classResourceKey?.trim()
    if (!key) return true
    return !resourceKeys.some((candidate) => resourceKeysMatch(candidate, key))
  }
  return true
}

function sheetActionsCoverItem(actions: { name: string }[], itemName: string): boolean {
  return actions.some((action) => namesMatch(action.name, itemName))
}

function featuresFromUnknown(value: unknown): Feature[] {
  return Array.isArray(value) ? (value as Feature[]) : []
}

function equipmentFromImport(content: ImportContent): Equipment[] {
  return (content.equipment ?? []).map((row, index) => {
    const rec = row as Record<string, unknown>
    return {
      ...row,
      id: String(rec.id ?? `eq-${index}`),
      name: String(rec.name ?? ""),
    } as Equipment
  })
}

function abilitiesFromImport(content: ImportContent): CustomAbility[] {
  const rows = [
    ...((content.abilities ?? []) as Record<string, unknown>[]),
    ...((content.import_proposals?.custom_abilities ?? []) as Record<string, unknown>[]),
  ]
  return rows.map((rec, index) => ({
    id: String(rec.id ?? rec.proposal_id ?? `ability-${index}`),
    name: String(rec.name ?? ""),
    description: String(rec.description ?? rec.definition ?? ""),
    prerequisites: (rec.prerequisite as string | null | undefined) ?? null,
    characteristics: null,
    linked_modifiers: (rec.linkedModifiers ?? rec.linked_modifiers) as CustomAbility["linked_modifiers"],
    attached_to_type: (rec.source_type as string | null | undefined) ?? null,
    attached_to_id: null,
    uses: (rec.uses as UsesConfig | null | undefined) ?? null,
    show_in_builder: true,
    casting_time: (rec.casting_time as string | null | undefined) ?? null,
    execution: (rec.execution as string | null | undefined) ?? null,
    ability_role: rec.ability_role as CustomAbility["ability_role"],
    icon: null,
    source: String(rec.source_name ?? rec.source ?? ""),
    creator_url: null,
    created_at: "",
    updated_at: "",
  }))
}

function resourceKeysFromImport(content: ImportContent, className: string): string[] {
  const rows = [
    ...(content.class_resources ?? []),
    ...(content.import_proposals?.class_resources ?? []),
  ]
  return rows
    .filter((row) => namesMatch(String(row.class_name ?? ""), className))
    .map((row) => String(row.resource_key ?? "").trim())
    .filter(Boolean)
}

function classResourcesForSheet(content: ImportContent, className: string) {
  const rows = [
    ...(content.class_resources ?? []),
    ...(content.import_proposals?.class_resources ?? []),
  ]
  return rows
    .filter((row) => namesMatch(String(row.class_name ?? ""), className))
    .map((row) => ({
      id: String(row.resource_key ?? ""),
      name: String(row.name ?? row.resource_key ?? ""),
      uses: row.uses as UsesConfig,
      subclassName: (row as { subclass_name?: string }).subclass_name ?? null,
    }))
}

function pushViolation(
  list: GrantedEquipmentViolation[],
  seen: Set<string>,
  row: GrantedEquipmentViolation,
) {
  const id = `${row.class}|${row.feature}|${row.level}|${row.item}|${row.kind}`
  if (seen.has(id)) return
  seen.add(id)
  list.push(row)
}

function auditGrantGroup(params: {
  className: string
  subclassName?: string | null
  features: Feature[]
  ownerId: string
  catalog: Equipment[]
  abilities: CustomAbility[]
  resourceKeys: string[]
  actions: { name: string }[]
  violations: GrantedEquipmentViolation[]
  grants: GrantedEquipmentGrantRow[]
  seen: Set<string>
  seenGrants: Set<string>
}) {
  const grants = collectGrantedEquipmentFromFeatures(
    params.features.map((feature) => ({ feature, ownerId: params.ownerId })),
  )
  if (!grants.length) return

  const holdings = resolveGrantedEquipmentHoldings(grants, params.catalog)
  const holdingByName = new Map(holdings.holdings.map((holding) => [holding.name.toLowerCase(), holding]))
  const plan = planEquipmentGrants({
    grants,
    catalog: params.catalog,
    equipmentIds: [],
    quantities: {},
    alreadyGrantedNames: [],
  })

  for (const feature of params.features) {
    const items = grantEquipmentNames(feature)
    if (!items.length) continue
    const label = featureLabel(feature.name, params.subclassName)
    const level = Number(feature.level) || 0

    for (const itemName of items) {
      const grantId = `${params.className}|${label}|${level}|${itemName}`
      if (!params.seenGrants.has(grantId)) {
        params.seenGrants.add(grantId)
        params.grants.push({
          class: params.className,
          feature: label,
          level,
          item: itemName,
        })
      }
      const holding: GrantedEquipmentHolding | undefined =
        holdingByName.get(itemName.toLowerCase()) ??
        plan?.holdings.find((row) => namesMatch(row.name, itemName))
      const grantedBy = holding?.grantedBy ?? grants.find((grant) => namesMatch(grant.name, itemName))?.grantedBy
      if (!grantedBy?.featureId || !grantedBy?.modifierId) {
        pushViolation(params.violations, params.seen, {
          class: params.className,
          feature: label,
          level,
          item: itemName,
          kind: "missing_granted_by",
        })
      }

      const equipment = params.catalog.find((row) => namesMatch(row.name, itemName))
      if (
        itemExpectsSheetAction({
          itemName,
          feature,
          equipment,
          abilities: params.abilities,
        }) &&
        !sheetActionsCoverItem(params.actions, itemName)
      ) {
        pushViolation(params.violations, params.seen, {
          class: params.className,
          feature: label,
          level,
          item: itemName,
          kind: "missing_sheet_action",
        })
      }

      const uses = limitedUsesForItem({
        itemName,
        equipment,
        abilities: params.abilities,
      })
      if (uses && isLooseUseCounter(uses, params.resourceKeys)) {
        pushViolation(params.violations, params.seen, {
          class: params.className,
          feature: label,
          level,
          item: itemName,
          kind: "loose_use_counter",
        })
      }
    }
  }
}

function collectActionsForClass(params: {
  className: string
  classFeatures: Feature[]
  subclassName?: string | null
  subclassFeatures?: Feature[]
  resources: ReturnType<typeof classResourcesForSheet>
  abilities: CustomAbility[]
}) {
  const classId = `class:${params.className}`
  const subclassId = params.subclassName ? `sub:${params.subclassName}` : null
  const entry = {
    row: { class_id: classId, level: 20, subclass_id: subclassId, order: 0 },
    class: {
      id: classId,
      name: params.className,
      features: params.classFeatures,
      class_resources: params.resources,
    },
    subclass: params.subclassName
      ? {
          id: subclassId,
          name: params.subclassName,
          class_id: classId,
          features: params.subclassFeatures ?? [],
        }
      : null,
  } as unknown as CharacterClassDetail

  return collectSheetActions({
    classDetails: [entry],
    species: null,
    customAbilities: params.abilities,
  })
}

export function auditGrantedEquipment(contents: readonly ImportContent[]): GrantedEquipmentAuditResult {
  const violations: GrantedEquipmentViolation[] = []
  const grants: GrantedEquipmentGrantRow[] = []
  const seen = new Set<string>()
  const seenGrants = new Set<string>()

  for (const content of contents) {
    const catalog = equipmentFromImport(content)
    const abilities = abilitiesFromImport(content)

    for (const cls of content.classes ?? []) {
      const className = String(cls.name ?? "").trim()
      if (!className) continue
      const classFeatures = featuresFromUnknown(cls.features)
      const resourceKeys = resourceKeysFromImport(content, className)
      const resources = classResourcesForSheet(content, className)
      const classOwnerId = `class:${className}`

      const classActions = collectActionsForClass({
        className,
        classFeatures,
        resources,
        abilities,
      })
      auditGrantGroup({
        className,
        features: classFeatures,
        ownerId: classOwnerId,
        catalog,
        abilities,
        resourceKeys,
        actions: classActions,
        violations,
        grants,
        seen,
        seenGrants,
      })

      for (const subclass of content.subclasses ?? []) {
        if (!namesMatch(String(subclass.class_name ?? ""), className)) continue
        const subclassName = String(subclass.name ?? "").trim() || "Subclass"
        const subclassFeatures = featuresFromUnknown(subclass.features)
        const actions = collectActionsForClass({
          className,
          classFeatures,
          subclassName,
          subclassFeatures,
          resources,
          abilities,
        })
        auditGrantGroup({
          className,
          subclassName,
          features: subclassFeatures,
          ownerId: `${classOwnerId}:subclass:${subclassName}`,
          catalog,
          abilities,
          resourceKeys,
          actions,
          violations,
          grants,
          seen,
          seenGrants,
        })
      }
    }
  }

  violations.sort((a, b) =>
    a.class.localeCompare(b.class) ||
    a.level - b.level ||
    a.feature.localeCompare(b.feature) ||
    a.item.localeCompare(b.item) ||
    a.kind.localeCompare(b.kind),
  )
  grants.sort((a, b) =>
    a.class.localeCompare(b.class) ||
    a.level - b.level ||
    a.feature.localeCompare(b.feature) ||
    a.item.localeCompare(b.item),
  )
  return { violations, grants }
}

export function auditMageHandPressGrantedEquipment(
  classNames?: readonly string[] | null,
): GrantedEquipmentAuditResult {
  const files = filterImportContentByClasses(loadMageHandPressPack().files, classNames)
  return auditGrantedEquipment(files.map((file) => enrichImportContentModifiers(file)))
}
