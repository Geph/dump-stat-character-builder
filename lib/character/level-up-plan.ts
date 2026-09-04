import { featureChoiceKey } from "@/lib/builder/choices"
import { FEAT_MILESTONES } from "@/lib/builder/feat-selection"
import {
  collectClassFeatureModifierPlayerChoiceSlots,
  collectSpeciesModifierPlayerChoiceSlots,
  type ModifierPlayerChoiceKind,
  type ModifierPlayerChoiceSlot,
} from "@/lib/builder/modifier-player-choices"
import {
  classNeedsSubclass,
  resolveSubclassUnlockLevel,
} from "@/lib/builder/subclass-unlock"
import { resolveFeatureChoiceCount } from "@/lib/compendium/resolve-feature-choice-count"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import {
  buildLevelUpStandardizedNotes,
  collectClassResourceScalingImprovements,
  collectFeatureScalingImprovements,
  collectSpeciesScalingImprovements,
  collectSpeciesTraitsGainedAtLevel,
  type LevelUpFeatureImprovement,
  type LevelUpStandardizedNote,
} from "@/lib/character/level-up-improvements"
import { grantFeatsFromFeature } from "@/lib/compendium/grant-feat-catalog"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import { resolveClassResourcesForClass } from "@/lib/compendium/resolve-class-resources"
import type { Feature, Species, Spell, Subclass } from "@/lib/types"
import { spellMatchesClassName } from "@/lib/compendium/investigator-spell-list"

const LEVEL_UP_MODIFIER_CHOICE_KINDS: ReadonlySet<ModifierPlayerChoiceKind> = new Set([
  "skill",
  "tool",
  "language",
  "skill_or_tool",
  "spell_list_class",
  "spell",
  "spellcasting_ability",
  "damage_type",
  "saving_throw",
  "equipment",
])

export type LevelUpNewFeature = {
  name: string
  level: number
  description: string
  source: "class" | "subclass" | "species"
}

export type LevelUpChoiceStep =
  | {
      kind: "feature_choice"
      id: string
      title: string
      classId: string
      feature: Feature
      required: number
      /**
       * `add` fills picks the character is owed (a new feature, or a count that grew on the class
       * table). `swap` offers replacing one already-chosen pick, for features whose rules allow it
       * on level-up (e.g. Alchemist Bomb Formulas and Discoveries).
       */
      mode: "add" | "swap"
      /** Swap steps can be skipped without choosing anything. */
      optional: boolean
    }
  | {
      kind: "feat_or_asi"
      id: string
      title: string
      classId: string
      featureName: string
      level: number
      /** When set, the picker is limited to these feat categories (Fighting Style, Metamagic). */
      featCategories?: string[]
    }
  | {
      kind: "subclass"
      id: string
      title: string
      classId: string
      className: string
      unlockLevel: number
    }
  | {
      kind: "spells"
      id: string
      title: string
      classId: string
      className: string
      extraCantrips: number
      extraPrepared: number
      maxSpellLevel: number
      preparedCaster: boolean
      spellList?: string[] | null
    }
  | {
      kind: "modifier_choice"
      id: string
      title: string
      classId: string
      slot: ModifierPlayerChoiceSlot
      required: number
    }

export type LevelUpPlan = {
  classId: string
  className: string
  fromLevel: number
  toLevel: number
  newTotalLevel: number
  hitDie: number
  newFeatures: LevelUpNewFeature[]
  /** Already-unlocked features whose level-gated modifiers improve at `toLevel`. */
  featureImprovements: LevelUpFeatureImprovement[]
  standardizedNotes: LevelUpStandardizedNote[]
  steps: LevelUpChoiceStep[]
}

function isAsiFeature(name: string): boolean {
  return /ability score improvement|feat or asi|^asi$/i.test(name.trim())
}

function isEpicBoonFeature(name: string): boolean {
  return /epic boon/i.test(name.trim())
}

/** Level 19 class milestones are Epic Boon only (not General / ASI). */
function featCategoriesForMilestoneLevel(level: number, categories?: string[]): string[] | undefined {
  if (level === 19) return ["Epic Boon"]
  return categories?.length ? categories : undefined
}

