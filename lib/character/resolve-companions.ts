import type { CharacterClassDetail } from "@/lib/character/character-classes"
import {
  companionKey,
  resolveCompanion,
  type CharacterCompanionState,
  type CompanionResolveContext,
  type CompanionSource,
  type CompanionStatBlockTemplate,
  type ResolvedCompanion,
} from "@/lib/character/companion-stat-block"
import { isCompanionStatBlockFeature } from "@/lib/character/companion-recognition"
import { templateFromFeature } from "@/lib/character/parse-companion-stat-block"
import { SRD_BEAST_FORMS, isDruidWildShapeFeature } from "@/lib/character/srd-beast-forms"
import { SRD_FAMILIAR, isFamiliarFeature } from "@/lib/character/srd-familiar"
import {
  creatureNamesFromAbility,
  creatureNamesFromFeature,
} from "@/lib/compendium/grant-creature-catalog"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import type { Creature, CustomAbility, Feature } from "@/lib/types"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"

type FeatureCarrier = {
  level: number
  name: string
  description: string
  companion_stat_block?: CompanionStatBlockTemplate | null
  companion_stat_blocks?: CompanionStatBlockTemplate[] | null
  companion_creature_names?: string[] | null
  linkedModifiers?: LinkedModifierInstance[] | null
  modifierRefs?: string[] | null
}

function normalizeCreatureName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

/** Build a name → stat-block lookup from compendium creature rows. */
export function buildCreatureTemplateLookup(
  creatures: Creature[] | undefined,
): Map<string, CompanionStatBlockTemplate> {
  const lookup = new Map<string, CompanionStatBlockTemplate>()
  for (const creature of creatures ?? []) {
    const template = creature.stat_block
    if (!template || !creature.name?.trim()) continue
    lookup.set(normalizeCreatureName(creature.name), { ...template, name: creature.name })
  }
  return lookup
}

function scanFeatures(
  features: FeatureCarrier[] | undefined,
  ctx: {
    classId: string
    className: string
    subclassId?: string | null
    subclassName?: string | null
    maxLevel: number
  },
  into: { source: CompanionSource; template: CompanionStatBlockTemplate }[],
  creatureLookup?: Map<string, CompanionStatBlockTemplate>,
  modifierCatalog: ModifierCatalogEntry[] = [],
) {
  const baseSource = (featureName: string, featureLevel: number): CompanionSource => ({
    featureName,
    featureLevel,
    className: ctx.className,
    subclassName: ctx.subclassName ?? null,
    classId: ctx.classId,
    subclassId: ctx.subclassId ?? null,
  })

  for (const feature of features ?? []) {
    if (feature.level > ctx.maxLevel) continue

    // Compendium creatures linked by name or grant_creature modifiers.
    const linkedNames = creatureNamesFromFeature(feature as Feature, modifierCatalog)
    const linkedCreatures = collectLinkedCreatureTemplates(linkedNames, creatureLookup)

    // SRD Druid Beast forms (Rat, Riding Horse, Spider, Wolf) populate from Wild Shape.
    const forms: CompanionStatBlockTemplate[] = [
      ...linkedCreatures,
      ...(feature.companion_stat_blocks ?? []),
    ]
    if (!forms.length && isDruidWildShapeFeature(ctx.className, feature.name)) {
      forms.push(...SRD_BEAST_FORMS)
    }
    // Find Familiar reskins (Druid Wild Companion, Warlock Pact of the Chain).
    if (!forms.length && !feature.companion_stat_block && isFamiliarFeature(ctx.className, feature.name)) {
      into.push({ source: baseSource(feature.name, feature.level), template: SRD_FAMILIAR })
      continue
    }
    if (forms.length) {
      for (const template of forms) {
        into.push({
          source: { ...baseSource(feature.name, feature.level), formName: template.name },
          template,
        })
      }
      continue
    }

    if (!isCompanionStatBlockFeature(feature)) continue
    const template = templateFromFeature(feature)
    if (!template) continue
    into.push({ source: baseSource(feature.name, feature.level), template })
  }
}

/** Resolve feature/ability creature-name references against the compendium lookup. */
function collectLinkedCreatureTemplates(
  names: string[] | null | undefined,
  lookup: Map<string, CompanionStatBlockTemplate> | undefined,
): CompanionStatBlockTemplate[] {
  if (!names?.length || !lookup?.size) return []
  const out: CompanionStatBlockTemplate[] = []
  for (const name of names) {
    const template = lookup.get(normalizeCreatureName(name))
    if (template) out.push(template)
  }
  return out
}

export function collectCompanionCandidatesFromClasses(
  classDetails: CharacterClassDetail[],
  creatureLookup?: Map<string, CompanionStatBlockTemplate>,
  modifierCatalog: ModifierCatalogEntry[] = [],
): { source: CompanionSource; template: CompanionStatBlockTemplate }[] {
  const found: { source: CompanionSource; template: CompanionStatBlockTemplate }[] = []

  for (const entry of classDetails) {
    const className = entry.class?.name ?? "Class"
    scanFeatures(entry.class?.features as FeatureCarrier[] | undefined, {
      classId: entry.row.class_id,
      className,
      maxLevel: entry.row.level,
    }, found, creatureLookup, modifierCatalog)

    if (entry.subclass) {
      scanFeatures(entry.subclass.features as FeatureCarrier[] | undefined, {
        classId: entry.row.class_id,
        className,
        subclassId: entry.subclass.id,
        subclassName: entry.subclass.name,
        maxLevel: entry.row.level,
      }, found, creatureLookup, modifierCatalog)
    }
  }

  const byKey = new Map<string, { source: CompanionSource; template: CompanionStatBlockTemplate }>()
  for (const row of found) {
    byKey.set(companionKey(row.source), row)
  }
  return [...byKey.values()]
}

