import { usesConfigForProgressionColumn } from "@/lib/import/parse-class-progression-table"
import { parseClassProgressionTable } from "@/lib/import/parse-class-progression-table"
import type { ImportContent } from "@/lib/import/content-schema"
import type { ClassResourceImportRow } from "@/lib/import/enrich-import-classes"
import { THIRD_PARTY_RESOURCE_PATTERNS } from "@/lib/import/third-party-resources"
import type { UsesConfig } from "@/lib/types"

export type ImportProposalSource = "ai" | "table" | "explicit" | "feature"

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
  sourceType: "class" | "subclass" | "species" | "background" | "feat" | "item" | null
  sourceName: string | null
  levelRequirement: number | null
  talentCount?: number
  /** Class resource spent when activating (e.g. superiority_dice for maneuvers). */
  resourceKey?: string | null
  /** Stat-block companion/minion (Steel Defender, Eldritch Cannon, etc.) for future sheet tab. */
  companionStatBlock?: boolean
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
  source_type?: ImportProposalCustomAbility["sourceType"]
  source_name?: string | null
  level_requirement?: number | null
  choices?: {
    category?: string
    count?: number
    options?: { name: string; description: string }[]
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

const BATTLE_MASTER_FRAME_FEATURE = /^(?:combat superiority|improved combat superiority|ultimate combat superiority|relentless|student of war|know your enemy|maneuvers?)$/i

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
  return false
}

function exploitDefinition(name: string, className: string): string {
  return `Martial exploit option for ${className}. Player-chosen technique fueled by exploit dice or similar resources.`
}

function maneuverDefinition(name: string, className: string): string {
  return `Battle Master maneuver for ${className}. Expend a Superiority Die when you use this technique (one maneuver per attack).`
}

const COMPANION_FRAME_FEATURES =
  /^(?:steel defender|reanimated companion|eldritch cannon|primal companion|wild companion|spirit companion)$/i

function isCompanionStatBlockFeature(feature: {
  name?: string
  description?: string
}): boolean {
  const name = (feature.name ?? "").trim()
  if (COMPANION_FRAME_FEATURES.test(name)) return true
  const desc = feature.description ?? ""
  if (/Medium (?:Construct|Undead)|Small or Tiny Object/im.test(desc) && /\bActions\b/i.test(desc)) {
    return true
  }
  if (/\b(?:Force-Empowered Rend|Dreadful Swipe|Activate Cannon)\b/i.test(desc)) return true
  return false
}

function companionDefinition(name: string, className: string): string {
  return `Companion or minion stat block for ${className} (${name}). Intended for a dedicated companion sheet tab when available.`
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
    const talentCount = ability.choices?.options?.length
    pushAbility(customAbilities, seenAbilities, {
      id: ability.proposal_id ? `ability:${slugId(ability.proposal_id)}` : undefined,
      name: ability.name,
      definition:
        ability.definition?.trim() ||
        disciplineDefinition(ability.name, ability.source_name ?? "this class", talentCount),
      description: ability.description,
      sourceType: ability.source_type ?? null,
      sourceName: ability.source_name ?? null,
      levelRequirement: ability.level_requirement ?? null,
      talentCount,
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
    const parsed = parseClassProgressionTable(collectClassText(classRow as Record<string, unknown>))
    if (!parsed) continue

    for (const column of parsed.columns) {
      pushResource(into.classResources, seenResources, {
        className,
        resourceKey: column.resourceKey,
        name: column.resourceName,
        definition: defaultResourceDefinition(column.resourceName, className),
        description: `${column.resourceName} progression parsed from the ${className} level table.`,
        uses: usesConfigForProgressionColumn(column, className),
        source: "table",
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
      pushAbility(into.customAbilities, seenAbilities, {
        name: feature.name,
        definition: maneuverDefinition(feature.name, sourceName),
        description: feature.description,
        sourceType,
        sourceName,
        levelRequirement: feature.level,
        talentCount: optionCount,
        source: "feature",
        resourceKey: "superiority_dice",
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
        companionStatBlock: true,
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
    pushAbility(into.customAbilities, seenAbilities, {
      name: ability.name,
      definition: `Custom builder ability from ${ability.source_name ?? "imported content"}.`,
      description: ability.description,
      sourceType: ability.source_type,
      sourceName: ability.source_name,
      levelRequirement: ability.level_requirement,
      source: "explicit",
    })
  }
}

/** Collect class resources and custom abilities that should be confirmed before creation. */
export function collectImportProposals(content: ImportContent): ImportProposalSet {
  const fromAi = collectFromAiProposals(content)
  const seenResources = new Set(fromAi.classResources.map((row) => row.id))
  const seenAbilities = new Set(fromAi.customAbilities.map((row) => row.id))

  collectExplicitResources(content, fromAi, seenResources)
  collectTableResources(content, fromAi, seenResources)
  collectDisciplineFeatures(content, fromAi, seenAbilities)
  collectMartialExploitFeatures(content, fromAi, seenAbilities)
  collectBattleMasterManeuverFeatures(content, fromAi, seenAbilities)
  collectCompanionStatBlockFeatures(content, fromAi, seenAbilities)
  collectExplicitAbilities(content, fromAi, seenAbilities)

  return fromAi
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
    source_type: row.sourceType,
    source_name: row.sourceName,
    level_requirement: row.levelRequirement,
  }))

  const base = stripProposalBackedContent(content)

  return {
    ...base,
    ...(classResources.length ? { class_resources: classResources } : {}),
    ...(abilities.length ? { abilities } : {}),
  }
}
