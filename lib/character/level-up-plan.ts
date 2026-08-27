import { featureChoiceKey } from "@/lib/builder/choices"
import { FEAT_MILESTONES } from "@/lib/builder/feat-selection"
import {
  collectClassFeatureModifierPlayerChoiceSlots,
  type ModifierPlayerChoiceKind,
  type ModifierPlayerChoiceSlot,
} from "@/lib/builder/modifier-player-choices"
import {
  classNeedsSubclass,
  resolveSubclassUnlockLevel,
} from "@/lib/builder/subclass-unlock"
import { resolveFeatureChoiceCount } from "@/lib/compendium/resolve-feature-choice-count"
import { featureShowsOnSheetTab } from "@/lib/compendium/feature-sheet-display"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import {
  buildLevelUpStandardizedNotes,
  type LevelUpStandardizedNote,
} from "@/lib/character/level-up-improvements"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import type { Feature, Spell, Subclass } from "@/lib/types"
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
  "equipment",
])

export type LevelUpNewFeature = {
  name: string
  level: number
  description: string
  source: "class" | "subclass"
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
  standardizedNotes: LevelUpStandardizedNote[]
  steps: LevelUpChoiceStep[]
}

function isAsiFeature(name: string): boolean {
  return /ability score improvement|feat or asi|^asi$/i.test(name.trim())
}

function featuresGainedAtLevel(
  features: Feature[] | undefined,
  fromLevel: number,
  toLevel: number,
): Feature[] {
  return (features ?? []).filter(
    (feature) => feature.level > fromLevel && feature.level <= toLevel && featureShowsOnSheetTab(feature),
  )
}

function featuresUnlockedByLevel(features: Feature[], toLevel: number): Feature[] {
  return features.filter((feature) => feature.level <= toLevel && featureShowsOnSheetTab(feature))
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
    steps.push({
      kind: "feat_or_asi",
      id: `asi:${classId}:${feature.level}`,
      title: `Choose a feat (level ${feature.level})`,
      classId,
      featureName: feature.name,
      level: feature.level,
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

  const modifierSlots = collectClassFeatureModifierPlayerChoiceSlots({
    classLevels: [{ classId, level: toLevel }],
    classes: cls ? [cls] : [],
    subclasses: params.subclasses,
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

  if (FEAT_MILESTONES.includes(toLevel as (typeof FEAT_MILESTONES)[number])) {
    const alreadyHasAsiStep = steps.some((step) => step.kind === "feat_or_asi")
    if (!alreadyHasAsiStep) {
      steps.push({
        kind: "feat_or_asi",
        id: `asi:${classId}:${toLevel}`,
        title: `Choose a feat (level ${toLevel})`,
        classId,
        featureName: "Feat",
        level: toLevel,
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
): Spell[] {
  const known = new Set(alreadyKnownIds)
  return spells.filter((spell) => {
    if (known.has(spell.id)) return false
    if ((spell.level ?? 0) > maxSpellLevel) return false
    const lists = spell.classes ?? []
    if (!lists.length) return true
    return spellMatchesClassName(spell, className)
  })
}
