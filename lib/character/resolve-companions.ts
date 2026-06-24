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
import type { CustomAbility, Feature } from "@/lib/types"

type FeatureCarrier = {
  level: number
  name: string
  description: string
  companion_stat_block?: CompanionStatBlockTemplate | null
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
) {
  for (const feature of features ?? []) {
    if (feature.level > ctx.maxLevel) continue
    if (!isCompanionStatBlockFeature(feature)) continue
    const template = templateFromFeature(feature)
    if (!template) continue
    into.push({
      source: {
        featureName: feature.name,
        featureLevel: feature.level,
        className: ctx.className,
        subclassName: ctx.subclassName ?? null,
        classId: ctx.classId,
        subclassId: ctx.subclassId ?? null,
      },
      template,
    })
  }
}

export function collectCompanionCandidatesFromClasses(
  classDetails: CharacterClassDetail[],
): { source: CompanionSource; template: CompanionStatBlockTemplate }[] {
  const found: { source: CompanionSource; template: CompanionStatBlockTemplate }[] = []

  for (const entry of classDetails) {
    const className = entry.class?.name ?? "Class"
    scanFeatures(entry.class?.features as FeatureCarrier[] | undefined, {
      classId: entry.row.class_id,
      className,
      maxLevel: entry.row.level,
    }, found)

    if (entry.subclass) {
      scanFeatures(entry.subclass.features as FeatureCarrier[] | undefined, {
        classId: entry.row.class_id,
        className,
        subclassId: entry.subclass.id,
        subclassName: entry.subclass.name,
        maxLevel: entry.row.level,
      }, found)
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
): { source: CompanionSource; template: CompanionStatBlockTemplate }[] {
  return abilities
    .filter((ability) => {
      const row = ability as CustomAbility & { companion_stat_block?: CompanionStatBlockTemplate | null }
      return Boolean(row.companion_stat_block) || isCompanionStatBlockFeature({ name: ability.name, description: ability.description ?? "" })
    })
    .map((ability) => {
      const template =
        (ability as CustomAbility & { companion_stat_block?: CompanionStatBlockTemplate }).companion_stat_block ??
        templateFromFeature({
          name: ability.name,
          description: ability.description ?? "",
        })
      return {
        source: {
          featureName: ability.name,
          featureLevel: 1,
          className: ability.attached_to_type === "class" ? ability.attached_to_id ?? "Custom" : "Custom Ability",
          subclassName: null,
          classId: ability.attached_to_id ?? ability.id,
          subclassId: null,
        },
        template: template ?? { name: ability.name, ac: { parts: [{ type: "fixed", value: 10 }] }, hp: { parts: [{ type: "fixed", value: 1 }] }, traits: [], actions: [] },
      }
    })
}

export function resolveCharacterCompanions(params: {
  classDetails: CharacterClassDetail[]
  customAbilities?: CustomAbility[]
  ctx: CompanionResolveContext
}): ResolvedCompanion[] {
  const candidates = [
    ...collectCompanionCandidatesFromClasses(params.classDetails),
    ...collectCompanionCandidatesFromAbilities(params.customAbilities ?? []),
  ]
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
): Array<ResolvedCompanion & { currentHp: number; displayName: string }> {
  const stateByKey = new Map((saved ?? []).map((row) => [row.key, row]))
  return companions.map((companion) => {
    const state = stateByKey.get(companion.key)
    const currentHp = state?.currentHp ?? companion.maxHp
    return {
      ...companion,
      currentHp: Math.min(Math.max(0, currentHp), companion.maxHp),
      displayName: state?.customName?.trim() || companion.template.name,
    }
  })
}

export function companionStateFromResolved(
  companions: Array<ResolvedCompanion & { currentHp: number; displayName: string }>,
): CharacterCompanionState[] {
  return companions.map((c) => ({
    key: c.key,
    currentHp: c.currentHp,
    customName: c.displayName !== c.template.name ? c.displayName : null,
  }))
}
