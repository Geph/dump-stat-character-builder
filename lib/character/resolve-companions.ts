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
import {
  familiarFormOptions,
  familiarTemplateForForm,
  wildShapeEligibleForms,
  wildShapeTierForLevel,
  WILD_SHAPE_RECOMMENDED_FORMS,
} from "@/lib/character/companion-form-options"
import { templateFromFeature } from "@/lib/character/parse-companion-stat-block"
import { SRD_BEAST_FORMS, isDruidWildShapeFeature } from "@/lib/character/srd-beast-forms"
import { SRD_FAMILIAR, isFamiliarFeature, isFindFamiliarSpell } from "@/lib/character/srd-familiar"
import {
  creatureNamesFromAbility,
  creatureNamesFromFeature,
  grantCreaturesFromLinkedModifiers,
  grantCreaturesFromSpell,
} from "@/lib/compendium/grant-creature-catalog"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import type { Creature, CustomAbility, Equipment, Feature, Spell } from "@/lib/types"
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

/** Selected form names per group key (persisted via CharacterCompanionState.knownForms). */
export type CompanionFormSelections = Record<string, string[]>

/** A feature whose companion forms the player picks from the creatures compendium. */
export type CompanionFormGroup = {
  /** Base companion key for the feature (selection state lives on this key). */
  key: string
  featureName: string
  className: string
  kind: "wild_shape" | "familiar" | "choice"
  /** Pickable forms from the compendium (name + CR for display). */
  options: { name: string; cr?: string | null }[]
  /** Currently active form names. */
  selected: string[]
  /** Known-form budget (Wild Shape tiers); null when unlimited swaps (familiar). */
  maxKnown: number | null
}

