import { usesConfigForProgressionColumn } from "@/lib/import/parse-class-progression-table"
import { parseClassProgressionTable } from "@/lib/import/parse-class-progression-table"
import type { CompanionStatBlockTemplate } from "@/lib/character/companion-stat-block"
import { isCompanionStatBlockFeature } from "@/lib/character/companion-recognition"
import { parseCompanionStatBlock } from "@/lib/character/parse-companion-stat-block"
import type { ImportContent } from "@/lib/import/content-schema"
import type { ClassResourceImportRow } from "@/lib/import/enrich-import-classes"
import { THIRD_PARTY_RESOURCE_PATTERNS } from "@/lib/import/third-party-resources"
import { remapPointPoolResourceKey } from "@/lib/import/enrich-point-pool-resources"
import type { UsesConfig } from "@/lib/types"

export type ImportProposalSource = "ai" | "table" | "explicit" | "feature"

function normalizeProposalSourceType(
  sourceType: string | null | undefined,
): ImportProposalCustomAbility["sourceType"] {
  if (!sourceType) return null
  if (sourceType === "class_feature") return "class"
  if (sourceType === "subclass_feature") return "subclass"
  const allowed: ImportProposalCustomAbility["sourceType"][] = [
    "class",
    "subclass",
    "species",
    "background",
    "feat",
    "item",
  ]
  return allowed.includes(sourceType as ImportProposalCustomAbility["sourceType"])
    ? (sourceType as ImportProposalCustomAbility["sourceType"])
    : null
}

export type ImportProposalClassResource = {
  id: string
  className: string
  resourceKey: string
  name: string
  definition: string
  description: string | null
  uses: UsesConfig
  source: ImportProposalSource
}

export type ImportProposalCustomAbility = {
  id: string
  name: string
  definition: string
  description: string
  prerequisite?: string | null
  repeatable?: boolean
  sourceType: "class" | "subclass" | "species" | "background" | "feat" | "item" | null
  sourceName: string | null
  levelRequirement: number | null
  talentCount?: number
  choices?: import("@/lib/types").FeatureChoice | null
  abilityRole?: "discipline" | "psionic_power" | "talent_pool" | "knack" | "upgrade" | "bomb_formula" | "discovery" | "alchemist_bomb" | null
  psionic_augments?: import("@/lib/compendium/parse-psionic-augments").PsionicAugmentsConfig | null
  casting_time?: string | null
  range?: string | null
  components?: string[] | null
  duration?: string | null
  concentration?: boolean
  /** Class resource spent when activating (e.g. superiority_dice for maneuvers). */
  resourceKey?: string | null
  /** Parsed stat block for the Companions sheet tab. */
  companionStatBlock?: CompanionStatBlockTemplate | null
  source: ImportProposalSource
}

export type ImportProposalSet = {
  classResources: ImportProposalClassResource[]
  customAbilities: ImportProposalCustomAbility[]
}

export type ImportProposalSelections = {
  classResourceIds: string[]
  customAbilityIds: string[]
}

type AiProposalResource = {
  proposal_id?: string
  class_name: string
  resource_key: string
  name: string
  definition?: string
  description?: string | null
  uses: UsesConfig
}

type AiProposalAbility = {
  proposal_id?: string
  name: string
  definition?: string
  description: string
  prerequisite?: string | null
  repeatable?: boolean
  source_type?: ImportProposalCustomAbility["sourceType"]
  source_name?: string | null
  level_requirement?: number | null
  ability_role?: ImportProposalCustomAbility["abilityRole"]
  choices?: {
    category?: string
    count?: number
    options?: { name: string; description: string; prerequisite?: string | null; repeatable?: boolean }[]
  }
}

function slugId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function resourceProposalId(className: string, resourceKey: string): string {
  return `resource:${slugId(className)}:${slugId(resourceKey)}`
}

function abilityProposalId(name: string, sourceName: string | null): string {
  return `ability:${slugId(sourceName ?? "standalone")}:${slugId(name)}`
}