function featOrAsiStepTitle(level: number, featureName: string, categories?: string[]): string {
  if (level === 19 || categories?.includes("Epic Boon")) return "Choose Epic Boon"
  if (categories?.length === 1) return `Choose ${categories[0]}`
  if (categories?.length) return `Choose ${categories.join(" or ")}`
  return `Choose a feat (level ${level})`
}

function alreadyHasFeatMilestoneAtLevel(steps: LevelUpChoiceStep[], level: number): boolean {
  return steps.some((step) => {
    if (step.kind !== "feat_or_asi" || step.level !== level) return false
    if (
      isAsiFeature(step.featureName) ||
      isEpicBoonFeature(step.featureName) ||
      /^feat$/i.test(step.featureName.trim())
    ) {
      return true
    }
    const categories = step.featCategories ?? []
    // Fighting Style / Metamagic grants must not suppress the General / Epic Boon milestone.
    if (!categories.length) return true
    return categories.some((category) => /^(general|epic boon)$/i.test(category.trim()))
  })
}

function featuresGainedAtLevel(
  features: Feature[] | undefined,
  fromLevel: number,
  toLevel: number,
): Feature[] {
  return (features ?? []).filter((feature) => feature.level > fromLevel && feature.level <= toLevel)
}

function featuresUnlockedByLevel(features: Feature[], toLevel: number): Feature[] {
  return features.filter((feature) => feature.level <= toLevel)
}

function progressionAt(cls: CharacterClassDetail["class"], level: number) {
  const rows = cls?.spellcasting?.progression ?? []
  const exact = rows.find((row) => row.level === level)
  if (exact) return exact
  const prior = [...rows].filter((row) => row.level <= level).sort((a, b) => b.level - a.level)[0]
  return prior ?? null
}

/** Count cantrip / leveled spell picks that unlock between `fromLevel` (exclusive) and `toLevel`. */
function spellsKnownUnlockDelta(
  features: Feature[] | undefined,
  fromLevel: number,
  toLevel: number,
): { cantrips: number; leveled: number; maxSpellLevel: number } {
  let cantrips = 0
  let leveled = 0
  let maxSpellLevel = 0
  for (const feature of features ?? []) {
    if ((feature.level ?? 0) > toLevel) continue
    for (const instance of feature.linkedModifiers ?? []) {
      for (const mod of instance.characteristics ?? []) {
        if (mod.type !== "spells_known") continue
        for (const grant of mod.choiceGrants ?? []) {
          if (grant.count <= 0) continue
          const unlock = grant.unlocksAtClassLevel ?? feature.level ?? 0
          if (unlock <= fromLevel || unlock > toLevel) continue
          if (grant.level === 0) cantrips += grant.count
          else {
            leveled += grant.count
            maxSpellLevel = Math.max(maxSpellLevel, grant.level)
          }
        }
      }
    }
  }
  return { cantrips, leveled, maxSpellLevel }
}