export function formSelectionsFromState(
  saved: { key: string; knownForms?: string[] | null }[] | null | undefined,
): CompanionFormSelections {
  const selections: CompanionFormSelections = {}
  for (const row of saved ?? []) {
    if (row.knownForms?.length) selections[row.key] = row.knownForms
  }
  return selections
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

type ScanExtras = {
  /** Full creature rows for eligibility pools (Wild Shape, familiar forms). */
  creatures?: Creature[]
  /** Player-selected forms per group key. */
  formSelections?: CompanionFormSelections
  /** Collector for selectable form groups (filled during the scan). */
  formGroups?: CompanionFormGroup[]
}

function isPactOfTheChainFeature(featureName: string): boolean {
  return /^pact of the chain$/i.test(featureName.trim())
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
  extras: ScanExtras = {},
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

    const forms: CompanionStatBlockTemplate[] = [
      ...linkedCreatures,
      ...(feature.companion_stat_blocks ?? []),
    ]

    // Druid Wild Shape: eligible Beasts come from the creatures compendium
    // (CR / Fly Speed capped by level); the player picks known forms.
    if (!forms.length && isDruidWildShapeFeature(ctx.className, feature.name)) {
      const source = baseSource(feature.name, feature.level)
      const groupKey = companionKey(source)
      const eligible = wildShapeEligibleForms(extras.creatures, ctx.maxLevel)

      if (!eligible.length) {
        // No compendium creatures loaded — fall back to the bundled SRD forms.
        forms.push(...SRD_BEAST_FORMS)
      } else {
        const eligibleByName = new Map(eligible.map((form) => [normalizeCreatureName(form.name), form]))
        const selectedNames =
          extras.formSelections?.[groupKey] ??
          WILD_SHAPE_RECOMMENDED_FORMS.filter((name) =>
            eligibleByName.has(normalizeCreatureName(name)),
          )
        for (const name of selectedNames) {
          const form = eligibleByName.get(normalizeCreatureName(name))
          if (form) forms.push(form)
        }
        extras.formGroups?.push({
          key: groupKey,
          featureName: feature.name,
          className: ctx.className,
          kind: "wild_shape",
          options: eligible.map((form) => ({ name: form.name, cr: form.cr ?? null })),
          selected: forms.map((form) => form.name),
          maxKnown: wildShapeTierForLevel(ctx.maxLevel)?.knownForms ?? null,
        })
      }
    }

    // Find Familiar reskins (Druid Wild Companion, Warlock Pact of the Chain):
    // the player picks the animal form; Pact of the Chain broadens the options.
    if (!forms.length && !feature.companion_stat_block && isFamiliarFeature(ctx.className, feature.name)) {
      const source = baseSource(feature.name, feature.level)
      const groupKey = companionKey(source)
      const options = familiarFormOptions(extras.creatures, {
        pactOfTheChain: isPactOfTheChainFeature(feature.name),
      })
      const selectedName = extras.formSelections?.[groupKey]?.[0] ?? null
      const chosen = selectedName
        ? options.find((form) => normalizeCreatureName(form.name) === normalizeCreatureName(selectedName))
        : null
      if (options.length) {
        extras.formGroups?.push({
          key: groupKey,
          featureName: feature.name,
          className: ctx.className,
          kind: "familiar",
          options: options.map((form) => ({ name: form.name, cr: form.cr ?? null })),
          selected: chosen ? [chosen.name] : [],
          maxKnown: 1,
        })
      }
      into.push({
        source,
        template: chosen ? familiarTemplateForForm(chosen) : SRD_FAMILIAR,
      })
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
  extras: ScanExtras = {},
): { source: CompanionSource; template: CompanionStatBlockTemplate }[] {
  const found: { source: CompanionSource; template: CompanionStatBlockTemplate }[] = []

  for (const entry of classDetails) {
    const className = entry.class?.name ?? "Class"
    scanFeatures(entry.class?.features as FeatureCarrier[] | undefined, {
      classId: entry.row.class_id,
      className,
      maxLevel: entry.row.level,
    }, found, creatureLookup, modifierCatalog, extras)

    if (entry.subclass) {
      scanFeatures(entry.subclass.features as FeatureCarrier[] | undefined, {
        classId: entry.row.class_id,
        className,
        subclassId: entry.subclass.id,
        subclassName: entry.subclass.name,
        maxLevel: entry.row.level,
      }, found, creatureLookup, modifierCatalog, extras)
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

type ResolveCompanionsParams = {
  classDetails: CharacterClassDetail[]
  customAbilities?: CustomAbility[]
  ctx: CompanionResolveContext
  /**
   * @deprecated Prefer `knownSpells` — Find Familiar is resolved from the spell's
   * summon-creature (grant_creature) modifiers.
   */
  findFamiliarSpellSource?: { className: string; classId: string; subclassId?: string | null } | null
  /** Known/prepared spells — grant_creature / companion_creature_names feed the Companions tab. */
  knownSpells?: Spell[]
  /** Inventory equipment — magic_effects grant_creature feed the Companions tab. */
  equipment?: Equipment[]
  /** Compendium creatures available to resolve name-linked companions. */
  creatures?: Creature[]
  /** Modifier catalog for resolving grant_creature linked modifiers. */
  modifierCatalog?: ModifierCatalogEntry[]
  /** Player-selected forms per group key (from CharacterCompanionState.knownForms). */
  formSelections?: CompanionFormSelections
}

function classHasPactOfTheChain(classDetails: CharacterClassDetail[]): boolean {
  return classDetails.some((entry) =>
    [...(entry.class?.features ?? []), ...(entry.subclass?.features ?? [])].some(
      (feature) =>
        (feature as { level?: number }).level != null &&
        (feature as { level: number }).level <= entry.row.level &&
        isPactOfTheChainFeature((feature as { name?: string }).name ?? ""),
    ),
  )
}

function pushFamiliarCandidate(params: {
  source: CompanionSource
  creatures?: Creature[]
  formSelections?: CompanionFormSelections
  formGroups: CompanionFormGroup[]
  pactOfTheChain: boolean
  into: { source: CompanionSource; template: CompanionStatBlockTemplate }[]
}) {
  const groupKey = companionKey(params.source)
  const options = familiarFormOptions(params.creatures, {
    pactOfTheChain: params.pactOfTheChain,
  })
  const selectedName = params.formSelections?.[groupKey]?.[0] ?? null
  const chosen = selectedName
    ? options.find(
        (form) => normalizeCreatureName(form.name) === normalizeCreatureName(selectedName),
      )
    : null
  if (options.length) {
    params.formGroups.push({
      key: groupKey,
      featureName: params.source.featureName,
      className: params.source.className,
      kind: "familiar",
      options: options.map((form) => ({ name: form.name, cr: form.cr ?? null })),
      selected: chosen ? [chosen.name] : [],
      maxKnown: 1,
    })
  }
  params.into.push({
    source: params.source,
    template: chosen ? familiarTemplateForForm(chosen) : SRD_FAMILIAR,
  })
}

function pushChoiceGrant(params: {
  source: CompanionSource
  optionNames: string[]
  maxKnown: number
  creatureLookup?: Map<string, CompanionStatBlockTemplate>
  formSelections?: CompanionFormSelections
  formGroups: CompanionFormGroup[]
  into: { source: CompanionSource; template: CompanionStatBlockTemplate }[]
}) {
  const groupKey = companionKey(params.source)
  const options = params.optionNames
    .map((name) => params.creatureLookup?.get(normalizeCreatureName(name)))
    .filter((template): template is CompanionStatBlockTemplate => Boolean(template))
  if (!options.length) return

  const selectedNames =
    params.formSelections?.[groupKey] ??
    (options.length === 1 ? [options[0].name] : [])
  const selectedSet = new Set(selectedNames.map(normalizeCreatureName))
  const chosen = options.filter((form) => selectedSet.has(normalizeCreatureName(form.name)))

  params.formGroups.push({
    key: groupKey,
    featureName: params.source.featureName,
    className: params.source.className,
    kind: "choice",
    options: options.map((form) => ({ name: form.name, cr: form.cr ?? null })),
    selected: chosen.map((form) => form.name),
    maxKnown: params.maxKnown,
  })

  for (const template of chosen) {
    params.into.push({
      source: { ...params.source, formName: template.name },
      template,
    })
  }
}

export function collectCompanionCandidatesFromSpells(
  spells: Spell[],
  creatureLookup: Map<string, CompanionStatBlockTemplate> | undefined,
  modifierCatalog: ModifierCatalogEntry[],
  extras: ScanExtras & {
    classDetails?: CharacterClassDetail[]
    className?: string
    classId?: string
    /** Skip Find Familiar when a class feature already granted one. */
    skipFindFamiliar?: boolean
  } = {},
): { source: CompanionSource; template: CompanionStatBlockTemplate }[] {
  const out: { source: CompanionSource; template: CompanionStatBlockTemplate }[] = []
  const formGroups = extras.formGroups ?? []
  const pactOfTheChain = classHasPactOfTheChain(extras.classDetails ?? [])
  const className = extras.className ?? "Spellcaster"
  const classId = extras.classId ?? "spellcaster"

  for (const spell of spells) {
    const source: CompanionSource = {
      featureName: spell.name,
      featureLevel: Math.max(1, spell.level || 1),
      className,
      subclassName: null,
      classId,
      subclassId: null,
    }

    if (isFindFamiliarSpell(spell.name)) {
      if (extras.skipFindFamiliar) continue
      pushFamiliarCandidate({
        source,
        creatures: extras.creatures,
        formSelections: extras.formSelections,
        formGroups,
        pactOfTheChain,
        into: out,
      })
      continue
    }

    const grants = grantCreaturesFromSpell(spell, modifierCatalog)
    if (!grants.length) {
      // Fall back to flat name list when no structured grant metadata.
      const names = collectLinkedCreatureTemplates(
        // creatureNamesFromSpell is imported via grantCreaturesFromSpell helpers
        (spell.companion_creature_names ?? []).map((n) => n.trim()).filter(Boolean),
        creatureLookup,
      )
      for (const template of names) {
        out.push({ source: { ...source, formName: template.name }, template })
      }
      continue
    }

    for (const grant of grants) {
      if (grant.choiceOptions?.length) {
        pushChoiceGrant({
          source,
          optionNames: grant.choiceOptions,
          maxKnown: grant.count ?? 1,
          creatureLookup,
          formSelections: extras.formSelections,
          formGroups,
          into: out,
        })
      } else {
        for (const template of collectLinkedCreatureTemplates(grant.creatureNames, creatureLookup)) {
          out.push({ source: { ...source, formName: template.name }, template })
        }
      }
    }
  }

  return out
}

export function collectCompanionCandidatesFromEquipment(
  equipment: Equipment[],
  creatureLookup: Map<string, CompanionStatBlockTemplate> | undefined,
  modifierCatalog: ModifierCatalogEntry[],
  extras: ScanExtras = {},
): { source: CompanionSource; template: CompanionStatBlockTemplate }[] {
  const out: { source: CompanionSource; template: CompanionStatBlockTemplate }[] = []
  const formGroups = extras.formGroups ?? []

  for (const item of equipment) {
    const effects = (item.magic_effects ?? []) as LinkedModifierInstance[]
    const grants = grantCreaturesFromLinkedModifiers(modifierCatalog, effects)
    if (!grants.length) continue

    const source: CompanionSource = {
      featureName: item.name,
      featureLevel: 1,
      className: "Magic Item",
      subclassName: null,
      classId: item.id,
      subclassId: null,
    }

    for (const grant of grants) {
      if (grant.choiceOptions?.length) {
        pushChoiceGrant({
          source,
          optionNames: grant.choiceOptions,
          maxKnown: grant.count ?? 1,
          creatureLookup,
          formSelections: extras.formSelections,
          formGroups,
          into: out,
        })
      } else {
        for (const template of collectLinkedCreatureTemplates(grant.creatureNames, creatureLookup)) {
          out.push({ source: { ...source, formName: template.name }, template })
        }
      }
    }
  }

  return out
}

export function resolveCharacterCompanionsDetailed(params: ResolveCompanionsParams): {
  companions: ResolvedCompanion[]
  formGroups: CompanionFormGroup[]
} {
  const creatureLookup = buildCreatureTemplateLookup(params.creatures)
  const catalog = params.modifierCatalog ?? []
  const formGroups: CompanionFormGroup[] = []
  const extras: ScanExtras = {
    creatures: params.creatures,
    formSelections: params.formSelections,
    formGroups,
  }
  const spellcastingEntry =
    params.classDetails.find((entry) => entry.class?.spellcasting) ?? params.classDetails[0]
  const spellClassName = spellcastingEntry?.class?.name ?? "Spellcaster"
  const spellClassId = spellcastingEntry?.row.class_id ?? "spellcaster"

  const fromClasses = collectCompanionCandidatesFromClasses(
    params.classDetails,
    creatureLookup,
    catalog,
    extras,
  )
  const fromAbilities = collectCompanionCandidatesFromAbilities(
    params.customAbilities ?? [],
    creatureLookup,
    catalog,
  )
  const hasFamiliar = [...fromClasses, ...fromAbilities].some(
    (row) => row.template.name === SRD_FAMILIAR.name || /^familiar \(/i.test(row.template.name),
  )
  const candidates = [
    ...fromClasses,
    ...fromAbilities,
    ...collectCompanionCandidatesFromSpells(params.knownSpells ?? [], creatureLookup, catalog, {
      ...extras,
      classDetails: params.classDetails,
      className: spellClassName,
      classId: spellClassId,
      skipFindFamiliar: hasFamiliar,
    }),
    ...collectCompanionCandidatesFromEquipment(
      params.equipment ?? [],
      creatureLookup,
      catalog,
      extras,
    ),
  ]

  // Legacy fallback: findFamiliarSpellSource without knownSpells still grants a familiar.
  const hasFamiliarAfter = candidates.some(
    (row) => row.template.name === SRD_FAMILIAR.name || /^familiar \(/i.test(row.template.name),
  )
  if (params.findFamiliarSpellSource && !hasFamiliarAfter && !(params.knownSpells ?? []).length) {
    pushFamiliarCandidate({
      source: {
        featureName: "Find Familiar",
        featureLevel: 1,
        className: params.findFamiliarSpellSource.className,
        subclassName: null,
        classId: params.findFamiliarSpellSource.classId,
        subclassId: params.findFamiliarSpellSource.subclassId ?? null,
      },
      creatures: params.creatures,
      formSelections: params.formSelections,
      formGroups,
      pactOfTheChain: classHasPactOfTheChain(params.classDetails),
      into: candidates,
    })
  }

  const byKey = new Map<string, ResolvedCompanion>()
  for (const row of candidates) {
    const resolved = resolveCompanion(row.template, row.source, params.ctx)
    byKey.set(resolved.key, resolved)
  }
  return { companions: [...byKey.values()], formGroups }
}

export function resolveCharacterCompanions(params: ResolveCompanionsParams): ResolvedCompanion[] {
  return resolveCharacterCompanionsDetailed(params).companions
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