export function collectCompanionCandidatesFromAbilities(
  abilities: CustomAbility[],
  creatureLookup?: Map<string, CompanionStatBlockTemplate>,
  modifierCatalog: ModifierCatalogEntry[] = [],
): { source: CompanionSource; template: CompanionStatBlockTemplate }[] {
  const out: { source: CompanionSource; template: CompanionStatBlockTemplate }[] = []

  for (const ability of abilities) {
    const row = ability as CustomAbility & {
      companion_stat_block?: CompanionStatBlockTemplate | null
      companion_stat_blocks?: CompanionStatBlockTemplate[] | null
      companion_creature_names?: string[] | null
    }
    const baseSource: CompanionSource = {
      featureName: ability.name,
      featureLevel: 1,
      className:
        ability.attached_to_type === "class" ? ability.attached_to_id ?? "Custom" : "Custom Ability",
      subclassName: null,
      classId: ability.attached_to_id ?? ability.id,
      subclassId: null,
    }

    const forms = [
      ...collectLinkedCreatureTemplates(
        creatureNamesFromAbility(ability, modifierCatalog),
        creatureLookup,
      ),
      ...(row.companion_stat_blocks ?? []),
    ]
    if (forms.length) {
      for (const template of forms) {
        out.push({ source: { ...baseSource, formName: template.name }, template })
      }
      continue
    }

    const hasSingle =
      Boolean(row.companion_stat_block) ||
      isCompanionStatBlockFeature({ name: ability.name, description: ability.description ?? "" })
    if (!hasSingle) continue

    const template =
      row.companion_stat_block ??
      templateFromFeature({ name: ability.name, description: ability.description ?? "" })
    out.push({
      source: baseSource,
      template:
        template ?? {
          name: ability.name,
          ac: { parts: [{ type: "fixed", value: 10 }] },
          hp: { parts: [{ type: "fixed", value: 1 }] },
          traits: [],
          actions: [],
        },
    })
  }

  return out
}

export function resolveCharacterCompanions(params: {
  classDetails: CharacterClassDetail[]
  customAbilities?: CustomAbility[]
  ctx: CompanionResolveContext
  /** Source for a familiar granted by the Find Familiar spell (e.g. a Wizard who knows it). */
  findFamiliarSpellSource?: { className: string; classId: string; subclassId?: string | null } | null
  /** Compendium creatures available to resolve name-linked companions. */
  creatures?: Creature[]
  /** Modifier catalog for resolving grant_creature linked modifiers. */
  modifierCatalog?: ModifierCatalogEntry[]
}): ResolvedCompanion[] {
  const creatureLookup = buildCreatureTemplateLookup(params.creatures)
  const catalog = params.modifierCatalog ?? []
  const candidates = [
    ...collectCompanionCandidatesFromClasses(params.classDetails, creatureLookup, catalog),
    ...collectCompanionCandidatesFromAbilities(params.customAbilities ?? [], creatureLookup, catalog),
  ]

  // A caster who knows Find Familiar gets the familiar too, unless a feature
  // (Wild Companion, Pact of the Chain) already provided one.
  const hasFamiliar = candidates.some((row) => row.template.name === SRD_FAMILIAR.name)
  if (params.findFamiliarSpellSource && !hasFamiliar) {
    candidates.push({
      source: {
        featureName: "Find Familiar",
        featureLevel: 1,
        className: params.findFamiliarSpellSource.className,
        subclassName: null,
        classId: params.findFamiliarSpellSource.classId,
        subclassId: params.findFamiliarSpellSource.subclassId ?? null,
      },
      template: SRD_FAMILIAR,
    })
  }

  const byKey = new Map<string, ResolvedCompanion>()
  for (const row of candidates) {
    const resolved = resolveCompanion(row.template, row.source, params.ctx)
    byKey.set(resolved.key, resolved)
  }
  return [...byKey.values()]
}

export function mergeCompanionState(
  companions: ResolvedCompanion[],
  saved: CharacterCompanionState[] | null | undefined,
): Array<
  ResolvedCompanion & {
    currentHp: number
    displayName: string
    activeConditions: string[]
    polymorphActive: boolean
  }
> {
  const stateByKey = new Map((saved ?? []).map((row) => [row.key, row]))
  return companions.map((companion) => {
    const state = stateByKey.get(companion.key)
    const currentHp = state?.currentHp ?? companion.maxHp
    return {
      ...companion,
      currentHp: Math.min(Math.max(0, currentHp), companion.maxHp),
      displayName: state?.customName?.trim() || companion.template.name,
      activeConditions: state?.activeConditions ?? [],
      polymorphActive: state?.polymorphActive ?? false,
    }
  })
}

export function companionStateFromResolved(
  companions: Array<
    ResolvedCompanion & {
      currentHp: number
      displayName: string
      activeConditions?: string[]
      polymorphActive?: boolean
    }
  >,
): CharacterCompanionState[] {
  return companions.map((c) => ({
    key: c.key,
    currentHp: c.currentHp,
    customName: c.displayName !== c.template.name ? c.displayName : null,
    activeConditions: c.activeConditions?.length ? c.activeConditions : null,
    polymorphActive: c.polymorphActive ? true : null,
  }))
}

export function activePolymorphCompanion<
  T extends { polymorph: boolean; polymorphActive: boolean },
>(companions: T[]): T | null {
  return companions.find((row) => row.polymorph && row.polymorphActive) ?? null
}