export function buildLevelUpPlan(params: {
  entry: CharacterClassDetail
  subclasses: Subclass[]
  currentTotalLevel: number
  featureChoicePicks: Record<string, string[]>
  modifierPlayerPicks?: Record<string, string[]>
  modifierCatalog?: ModifierCatalogEntry[]
  species?: Species | null
  speciesTraitPicks?: Record<string, string[]>
  spells?: Array<{ id?: string | null; name?: string | null; source?: string | null }>
}): LevelUpPlan | null {
  const cls = params.entry.class
  if (!cls) return null
  const fromLevel = params.entry.row.level
  if (fromLevel >= 20) return null
  const toLevel = fromLevel + 1
  const classId = params.entry.row.class_id
  const newTotalLevel = params.currentTotalLevel + 1

  const classFeatures = featuresGainedAtLevel(cls.features as Feature[] | undefined, fromLevel, toLevel)
  const subclassFeatures = featuresGainedAtLevel(
    params.entry.subclass?.features as Feature[] | undefined,
    fromLevel,
    toLevel,
  )

  const newFeatures: LevelUpNewFeature[] = [
    ...classFeatures.map((feature) => ({
      name: feature.name,
      level: feature.level,
      description: feature.description ?? "",
      source: "class" as const,
    })),
    ...subclassFeatures.map((feature) => ({
      name: feature.name,
      level: feature.level,
      description: feature.description ?? "",
      source: "subclass" as const,
    })),
    ...collectSpeciesTraitsGainedAtLevel(
      params.species,
      params.currentTotalLevel,
      newTotalLevel,
    ).map((trait) => ({
      name: trait.name,
      level: trait.level,
      description: trait.description,
      source: "species" as const,
    })),
  ]

  const featureImprovements: LevelUpFeatureImprovement[] = [
    ...collectFeatureScalingImprovements(
      cls.features as Feature[] | undefined,
      fromLevel,
      toLevel,
      "class",
      params.spells,
    ),
    ...collectFeatureScalingImprovements(
      params.entry.subclass?.features as Feature[] | undefined,
      fromLevel,
      toLevel,
      "subclass",
      params.spells,
    ),
    ...collectClassResourceScalingImprovements(
      resolveClassResourcesForClass(cls),
      fromLevel,
      toLevel,
    ),
    ...collectSpeciesScalingImprovements(
      params.species,
      params.speciesTraitPicks ?? {},
      params.currentTotalLevel,
      newTotalLevel,
      params.spells,
    ),
  ]

  const steps: LevelUpChoiceStep[] = []
  const availableSubclasses = params.subclasses.filter((sub) => sub.class_id === classId)
  const unlockLevel = resolveSubclassUnlockLevel(cls)
  if (
    classNeedsSubclass(toLevel, availableSubclasses.length, unlockLevel) &&
    !params.entry.row.subclass_id
  ) {
    steps.push({
      kind: "subclass",
      id: `subclass:${classId}`,
      title: `Choose a ${cls.name} subclass`,
      classId,
      className: cls.name,
      unlockLevel,
    })
  }

  for (const feature of [...classFeatures, ...subclassFeatures]) {
    if (!isAsiFeature(feature.name)) continue
    const featCategories = featCategoriesForMilestoneLevel(feature.level)
    steps.push({
      kind: "feat_or_asi",
      id: `asi:${classId}:${feature.level}`,
      title: featOrAsiStepTitle(feature.level, feature.name, featCategories),
      classId,
      featureName: feature.name,
      level: feature.level,
      ...(featCategories ? { featCategories } : {}),
    })
  }

  const catalog = params.modifierCatalog ?? []
  for (const feature of [...classFeatures, ...subclassFeatures]) {
    if (isAsiFeature(feature.name)) continue
    const grants = grantFeatsFromFeature(feature, catalog)
    if (!grants.length) continue
    const fromGrants = [...new Set(grants.flatMap((grant) => grant.featCategories))]
    const featCategories = featCategoriesForMilestoneLevel(
      feature.level,
      isEpicBoonFeature(feature.name) ? ["Epic Boon"] : fromGrants,
    )
    steps.push({
      kind: "feat_or_asi",
      id: `feat:${classId}:${feature.level}:${feature.name}`,
      title: featOrAsiStepTitle(
        feature.level,
        feature.name,
        featCategories ?? fromGrants,
      ),
      classId,
      featureName: feature.name,
      level: feature.level,
      ...(featCategories ? { featCategories } : {}),
    })
  }

  // Every unlocked choice feature is re-checked, not just the ones gained this level: counts such
  // as the Alchemist's Bomb Formulas grow on the class table at levels the feature isn't listed.
  const unlockedChoiceFeatures = featuresUnlockedByLevel(
    [
      ...((cls.features as Feature[] | undefined) ?? []),
      ...((params.entry.subclass?.features as Feature[] | undefined) ?? []),
    ],
    toLevel,
  )
  const swapSteps: LevelUpChoiceStep[] = []
  for (const feature of unlockedChoiceFeatures) {
    if (isAsiFeature(feature.name)) continue
    if (!feature.isChoice || !feature.choices) continue
    const hasOptions =
      (feature.choices.options?.length ?? 0) > 0 || Boolean(feature.choices.optionsSource)
    if (!hasOptions) continue
    const required = resolveFeatureChoiceCount(feature.choices, toLevel, cls.name, undefined, {
      featureName: feature.name,
    })
    const key = featureChoiceKey(classId, feature.name, feature.level)
    const already = params.featureChoicePicks[key]?.length ?? 0
    if (already < required) {
      steps.push({
        kind: "feature_choice",
        id: key,
        title: feature.name,
        classId,
        feature,
        required,
        mode: "add",
        optional: false,
      })
      continue
    }
    if (feature.choices.swappableOnLevelUp && already > 0) {
      swapSteps.push({
        kind: "feature_choice",
        id: key,
        title: `Replace a ${feature.choices.category || feature.name} (optional)`,
        classId,
        feature,
        required,
        mode: "swap",
        optional: true,
      })
    }
  }
  steps.push(...swapSteps)

  const attachedSubclass = params.entry.subclass
  const subclassesForSlots = attachedSubclass
    ? [
        attachedSubclass,
        ...params.subclasses.filter((sub) => sub.id !== attachedSubclass.id),
      ]
    : params.subclasses
  const modifierSlots = collectClassFeatureModifierPlayerChoiceSlots({
    classLevels: [{ classId, level: toLevel }],
    classes: cls ? [cls] : [],
    subclasses: subclassesForSlots,
    subclassByClassId: params.entry.row.subclass_id
      ? { [classId]: params.entry.row.subclass_id }
      : {},
    featureChoicePicks: params.featureChoicePicks,
    catalog: params.modifierCatalog ?? [],
  })
  const modifierPicks = params.modifierPlayerPicks ?? {}
  for (const slot of modifierSlots) {
    if (!LEVEL_UP_MODIFIER_CHOICE_KINDS.has(slot.kind)) continue
    const already = modifierPicks[slot.slotKey]?.length ?? 0
    if (already >= slot.maxCount) continue
    steps.push({
      kind: "modifier_choice",
      id: slot.slotKey,
      title: slot.label || slot.sourceLabel,
      classId,
      slot,
      required: slot.maxCount,
    })
  }

  if (params.species) {
    const speciesTraitPicks = params.speciesTraitPicks ?? {}
    const catalog = params.modifierCatalog ?? []
    const speciesSlotsBefore = collectSpeciesModifierPlayerChoiceSlots(
      params.species,
      speciesTraitPicks,
      catalog,
      params.currentTotalLevel,
    )
    const speciesSlotsAfter = collectSpeciesModifierPlayerChoiceSlots(
      params.species,
      speciesTraitPicks,
      catalog,
      newTotalLevel,
    )
    const priorMax = new Map(speciesSlotsBefore.map((slot) => [slot.slotKey, slot.maxCount]))
    for (const slot of speciesSlotsAfter) {
      if (!LEVEL_UP_MODIFIER_CHOICE_KINDS.has(slot.kind)) continue
      const previous = priorMax.get(slot.slotKey) ?? 0
      if (slot.maxCount <= previous) continue
      const already = modifierPicks[slot.slotKey]?.length ?? 0
      if (already >= slot.maxCount) continue
      steps.push({
        kind: "modifier_choice",
        id: slot.slotKey,
        title: slot.label || slot.sourceLabel,
        classId,
        slot,
        required: slot.maxCount,
      })
    }
  }

  if (FEAT_MILESTONES.includes(toLevel as (typeof FEAT_MILESTONES)[number])) {
    // Any feat_or_asi at this class level (ASI, Epic Boon, Fighting Style grant, …) counts —
    // do not add a second General-feat step after an Epic Boon feature.
    if (!alreadyHasFeatMilestoneAtLevel(steps, toLevel)) {
      const featCategories = featCategoriesForMilestoneLevel(toLevel)
      steps.push({
        kind: "feat_or_asi",
        id: `asi:${classId}:${toLevel}`,
        title: featOrAsiStepTitle(toLevel, toLevel === 19 ? "Epic Boon" : "Feat", featCategories),
        classId,
        featureName: toLevel === 19 ? "Epic Boon" : "Feat",
        level: toLevel,
        ...(featCategories ? { featCategories } : {}),
      })
    }
  }

  const before = progressionAt(cls, fromLevel)
  const after = progressionAt(cls, toLevel)
  const knownUnlock = spellsKnownUnlockDelta(
    [
      ...((cls.features as Feature[] | undefined) ?? []),
      ...((params.entry.subclass?.features as Feature[] | undefined) ?? []),
    ],
    fromLevel,
    toLevel,
  )
  // Modifier-granted spells have dedicated steps above so their class/school/list and
  // casting-ability dependencies remain intact. This generic step is only class progression.
  const extraCantrips = Math.max(0, (after?.cantrips ?? 0) - (before?.cantrips ?? 0))
  const extraPrepared = Math.max(0, (after?.prepared ?? 0) - (before?.prepared ?? 0))
  const maxSpellLevel = Math.max(after?.max_spell_level ?? 1, 1)
  if (extraCantrips > 0 || extraPrepared > 0) {
    const preparedCaster =
      Boolean(cls.spellcasting) &&
      cls.spellcasting?.prepared !== false &&
      !cls.spellcasting?.pact_magic
    steps.push({
      kind: "spells",
      id: `spells:${classId}:${toLevel}`,
      title: extraPrepared > 0 && preparedCaster
          ? "Prepare additional spells"
          : "Learn additional spells",
      classId,
      className: cls.name,
      extraCantrips,
      extraPrepared,
      maxSpellLevel,
      preparedCaster,
      spellList: cls.spell_list,
    })
  }

  return {
    classId,
    className: cls.name,
    fromLevel,
    toLevel,
    newTotalLevel,
    hitDie: cls.hit_die ?? 8,
    newFeatures,
    featureImprovements,
    standardizedNotes: buildLevelUpStandardizedNotes({
      fromTotalLevel: params.currentTotalLevel,
      toTotalLevel: newTotalLevel,
      maxSpellLevelBefore: before?.max_spell_level ?? null,
      maxSpellLevelAfter: after?.max_spell_level ?? (knownUnlock.maxSpellLevel || null),
    }),
    steps,
  }
}