function defaultResourceDefinition(name: string, className: string): string {
  for (const pattern of THIRD_PARTY_RESOURCE_PATTERNS) {
    if (pattern.namePattern.test(name)) return pattern.definition
  }
  if (/psi\s*points?/i.test(name)) {
    return `Psionic energy pool for the ${className}. Powers and talents spend psi points; the pool typically recharges on short and long rests.`
  }
  if (/psi\s*limit/i.test(name)) {
    return `Maximum psi points the ${className} can spend on a single psionic use at each level (per-activation cap).`
  }
  if (/exploit\s*dice/i.test(name)) {
    return `Pool of exploit dice for ${className} martial techniques. Spent when activating exploits; typically recharges on a short rest.`
  }
  if (/exploit\s*die/i.test(name)) {
    return `Die size rolled when ${className} spends exploit dice — scales on the class level table.`
  }
  if (/superiority\s*dice/i.test(name)) {
    return `Pool of superiority dice for ${className} Battle Master maneuvers. Spent when activating a maneuver; recharges on a short rest.`
  }
  if (/psionic\s*energy\s*dice/i.test(name)) {
    return `Psionic energy dice pool for ${className} Psi Warrior powers. Regain one die on a short rest and all dice on a long rest.`
  }
  if (/risk\s*dice/i.test(name)) {
    return `Pool of risk dice for ${className} class features. Size and die type scale by level on the class table; typically recharges on short and long rests.`
  }
  if (/weapon\s*mastery/i.test(name)) {
    return `Number of weapon masteries the ${className} can apply, scaling by level on the class table.`
  }
  return `Level-scaling class resource for ${className}: ${name}.`
}

function collectClassText(row: Record<string, unknown>): string {
  const parts: string[] = []
  if (typeof row.description === "string") parts.push(row.description)
  const features = row.features
  if (Array.isArray(features)) {
    for (const raw of features) {
      const feature = raw as { description?: string }
      if (typeof feature.description === "string") parts.push(feature.description)
    }
  }
  return parts.join("\n\n")
}

function isDisciplineLikeFeature(feature: {
  name?: string
  description?: string
  isChoice?: boolean
  choices?: { category?: string; options?: unknown[] }
}): boolean {
  const name = feature.name ?? ""
  if (/\bdiscipline\b/i.test(name)) return true
  if (feature.isChoice && /\b(talent|discipline|power)\b/i.test(feature.choices?.category ?? name)) {
    return true
  }
  if (/\bprimary discipline\b/i.test(feature.description ?? "")) return true
  return false
}

function isMartialExploitLikeFeature(feature: {
  name?: string
  description?: string
  isChoice?: boolean
  choices?: { category?: string; options?: unknown[] }
}): boolean {
  const name = feature.name ?? ""
  if (/\b(?:martial\s+)?exploit\b/i.test(name)) return true
  if (feature.isChoice && /\bexploit/i.test(feature.choices?.category ?? name)) return true
  if (/\bexpend\s+(?:one|an?)\s+exploit\s+die\b/i.test(feature.description ?? "")) return true
  return false
}

const BATTLE_MASTER_FRAME_FEATURE = /^(?:combat superiority|improved combat superiority|ultimate combat superiority|relentless|student of war|know your enemy|maneuvers?|battle tactics)$/i

function isBattleMasterManeuverLikeFeature(feature: {
  name?: string
  description?: string
  isChoice?: boolean
  choices?: { category?: string; options?: unknown[] }
}): boolean {
  const name = (feature.name ?? "").trim()
  if (!name || BATTLE_MASTER_FRAME_FEATURE.test(name)) return false
  if (/\bmaneuvers?\b/i.test(name) && /\boptions?\b/i.test(name)) return false
  if (feature.isChoice && /\bmaneuver/i.test(feature.choices?.category ?? name)) return true
  if (/\bexpend\s+(?:one|an?)\s+superiority\s+die\b/i.test(feature.description ?? "")) return true
  if (/\bexpend\s+(?:one|an?)\s+superiority\s+dice\b/i.test(feature.description ?? "")) return true
  if (/\bexpend\s+(?:one|an?|a)\s+battle\s+die\b/i.test(feature.description ?? "")) return true
  return false
}

function maneuverResourceKey(feature: { description?: string }): string {
  if (/\bbattle\s+die\b/i.test(feature.description ?? "")) return "battle_dice"
  return "superiority_dice"
}

