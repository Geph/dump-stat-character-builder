import { featureChoiceKey } from "@/lib/builder/choices"
import { FEAT_MILESTONES } from "@/lib/builder/feat-selection"
import {
  classNeedsSubclass,
  resolveSubclassUnlockLevel,
} from "@/lib/builder/subclass-unlock"
import { resolveFeatureChoiceCount } from "@/lib/compendium/resolve-feature-choice-count"
import { featureShowsOnSheetTab } from "@/lib/compendium/feature-sheet-display"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import type { Feature, Spell, Subclass } from "@/lib/types"

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

export type LevelUpPlan = {
  classId: string
  className: string
  fromLevel: number
  toLevel: number
  newTotalLevel: number
  newFeatures: LevelUpNewFeature[]
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

export function buildLevelUpPlan(params: {
  entry: CharacterClassDetail
  subclasses: Subclass[]
  currentTotalLevel: number
  featureChoicePicks: Record<string, string[]>
}): LevelUpPlan | null {
  const cls = params.entry.class
  if (!cls) return null
  const fromLevel = params.entry.row.level
  if (fromLevel >= 20) return null
  const toLevel = fromLevel + 1
  const classId = params.entry.row.class_id

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
      title: `${feature.name} (level ${feature.level})`,
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

  if (FEAT_MILESTONES.includes(toLevel as (typeof FEAT_MILESTONES)[number])) {
    const alreadyHasAsiStep = steps.some((step) => step.kind === "feat_or_asi")
    if (!alreadyHasAsiStep) {
      steps.push({
        kind: "feat_or_asi",
        id: `asi:${classId}:${toLevel}`,
        title: `Feat or Ability Score Improvement (level ${toLevel})`,
        classId,
        featureName: "Feat or ASI",
        level: toLevel,
      })
    }
  }

  const before = progressionAt(cls, fromLevel)
  const after = progressionAt(cls, toLevel)
  if (after) {
    const extraCantrips = Math.max(0, (after.cantrips ?? 0) - (before?.cantrips ?? 0))
    const extraPrepared = Math.max(0, (after.prepared ?? 0) - (before?.prepared ?? 0))
    if (extraCantrips > 0 || extraPrepared > 0) {
      steps.push({
        kind: "spells",
        id: `spells:${classId}:${toLevel}`,
        title: extraPrepared > 0 && cls.spellcasting?.prepared !== false
          ? "Prepare additional spells"
          : "Learn additional spells",
        classId,
        className: cls.name,
        extraCantrips,
        extraPrepared,
        maxSpellLevel: after.max_spell_level ?? 1,
        preparedCaster: cls.spellcasting?.prepared !== false && !cls.spellcasting?.pact_magic,
      })
    }
  }

  return {
    classId,
    className: cls.name,
    fromLevel,
    toLevel,
    newTotalLevel: params.currentTotalLevel + 1,
    newFeatures,
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
    return lists.some((name) => name.toLowerCase() === className.toLowerCase())
  })
}