/**
 * How many picks a swap step replaced, or `null` when the selection isn't a legal single swap —
 * level-up rules replace at most one pick and never reduce the total.
 */
export function countReplacedPicks(original: string[], next: string[]): number | null {
  if (next.length !== original.length) return null
  const kept = new Set(original)
  const replaced = next.filter((name) => !kept.has(name)).length
  return replaced <= 1 ? replaced : null
}

/**
 * Map spells chosen on a level-up `spells` step onto newly unlocked `spells_known`
 * modifier slots (e.g. Investigator grimoire +2), so builder re-edits stay in sync.
 */
export function assignLevelUpSpellsToNewModifierSlots(params: {
  fromLevel: number
  toLevel: number
  classId: string
  cls: CharacterClassDetail["class"]
  subclasses: Subclass[]
  subclassId: string | null | undefined
  featureChoicePicks: Record<string, string[]>
  modifierCatalog: ModifierCatalogEntry[]
  spellIds: string[]
}): Record<string, string[]> {
  const cls = params.cls
  if (!cls || params.spellIds.length === 0) return {}

  const collect = (level: number) =>
    collectClassFeatureModifierPlayerChoiceSlots({
      classLevels: [{ classId: params.classId, level }],
      classes: [cls],
      subclasses: params.subclasses,
      subclassByClassId: params.subclassId ? { [params.classId]: params.subclassId } : {},
      featureChoicePicks: params.featureChoicePicks,
      catalog: params.modifierCatalog,
    }).filter((slot) => slot.kind === "spell")

  const beforeKeys = new Set(collect(params.fromLevel).map((slot) => slot.slotKey))
  const newSlots = collect(params.toLevel).filter((slot) => !beforeKeys.has(slot.slotKey))
  if (!newSlots.length) return {}

  const assigned: Record<string, string[]> = {}
  let offset = 0
  for (const slot of newSlots) {
    const chunk = params.spellIds.slice(offset, offset + slot.maxCount)
    offset += slot.maxCount
    if (chunk.length) assigned[slot.slotKey] = chunk
  }
  return assigned
}

export function spellsEligibleForLevelUp(
  spells: Spell[],
  className: string,
  maxSpellLevel: number,
  alreadyKnownIds: string[],
  classSpellList?: readonly string[] | null,
): Spell[] {
  const known = new Set(alreadyKnownIds)
  return spells.filter((spell) => {
    if (known.has(spell.id)) return false
    if ((spell.level ?? 0) > maxSpellLevel) return false
    const lists = spell.classes ?? []
    if (!lists.length) return true
    return spellMatchesClassName(spell, className, classSpellList)
  })
}