function maneuverDefinition(name: string, className: string, resourceKey: string): string {
  const resourceLabel = resourceKey === "battle_dice" ? "Battle Die" : "Superiority Die"
  return `${className} maneuver (${name}). Expend a ${resourceLabel} when you use this technique.`
}

function exploitDefinition(name: string, className: string): string {
  return `Martial exploit option for ${className}. Player-chosen technique fueled by exploit dice or similar resources.`
}

function companionDefinition(name: string, className: string): string {
  return `Companion or minion stat block for ${className} (${name}). Shown on the character sheet Companions tab when unlocked.`
}

function disciplineDefinition(
  name: string,
  className: string,
  talentCount?: number,
): string {
  const talentNote =
    talentCount != null && talentCount > 0
      ? ` Includes ${talentCount} selectable talent${talentCount === 1 ? "" : "s"}.`
      : ""
  return `Psionic discipline option for ${className}. Disciplines are player-chosen ability packages with point-cost talents.${talentNote}`
}

function innatePsionicsDefinition(name: string, className: string): string {
  return `${name} for ${className}. Innate psionic options detected from class features — import as a custom ability placeholder; full builder wiring is deferred until confirmed.`
}

function isInnatePsionicsFeature(feature: {
  name?: string
  description?: string
}): boolean {
  const name = feature.name ?? ""
  if (/\binnate\s+psionic/i.test(name)) return true
  if (/\binnate\s+psionic/i.test(feature.description ?? "")) return true
  return false
}

function pushResource(
  list: ImportProposalClassResource[],
  seen: Set<string>,
  resource: Omit<ImportProposalClassResource, "id"> & { id?: string },
) {
  const id = resource.id ?? resourceProposalId(resource.className, resource.resourceKey)
  if (seen.has(id)) return
  seen.add(id)
  list.push({ ...resource, id })
}

function pushAbility(
  list: ImportProposalCustomAbility[],
  seen: Set<string>,
  ability: Omit<ImportProposalCustomAbility, "id"> & { id?: string },
) {
  const id = ability.id ?? abilityProposalId(ability.name, ability.sourceName)
  if (seen.has(id)) return
  seen.add(id)
  list.push({ ...ability, id })
}

