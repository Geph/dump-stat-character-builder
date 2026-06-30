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
import type { CustomAbility, Feature } from "@/lib/types"

type FeatureCarrier = {
  level: number
  name: string
  description: string
  companion_stat_block?: CompanionStatBlockTemplate | null
  companion_stat_blocks?: CompanionStatBlockTemplate[] | null
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

    // SRD Druid Beast forms (Rat, Riding Horse, Spider, Wolf) populate from Wild Shape.
    const forms: CompanionStatBlockTemplate[] = [...(feature.companion_stat_blocks ?? [])]
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
  const out: { source: CompanionSource; template: CompanionStatBlockTemplate }[] = []

  for (const ability of abilities) {
    const row = ability as CustomAbility & {
      companion_stat_block?: CompanionStatBlockTemplate | null
      companion_stat_blocks?: CompanionStatBlockTemplate[] | null
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

    const forms = row.companion_stat_blocks ?? []
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
}): ResolvedCompanion[] {
  const candidates = [
    ...collectCompanionCandidatesFromClasses(params.classDetails),
    ...collectCompanionCandidatesFromAbilities(params.customAbilities ?? []),
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