function collectFromAiProposals(content: ImportContent): ImportProposalSet {
  const classResources: ImportProposalClassResource[] = []
  const customAbilities: ImportProposalCustomAbility[] = []
  const seenResources = new Set<string>()
  const seenAbilities = new Set<string>()

  const raw = content.import_proposals as
    | {
        class_resources?: AiProposalResource[]
        custom_abilities?: AiProposalAbility[]
      }
    | undefined

  for (const resource of raw?.class_resources ?? []) {
    pushResource(classResources, seenResources, {
      id: resource.proposal_id
        ? `resource:${slugId(resource.proposal_id)}`
        : undefined,
      className: resource.class_name,
      resourceKey: resource.resource_key,
      name: resource.name,
      definition:
        resource.definition?.trim() ||
        defaultResourceDefinition(resource.name, resource.class_name),
      description: resource.description ?? null,
      uses: resource.uses,
      source: "ai",
    })
  }

  for (const ability of raw?.custom_abilities ?? []) {
    if (
      (ability.ability_role === "knack" || /\bknack/i.test(ability.choices?.category ?? "")) &&
      ability.choices?.options?.length
    ) {
      for (const option of ability.choices.options) {
        pushAbility(customAbilities, seenAbilities, {
          id: ability.proposal_id
            ? `ability:${slugId(ability.proposal_id)}:${slugId(option.name)}`
            : undefined,
          name: option.name,
          definition:
            ability.definition?.trim() ||
            `${option.name} knack for ${ability.source_name ?? "this class"}.`,
          description: option.description,
          prerequisite: option.prerequisite ?? ability.prerequisite ?? null,
          repeatable: option.repeatable ?? ability.repeatable ?? false,
          sourceType: normalizeProposalSourceType(ability.source_type),
          sourceName: ability.source_name ?? null,
          levelRequirement: ability.level_requirement ?? null,
          abilityRole: "knack",
          source: "ai",
        })
      }
      continue
    }

    if (
      (ability.ability_role === "upgrade" || /\bupgrade\b/i.test(ability.choices?.category ?? "")) &&
      ability.choices?.options?.length
    ) {
      for (const option of ability.choices.options) {
        pushAbility(customAbilities, seenAbilities, {
          id: ability.proposal_id
            ? `ability:${slugId(ability.proposal_id)}:${slugId(option.name)}`
            : undefined,
          name: option.name,
          definition:
            ability.definition?.trim() ||
            `${option.name} upgrade for ${ability.source_name ?? "this class"}.`,
          description: option.description,
          prerequisite: option.prerequisite ?? ability.prerequisite ?? null,
          repeatable: option.repeatable ?? ability.repeatable ?? false,
          sourceType: normalizeProposalSourceType(ability.source_type),
          sourceName: ability.source_name ?? null,
          levelRequirement: ability.level_requirement ?? null,
          abilityRole: "upgrade",
          source: "ai",
        })
      }
      continue
    }

    if (
      (ability.ability_role === "bomb_formula" ||
        /\bbomb formula\b/i.test(ability.choices?.category ?? "")) &&
      ability.choices?.options?.length
    ) {
      for (const option of ability.choices.options) {
        pushAbility(customAbilities, seenAbilities, {
          id: ability.proposal_id
            ? `ability:${slugId(ability.proposal_id)}:${slugId(option.name)}`
            : undefined,
          name: option.name,
          definition:
            ability.definition?.trim() ||
            `${option.name} bomb formula for ${ability.source_name ?? "this class"}.`,
          description: option.description,
          prerequisite: option.prerequisite ?? ability.prerequisite ?? null,
          repeatable: option.repeatable ?? ability.repeatable ?? false,
          sourceType: normalizeProposalSourceType(ability.source_type),
          sourceName: ability.source_name ?? null,
          levelRequirement: ability.level_requirement ?? null,
          abilityRole: "bomb_formula",
          source: "ai",
        })
      }
      continue
    }

    if (
      (ability.ability_role === "discovery" || /\bdiscovery\b/i.test(ability.choices?.category ?? "")) &&
      ability.choices?.options?.length
    ) {
      for (const option of ability.choices.options) {
        pushAbility(customAbilities, seenAbilities, {
          id: ability.proposal_id
            ? `ability:${slugId(ability.proposal_id)}:${slugId(option.name)}`
            : undefined,
          name: option.name,
          definition:
            ability.definition?.trim() ||
            `${option.name} discovery for ${ability.source_name ?? "this class"}.`,
          description: option.description,
          prerequisite: option.prerequisite ?? ability.prerequisite ?? null,
          repeatable: option.repeatable ?? ability.repeatable ?? false,
          sourceType: normalizeProposalSourceType(ability.source_type),
          sourceName: ability.source_name ?? null,
          levelRequirement: ability.level_requirement ?? null,
          abilityRole: "discovery",
          source: "ai",
        })
      }
      continue
    }

    const talentCount = ability.choices?.options?.length
    pushAbility(customAbilities, seenAbilities, {
      id: ability.proposal_id ? `ability:${slugId(ability.proposal_id)}` : undefined,
      name: ability.name,
      definition:
        ability.definition?.trim() ||
        disciplineDefinition(ability.name, ability.source_name ?? "this class", talentCount),
      description: ability.description,
      prerequisite: ability.prerequisite ?? null,
      repeatable: ability.repeatable ?? false,
      sourceType: normalizeProposalSourceType(ability.source_type),
      sourceName: ability.source_name ?? null,
      levelRequirement: ability.level_requirement ?? null,
      talentCount,
      choices: ability.choices as import("@/lib/types").FeatureChoice | undefined,
      abilityRole:
        ability.ability_role ??
        (/\bknack\b/i.test(ability.choices?.category ?? ability.name)
          ? "knack"
          : /\bpower\b/i.test(ability.name)
            ? "psionic_power"
            : /\btalent/i.test(ability.choices?.category ?? ability.name)
              ? "talent_pool"
              : "discipline"),
      source: "ai",
    })
  }

  return { classResources, customAbilities }
}

function collectExplicitResources(
  content: ImportContent,
  into: ImportProposalSet,
  seenResources: Set<string>,
) {
  for (const resource of (content.class_resources ?? []) as ClassResourceImportRow[]) {
    pushResource(into.classResources, seenResources, {
      className: resource.class_name,
      resourceKey: resource.resource_key,
      name: resource.name,
      definition:
        resource.description?.trim() ||
        defaultResourceDefinition(resource.name, resource.class_name),
      description: resource.description ?? null,
      uses: resource.uses,
      source: "explicit",
    })
  }
}

function collectTableResources(
  content: ImportContent,
  into: ImportProposalSet,
  seenResources: Set<string>,
) {
  for (const classRow of content.classes ?? []) {
    const className = classRow.name
    const parsed = parseClassProgressionTable(collectClassText(classRow as unknown as Record<string, unknown>))
    if (!parsed) continue

    for (const column of parsed.columns) {
      pushResource(into.classResources, seenResources, {
        className,
        resourceKey: remapPointPoolResourceKey(className, column.resourceKey),
        name: column.resourceName,
        definition: defaultResourceDefinition(column.resourceName, className),
        description: `${column.resourceName} progression parsed from the ${className} level table.`,
        uses: usesConfigForProgressionColumn(column, className),
        source: "table",
      })
    }
  }
}

function collectTextDerivedResources(
  content: ImportContent,
  into: ImportProposalSet,
  seenResources: Set<string>,
) {
  for (const classRow of content.classes ?? []) {
    const className = classRow.name
    const text = collectClassText(classRow as unknown as Record<string, unknown>)
    if (!text) continue
    for (const pattern of THIRD_PARTY_RESOURCE_PATTERNS) {
      if (!pattern.proposeFromText || !pattern.textProposalUses) continue
      if (!pattern.namePattern.test(text)) continue
      pushResource(into.classResources, seenResources, {
        className,
        resourceKey: remapPointPoolResourceKey(className, pattern.resourceKey),
        name: pattern.displayName,
        definition: pattern.definition,
        description: `${pattern.displayName} for ${className} (detected from class description).`,
        uses: pattern.textProposalUses,
        source: "feature",
      })
    }
  }
}

function collectDisciplineFeatures(
  content: ImportContent,
  into: ImportProposalSet,
  seenAbilities: Set<string>,
) {
  const scanFeatures = (
    features: { level: number; name: string; description: string; isChoice?: boolean; choices?: { category?: string; options?: { name: string; description: string }[] } }[] | undefined,
    sourceType: ImportProposalCustomAbility["sourceType"],
    sourceName: string,
  ) => {
    for (const feature of features ?? []) {
      if (!isDisciplineLikeFeature(feature)) continue
      const talentCount = feature.choices?.options?.length
      pushAbility(into.customAbilities, seenAbilities, {
        name: feature.name,
        definition: disciplineDefinition(feature.name, sourceName, talentCount),
        description: feature.description,
        sourceType,
        sourceName,
        levelRequirement: feature.level,
        talentCount,
        choices: feature.choices as import("@/lib/types").FeatureChoice | undefined,
        abilityRole: "discipline",
        source: "feature",
      })
    }
  }

  for (const classRow of content.classes ?? []) {
    scanFeatures(classRow.features, "class", classRow.name)
  }
  for (const subclass of content.subclasses ?? []) {
    scanFeatures(subclass.features, "subclass", subclass.name)
  }
}

function collectMartialExploitFeatures(
  content: ImportContent,
  into: ImportProposalSet,
  seenAbilities: Set<string>,
) {
  const scanFeatures = (
    features: { level: number; name: string; description: string; isChoice?: boolean; choices?: { category?: string; options?: { name: string; description: string }[] } }[] | undefined,
    sourceType: ImportProposalCustomAbility["sourceType"],
    sourceName: string,
  ) => {
    for (const feature of features ?? []) {
      if (!isMartialExploitLikeFeature(feature)) continue
      const optionCount = feature.choices?.options?.length
      pushAbility(into.customAbilities, seenAbilities, {
        name: feature.name,
        definition: exploitDefinition(feature.name, sourceName),
        description: feature.description,
        sourceType,
        sourceName,
        levelRequirement: feature.level,
        talentCount: optionCount,
        source: "feature",
      })
    }
  }

  for (const classRow of content.classes ?? []) {
    scanFeatures(classRow.features, "class", classRow.name)
  }
  for (const subclass of content.subclasses ?? []) {
    scanFeatures(subclass.features, "subclass", subclass.name)
  }
}

function collectBattleMasterManeuverFeatures(
  content: ImportContent,
  into: ImportProposalSet,
  seenAbilities: Set<string>,
) {
  const scanFeatures = (
    features: { level: number; name: string; description: string; isChoice?: boolean; choices?: { category?: string; options?: { name: string; description: string }[] } }[] | undefined,
    sourceType: ImportProposalCustomAbility["sourceType"],
    sourceName: string,
  ) => {
    for (const feature of features ?? []) {
      if (!isBattleMasterManeuverLikeFeature(feature)) continue
      const optionCount = feature.choices?.options?.length
      const resourceKey = maneuverResourceKey(feature)
      pushAbility(into.customAbilities, seenAbilities, {
        name: feature.name,
        definition: maneuverDefinition(feature.name, sourceName, resourceKey),
        description: feature.description,
        sourceType,
        sourceName,
        levelRequirement: feature.level,
        talentCount: optionCount,
        source: "feature",
        resourceKey,
      })
    }
  }

  for (const classRow of content.classes ?? []) {
    scanFeatures(classRow.features, "class", classRow.name)
  }
  for (const subclass of content.subclasses ?? []) {
    scanFeatures(subclass.features, "subclass", subclass.name)
  }

  for (const ability of content.abilities ?? []) {
    if (!isBattleMasterManeuverLikeFeature(ability)) continue
    const resourceKey = maneuverResourceKey(ability)
    pushAbility(into.customAbilities, seenAbilities, {
      name: ability.name,
      definition: maneuverDefinition(ability.name, ability.source_name ?? "this class", resourceKey),
      description: ability.description,
      sourceType: normalizeProposalSourceType(ability.source_type),
      sourceName: ability.source_name ?? null,
      levelRequirement: ability.level_requirement ?? null,
      source: "explicit",
      resourceKey,
    })
  }
}

function collectCompanionStatBlockFeatures(
  content: ImportContent,
  into: ImportProposalSet,
  seenAbilities: Set<string>,
) {
  const scanFeatures = (
    features: { level: number; name: string; description: string }[] | undefined,
    sourceType: ImportProposalCustomAbility["sourceType"],
    sourceName: string,
  ) => {
    for (const feature of features ?? []) {
      if (!isCompanionStatBlockFeature(feature)) continue
      pushAbility(into.customAbilities, seenAbilities, {
        name: feature.name,
        definition: companionDefinition(feature.name, sourceName),
        description: feature.description,
        sourceType,
        sourceName,
        levelRequirement: feature.level,
        companionStatBlock: parseCompanionStatBlock(feature.name, feature.description),
        source: "feature",
      })
    }
  }

  for (const classRow of content.classes ?? []) {
    scanFeatures(classRow.features, "class", classRow.name)
  }
  for (const subclass of content.subclasses ?? []) {
    scanFeatures(subclass.features, "subclass", subclass.name)
  }
}

function collectInnatePsionicsFeatures(
  content: ImportContent,
  into: ImportProposalSet,
  seenAbilities: Set<string>,
) {
  const scanFeatures = (
    features: { level: number; name: string; description: string; isChoice?: boolean; choices?: { category?: string; options?: { name: string; description: string }[] } }[] | undefined,
    sourceType: ImportProposalCustomAbility["sourceType"],
    sourceName: string,
  ) => {
    for (const feature of features ?? []) {
      if (!isInnatePsionicsFeature(feature)) continue
      pushAbility(into.customAbilities, seenAbilities, {
        name: feature.name,
        definition: innatePsionicsDefinition(feature.name, sourceName),
        description: feature.description,
        sourceType,
        sourceName,
        levelRequirement: feature.level,
        choices: feature.choices as import("@/lib/types").FeatureChoice | undefined,
        abilityRole: "talent_pool",
        source: "feature",
      })
    }
  }

  for (const classRow of content.classes ?? []) {
    scanFeatures(classRow.features, "class", classRow.name)
  }
  for (const subclass of content.subclasses ?? []) {
    scanFeatures(subclass.features, "subclass", subclass.name)
  }
}

function collectExplicitAbilities(
  content: ImportContent,
  into: ImportProposalSet,
  seenAbilities: Set<string>,
) {
  for (const ability of content.abilities ?? []) {
    const companionStatBlock = parseCompanionStatBlock(ability.name, ability.description)
    pushAbility(into.customAbilities, seenAbilities, {
      name: ability.name,
      definition: `Custom builder ability from ${ability.source_name ?? "imported content"}.`,
      description: ability.description,
      sourceType: normalizeProposalSourceType(ability.source_type),
      sourceName: ability.source_name,
      levelRequirement: ability.level_requirement,
      companionStatBlock,
      source: "explicit",
    })
  }
}

/** Collect class resources and custom abilities that should be confirmed before creation. */
export function collectImportProposals(content: ImportContent): ImportProposalSet {
  const result: ImportProposalSet = { classResources: [], customAbilities: [] }
  const seenResources = new Set<string>()
  const seenAbilities = new Set<string>()

  collectExplicitResources(content, result, seenResources)
  collectTableResources(content, result, seenResources)
  collectTextDerivedResources(content, result, seenResources)

  const fromAi = collectFromAiProposals(content)
  for (const resource of fromAi.classResources) {
    pushResource(result.classResources, seenResources, resource)
  }
  for (const ability of fromAi.customAbilities) {
    pushAbility(result.customAbilities, seenAbilities, ability)
  }

  collectDisciplineFeatures(content, result, seenAbilities)
  collectInnatePsionicsFeatures(content, result, seenAbilities)
  collectMartialExploitFeatures(content, result, seenAbilities)
  collectBattleMasterManeuverFeatures(content, result, seenAbilities)
  collectCompanionStatBlockFeatures(content, result, seenAbilities)
  collectExplicitAbilities(content, result, seenAbilities)

  return result
}

export function importProposalsNeedConfirmation(proposals: ImportProposalSet): boolean {
  return proposals.classResources.length > 0 || proposals.customAbilities.length > 0
}

export function defaultProposalSelections(proposals: ImportProposalSet): ImportProposalSelections {
  return {
    classResourceIds: proposals.classResources.map((row) => row.id),
    customAbilityIds: proposals.customAbilities.map((row) => row.id),
  }
}

/** Remove proposal-backed rows from content until the user confirms import. */
export function stripProposalBackedContent(content: ImportContent): ImportContent {
  const { import_proposals: _proposals, class_resources: _resources, abilities: _abilities, ...rest } =
    content
  return rest
}

export function applyProposalSelections(
  content: ImportContent,
  proposals: ImportProposalSet,
  selections: ImportProposalSelections,
): ImportContent {
  const selectedResources = proposals.classResources.filter((row) =>
    selections.classResourceIds.includes(row.id),
  )
  const selectedAbilities = proposals.customAbilities.filter((row) =>
    selections.customAbilityIds.includes(row.id),
  )

  const classResources: ClassResourceImportRow[] = selectedResources.map((row) => ({
    class_name: row.className,
    resource_key: row.resourceKey,
    name: row.name,
    description: row.description,
    uses: row.uses,
  }))

  const abilities = selectedAbilities.map((row) => ({
    name: row.name,
    description: row.description,
    prerequisite: row.prerequisite ?? null,
    repeatable: row.repeatable ?? false,
    source_type: row.sourceType,
    source_name: row.sourceName,
    level_requirement: row.levelRequirement,
    companion_stat_block: row.companionStatBlock ?? null,
    ...(row.choices ? { isChoice: true, choices: row.choices } : {}),
    ...(row.abilityRole ? { ability_role: row.abilityRole } : {}),
    ...(row.psionic_augments ? { psionic_augments: row.psionic_augments } : {}),
    ...(row.casting_time ? { casting_time: row.casting_time } : {}),
    ...(row.range ? { range: row.range } : {}),
    ...(row.components ? { components: row.components } : {}),
    ...(row.duration ? { duration: row.duration } : {}),
    ...(row.concentration ? { concentration: row.concentration } : {}),
  }))

  const base = stripProposalBackedContent(content)

  return {
    ...base,
    ...(classResources.length ? { class_resources: classResources } : {}),
    ...(abilities.length ? { abilities } : {}),
  } as unknown as ImportContent
}
