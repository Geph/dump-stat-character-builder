import { parseCompanionStatBlock } from "@/lib/character/parse-companion-stat-block"
import { usesPointPoolSpellcasting } from "@/lib/character/point-pool-spellcasting"
import {
  createModifierInstanceId,
  syncModifierRefs,
  type LinkedModifierInstance,
} from "@/lib/compendium/linked-modifiers"
import { characteristicCatalogRefId } from "@/lib/compendium/modifier-catalog-refs"
import { charInstance, modId } from "@/lib/compendium/modifier-instance-builders"
import type { ClassResourceImportRow } from "@/lib/import/enrich-import-classes"
import {
  enrichReagentResourceUses,
  remapResourceKeyInModifiers,
  resolveNamedPreset,
  resolveRemapTarget,
} from "@/lib/import/enrichment-presets/builders"
import { matchesEnrichment } from "@/lib/import/enrichment-presets/match"
import {
  getContentSeeds,
  getEnrichmentHook,
  getEnrichmentPresets,
} from "@/lib/import/enrichment-presets/registry"
import { sanitizeAlchemistImportContent } from "@/lib/import/enrichment-presets/packs/alchemist"
import { sanitizeCaptainImportContent } from "@/lib/import/enrichment-presets/packs/captain"
import { sanitizeGunslingerImportContent } from "@/lib/import/enrichment-presets/packs/gunslinger"
import { sanitizeInvestigatorImportContent, ensureInvestigatorRitualistFeature } from "@/lib/import/enrichment-presets/packs/investigator"
import {
  applyMartyrHitPointSpends,
  expandMartyrSacrificeFeatures,
} from "@/lib/import/enrichment-presets/packs/homebrew"
import { sanitizeNecromancerImportContent } from "@/lib/import/enrichment-presets/packs/necromancer"
import { sanitizeVagabondImportContent } from "@/lib/import/enrichment-presets/packs/vagabond"
import { sanitizeWarmageImportContent } from "@/lib/import/enrichment-presets/packs/warmage"
import { sanitizeOccultistImportContent } from "@/lib/import/enrichment-presets/packs/occultist"
import { sanitizeBeastheartImportContent } from "@/lib/import/enrichment-presets/packs/beastheart"
import { sanitizeKibblesWardenImportContent } from "@/lib/import/enrichment-presets/packs/kibbles-warden"
import { sanitizeInventorImportContent } from "@/lib/import/enrichment-presets/packs/inventor"
import { sanitizeAlternateSorcererImportContent } from "@/lib/import/enrichment-presets/packs/alternate-sorcerer"
import {
  sanitizeAlternateBarbarianImportContent,
  sanitizeLaserLlamaExploitsImportContent,
} from "@/lib/import/enrichment-presets/packs/alternate-barbarian"
import {
  sanitizeAlternateRangerImportContent,
  sanitizeLaserLlamaRangerKnacksImportContent,
} from "@/lib/import/enrichment-presets/packs/alternate-ranger"
import {
  sanitizeAlternateMonkImportContent,
  sanitizeLaserLlamaMonkTechniquesImportContent,
} from "@/lib/import/enrichment-presets/packs/alternate-monk"
import { sanitizeAlternateRogueImportContent } from "@/lib/import/enrichment-presets/packs/alternate-rogue"
import { sanitizeAlternateFighterImportContent } from "@/lib/import/enrichment-presets/packs/alternate-fighter"
import { sanitizeWitchImportContent } from "@/lib/import/enrichment-presets/packs/witch"
import { sanitizeCraftsmanMasteriesImportContent } from "@/lib/import/enrichment-presets/packs/craftsman"
import type {
  EnrichmentOperation,
  EnrichmentPreset,
  FeatureLike,
} from "@/lib/import/enrichment-presets/types"

const CLASS_ROW_PACKS = new Set([
  "monk",
  "alternate_ranger",
  "alternate_sorcerer",
  "warmage",
  "occultist",
  "beastheart",
  "kibbles_warden",
  "inventor",
  "dancer",
  "craftsman",
  "vagabond",
  "witch",
  "gunslinger",
  "captain",
  "martyr",
  "necromancer",
  "mhp_warden",
  "alchemist",
  "investigator",
])
const CONTENT_PACKS = new Set([
  "alchemist",
  "investigator",
  "psion",
  "warmage",
  "occultist",
  "beastheart",
  "kibbles_warden",
  "inventor",
  "dancer",
  "craftsman",
  "vagabond",
  "witch",
  "gunslinger",
  "captain",
  "martyr",
  "necromancer",
  "mhp_warden",
])

function presetsForPacks(packs: Set<string>, target?: EnrichmentPreset["target"]): EnrichmentPreset[] {
  return getEnrichmentPresets().filter(
    (preset) => packs.has(preset.pack) && (target == null || preset.target === target),
  )
}
import { parseCraftableItemsTable } from "@/lib/import/parse-craftable-items-table"
import { prefixedResourceKey, slugClassPrefix } from "@/lib/import/third-party-resources"
import type { ImportContent } from "@/lib/import/content-schema"
import type { Feature, FeatureActivation, UsesConfig } from "@/lib/types"

function castingTimeFromActivation(
  activation: FeatureActivation | null | undefined,
): string | null {
  if (!activation) return null
  if (activation.bonusAction) return "1 bonus action"
  if (activation.reaction) return "1 reaction"
  if (activation.onDropToZeroHp) return "when reduced to 0 HP"
  if (activation.action) return "1 action"
  return null
}

function hasCharacteristicType(
  modifiers: LinkedModifierInstance[] | undefined,
  types: string[] | undefined,
): boolean {
  if (!types?.length || !modifiers?.length) return false
  return modifiers.some((mod) =>
    mod.characteristics?.some((char) => types.includes(char.type)),
  )
}

function hasEffectKind(
  modifiers: LinkedModifierInstance[] | undefined,
  kinds: string[] | undefined,
): boolean {
  if (!kinds?.length || !modifiers?.length) return false
  return modifiers.some((mod) =>
    (mod.activation?.effects ?? []).some((effect) => kinds.includes(effect.kind)),
  )
}

function appendDescriptionOnce(description: string | null | undefined, text: string): string {
  const current = description ?? ""
  const marker = `\n\n${text}`
  const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const collapsed = current.replace(new RegExp(`(?:${escapedMarker}){2,}`, "g"), marker)
  if (collapsed.includes(text)) return collapsed.trim()
  return `${collapsed}${marker}`.trim()
}

function applyOperations(
  feature: FeatureLike,
  operations: EnrichmentOperation[],
  ctx: { className?: string; name?: string },
): FeatureLike {
  let next: FeatureLike = { ...feature }

  for (const operation of operations) {
    switch (operation.op) {
      case "appendDescription":
        next = {
          ...next,
          description: appendDescriptionOnce(next.description, operation.text),
        }
        break
      case "appendDescriptionTemplate": {
        const prefixed = prefixedResourceKey(
          slugClassPrefix(ctx.className ?? ""),
          operation.resourceKey,
        )
        const text = operation.template
          .replaceAll("{{prefixed:resource_key}}", prefixed)
          .replaceAll("{{resource_label}}", prefixed.replace(/_/g, " "))
        next = {
          ...next,
          description: appendDescriptionOnce(next.description, text),
        }
        break
      }
      case "setLimitedUses":
        next = { ...next, limitedUses: operation.uses ?? undefined }
        break
      case "clearLimitedUses":
        next = { ...next, limitedUses: undefined }
        break
      case "setUses":
        next = {
          ...next,
          uses: {
            ...(typeof next.uses === "object" && next.uses ? next.uses : {}),
            ...operation.uses,
          },
        }
        break
      case "setAbilityRole":
        next = { ...next, ability_role: operation.role }
        break
      case "setActivation":
        next = {
          ...next,
          activation: {
            ...(next.activation ?? {}),
            ...operation.activation,
          },
        }
        break
      case "setCastingTime":
        next = { ...next, casting_time: operation.castingTime }
        break
      case "setSheetDisplay":
        next = {
          ...next,
          sheetDisplay: {
            ...(next.sheetDisplay ?? {}),
            ...operation.sheetDisplay,
          },
        }
        break
      case "setChoices": {
        const base = next.choices ?? {
          category: "Skills",
          count: 2,
          options: [],
          swappableOnRest: true,
          swapRestType: "long" as const,
        }
        const presetOptions = operation.choices.options
        next = {
          ...next,
          isChoice: operation.isChoice ?? true,
          choices: {
            ...base,
            ...operation.choices,
            // Prefer preset options when provided (e.g. Curious Mind skill list with modifiers).
            options: presetOptions?.length ? presetOptions : (base.options ?? []),
            swappableOnRest: operation.choices.swappableOnRest ?? true,
            swapRestType: operation.choices.swapRestType ?? "long",
          },
        }
        break
      }
      case "attachNamedPreset": {
        if (hasCharacteristicType(next.linkedModifiers, operation.skipIfCharacteristicTypes)) {
          break
        }
        if (hasEffectKind(next.linkedModifiers, operation.skipIfEffectKinds)) {
          break
        }
        let baseModifiers = next.linkedModifiers ?? []
        if (operation.replaceCharacteristicTypes?.length) {
          baseModifiers = baseModifiers.filter(
            (mod) =>
              !mod.characteristics?.some((char) =>
                operation.replaceCharacteristicTypes!.includes(char.type),
              ),
          )
        }
        const attached = resolveNamedPreset(operation.preset, {
          className: ctx.className,
          name: ctx.name ?? next.name,
        })
        if (!attached.length) break
        const merged = {
          ...next,
          linkedModifiers: [...baseModifiers, ...attached],
        }
        // Match legacy psion Climactic Moment (no syncModifierRefs) when requested.
        next = operation.skipSyncRefs
          ? (merged as FeatureLike)
          : (syncModifierRefs(merged) as FeatureLike)
        break
      }
      case "remapResourceKeysInModifiers": {
        const toKey = resolveRemapTarget(operation.to, ctx.className ?? "")
        const remapped = remapResourceKeyInModifiers(
          next.linkedModifiers,
          operation.from,
          toKey,
        )
        if (remapped !== next.linkedModifiers) {
          next = syncModifierRefs({ ...next, linkedModifiers: remapped }) as FeatureLike
        }
        break
      }
      case "parseCraftableItemsTable": {
        const description = next.description ?? ""
        if (operation.descriptionGate && !operation.descriptionGate.test(description)) break
        const items = parseCraftableItemsTable(description)
        if (!items.length) break
        const catalogRefId =
          operation.catalogRefId ?? characteristicCatalogRefId("craftable_items")
        const instanceId = createModifierInstanceId()
        const attached = [
          charInstance(instanceId, catalogRefId, [
            {
              id: modId(operation.idKey),
              type: "craftable_items",
              category: operation.category,
              items,
              label: operation.label,
            } as never,
          ]),
        ]
        if (operation.resourceKey) {
          const menuOptions = items.flatMap((item) => [
            {
              name: `Brew ${item.itemName}`,
              description: `Create ${item.itemName}.`,
              resourceCost: item.resourceCost,
              unlocksAtLevel: item.unlocksAtClassLevel,
            },
            ...(operation.includeDistillOptions
              ? [
                  {
                    name: `Distill ${item.itemName}`,
                    description: `Destroy ${item.itemName} and recover the Reagents spent to brew it.`,
                    resourceCost: -item.resourceCost,
                    unlocksAtLevel: item.unlocksAtClassLevel,
                  },
                ]
              : []),
          ])
          attached.push(
            charInstance(
              createModifierInstanceId(),
              characteristicCatalogRefId("resource_ability_menu"),
              [
                {
                  id: modId(`${operation.idKey}_menu`),
                  type: "resource_ability_menu",
                  resourceKey: operation.resourceKey,
                  options: menuOptions,
                  label: operation.label,
                } as never,
              ],
            ),
          )
        }
        next = syncModifierRefs({
          ...next,
          linkedModifiers: [...(next.linkedModifiers ?? []), ...attached],
        }) as FeatureLike
        break
      }
      case "parseCompanionStatBlock": {
        if (next.companion_stat_block) break
        next = {
          ...next,
          companion_stat_block: parseCompanionStatBlock(next.name ?? "", next.description ?? ""),
        }
        break
      }
      case "ensureResourceRecharges": {
        // Applied on class_resource rows, not features — no-op here.
        break
      }
      default:
        break
    }
  }

  return next
}

function applyPresetToFeature(
  feature: FeatureLike,
  preset: EnrichmentPreset,
  ctx: {
    className?: string
    subclassClassName?: string
    sourceName?: string
    hasPointPool?: boolean
  },
): FeatureLike {
  if (
    !matchesEnrichment(preset.match, {
      className: ctx.className,
      subclassClassName: ctx.subclassClassName,
      name: feature.name,
      abilityRole: feature.ability_role,
      description: feature.description ?? undefined,
      sourceName: ctx.sourceName ?? feature.source_name,
      hasPointPool: ctx.hasPointPool,
    })
  ) {
    return feature
  }

  if (
    hasCharacteristicType(feature.linkedModifiers, preset.skipIfCharacteristicTypes)
  ) {
    return feature
  }

  if (preset.hookId) {
    const hook = getEnrichmentHook(preset.hookId)
    if (!hook) return feature
    const result = hook({
      content: {} as ImportContent,
      className: ctx.className,
      feature: feature as Feature,
      row: feature as unknown as Record<string, unknown>,
    })
    return (result.feature as unknown as FeatureLike | undefined)
      ?? (result.row as unknown as FeatureLike | undefined)
      ?? feature
  }

  return applyOperations(feature, preset.operations, {
    className: ctx.className,
    name: feature.name,
  })
}

function applyResourcePreset(
  resource: { class_name: string; resource_key: string; uses: UsesConfig } & Record<string, unknown>,
  preset: EnrichmentPreset,
): typeof resource {
  if (
    !matchesEnrichment(preset.match, {
      className: resource.class_name,
      resourceKey: resource.resource_key,
      name: String(resource.name ?? ""),
    })
  ) {
    return resource
  }

  let uses = resource.uses
  for (const operation of preset.operations) {
    if (operation.op === "ensureResourceRecharges") {
      uses = enrichReagentResourceUses(uses)
    }
    if (operation.op === "patchUsesFields") {
      uses = { ...uses, ...operation.fields }
    }
  }
  return uses === resource.uses ? resource : { ...resource, uses }
}

/** Apply class-scoped feature enrichment presets (replaces ranger/monk/sorcerer chain). */
export function enrichClassFeaturesWithPresets(
  features: Feature[],
  className: string,
  spellcasting?: unknown,
): Feature[] {
  const presets = presetsForPacks(CLASS_ROW_PACKS, "class_feature")
  const hasPointPool = usesPointPoolSpellcasting(
    spellcasting as import("@/lib/types").DndClass["spellcasting"],
  )

  const expanded = expandMartyrSacrificeFeatures(features, className)

  return expanded.map((feature) => {
    let next = feature as FeatureLike
    for (const preset of presets) {
      next = applyPresetToFeature(next, preset, { className, hasPointPool })
    }
    let enriched = next as Feature
    if (/investigator/i.test(className)) {
      enriched = ensureInvestigatorRitualistFeature(enriched)
    }
    enriched = applyMartyrHitPointSpends(enriched, className)
    return enriched
  })
}

/** Apply subclass-scoped feature enrichment presets (MHP houses, hexes, banners, …). */
export function enrichSubclassFeaturesWithPresets(
  features: Feature[],
  parentClassName: string,
  subclassName: string,
): Feature[] {
  const presets = getEnrichmentPresets().filter((preset) => preset.target === "subclass_feature")
  return features.map((feature) => {
    let next = feature as FeatureLike
    for (const preset of presets) {
      next = applyPresetToFeature(next, preset, {
        className: parentClassName,
        subclassClassName: parentClassName,
        sourceName: subclassName,
      })
    }
    return next as Feature
  })
}

/** Remap class resource keys via feat_modifiers / class_resource remap presets. */
export function remapImportedResourceKeyWithPresets(
  className: string,
  resourceKey: string,
): string {
  const presets = getEnrichmentPresets().filter(
    (preset) =>
      preset.target === "class_resource" &&
      preset.operations.some((op) => op.op === "remapResourceKeysInModifiers"),
  )
  // Dedicated resource-key remap presets use match.resourceKey + a synthetic op convention:
  // prefer explicit remap table from monk pack helpers.
  void presets
  if (/\bmonk\b/i.test(className) && className !== "Monk" && resourceKey === "ki_points") {
    return prefixedResourceKey(slugClassPrefix(className), "ki_points")
  }
  return resourceKey
}

export function remapKiKeysOnFeatRowsWithPresets<
  T extends { linkedModifiers?: LinkedModifierInstance[] },
>(feats: T[], classNames: string[]): T[] {
  const monkClass = classNames.find((name) => /\bmonk\b/i.test(name) && name !== "Monk")
  if (!monkClass) return feats
  const kiKey = prefixedResourceKey(slugClassPrefix(monkClass), "ki_points")
  return feats.map((feat) => {
    const remapped = remapResourceKeyInModifiers(feat.linkedModifiers, "ki_points", kiKey)
    if (remapped === feat.linkedModifiers) return feat
    return { ...feat, linkedModifiers: remapped }
  })
}

export function mergeClassResourcesWithPresets(
  className: string,
  features: Feature[],
  resources: ClassResourceImportRow[],
): ClassResourceImportRow[] {
  let next = [...resources]
  for (const seed of getContentSeeds()) {
    const spec = seed.seedClassResource
    if (!spec) continue
    if (!matchesEnrichment({ className: spec.className }, { className })) continue
    if (!features.some((feature) => matchesEnrichment({ name: spec.requiresFeatureName }, { name: feature.name }))) {
      continue
    }
    if (next.some((row) => row.resource_key === spec.resourceKey)) continue
    next = [...next, spec.build(className)]
  }
  return next
}

/** Content-wide enrichment (alchemist / investigator / psion + seeds). */
export function applyImportEnrichmentPresets(
  content: ImportContent,
  packs: Set<string> = CONTENT_PACKS,
): ImportContent {
  let next: ImportContent = { ...content }
  const presets = presetsForPacks(packs)

  if (next.classes?.length) {
    const enrichedClasses = next.classes.map((cls) => {
      const className = cls.name
      const features = expandMartyrSacrificeFeatures(
        (cls.features ?? []) as Feature[],
        className,
      ).map((feature) => {
        let row = feature as unknown as FeatureLike
        for (const preset of presets.filter((p) => p.target === "class_feature")) {
          row = applyPresetToFeature(row, preset, { className })
        }
        return row as unknown as (typeof cls.features)[number]
      })
      return { ...cls, features }
    })
    next = { ...next, classes: enrichedClasses }

    // Feature-gated class resource seeds (e.g. Guardian Tactics unlimited menu pool).
    let resources = [...(next.class_resources ?? [])] as ClassResourceImportRow[]
    for (const cls of enrichedClasses) {
      resources = mergeClassResourcesWithPresets(
        cls.name,
        (cls.features ?? []) as Feature[],
        resources,
      )
    }
    if (resources.length) {
      next = {
        ...next,
        class_resources: resources as NonNullable<ImportContent["class_resources"]>,
      }
    }
  }

  if (next.subclasses?.length) {
    next = {
      ...next,
      subclasses: next.subclasses.map((subclass) => {
        const parentClass = subclass.class_name || ""
        const features = (subclass.features ?? []).map((feature) => {
          let row = feature as unknown as FeatureLike
          for (const preset of presets.filter((p) => p.target === "subclass_feature")) {
            row = applyPresetToFeature(row, preset, {
              className: parentClass,
              subclassClassName: parentClass,
              sourceName: subclass.name,
            })
          }
          return row as unknown as (typeof subclass.features)[number]
        })
        return { ...subclass, features }
      }),
    }

    // Subclass-gated class resources (e.g. Balance of Power on Transcended Mind).
    let resources = [...(next.class_resources ?? [])] as ClassResourceImportRow[]
    for (const subclass of next.subclasses ?? []) {
      const parentClass = subclass.class_name || ""
      if (!parentClass) continue
      resources = mergeClassResourcesWithPresets(
        parentClass,
        (subclass.features ?? []) as Feature[],
        resources,
      )
    }
    if (resources.length) {
      next = {
        ...next,
        class_resources: resources as NonNullable<ImportContent["class_resources"]>,
      }
    }
  }

  if (next.import_proposals?.custom_abilities?.length) {
    next = {
      ...next,
      import_proposals: {
        ...next.import_proposals,
        custom_abilities: next.import_proposals.custom_abilities.map((ability) => {
          const record = ability as unknown as Record<string, unknown>
          let row = {
            name: ability.name,
            description: ability.description ?? "",
            ability_role: record.ability_role as string | undefined,
            source_name: ability.source_name,
            linkedModifiers:
              (record.linkedModifiers as FeatureLike["linkedModifiers"]) ??
              (record.linked_modifiers as FeatureLike["linkedModifiers"]),
            uses: record.uses as FeatureLike["uses"],
            companion_stat_block: record.companion_stat_block,
          } as FeatureLike
          for (const preset of presets.filter((p) => p.target === "proposal_ability")) {
            row = applyPresetToFeature(row, preset, {
              className: ability.source_name ?? undefined,
              sourceName: ability.source_name ?? undefined,
            })
          }
          const castingTime =
            row.casting_time?.trim() ||
            castingTimeFromActivation(row.activation) ||
            (typeof record.casting_time === "string" ? record.casting_time : null)
          const descriptionChanged =
            typeof row.description === "string" &&
            row.description !== (ability.description ?? "")
          const synced = row.linkedModifiers?.length
            ? (syncModifierRefs({
                ...ability,
                ability_role: row.ability_role,
                uses: row.uses,
                companion_stat_block: row.companion_stat_block,
                linkedModifiers: row.linkedModifiers,
                ...(castingTime ? { casting_time: castingTime } : {}),
                ...(descriptionChanged ? { description: row.description } : {}),
              }) as Record<string, unknown>)
            : null
          if (!synced) {
            const out: Record<string, unknown> = { ...ability }
            if (row.ability_role != null) out.ability_role = row.ability_role
            if (row.uses != null) out.uses = row.uses
            if (row.companion_stat_block != null) {
              out.companion_stat_block = row.companion_stat_block
            }
            if (castingTime) out.casting_time = castingTime
            if (descriptionChanged) out.description = row.description
            return out as unknown as typeof ability
          }
          return synced as unknown as typeof ability
        }),
      },
    }
  }

  const resourcePresets = presets.filter((p) => p.target === "class_resource")
  if (next.import_proposals?.class_resources?.length) {
    next = {
      ...next,
      import_proposals: {
        ...next.import_proposals,
        class_resources: next.import_proposals.class_resources.map((resource) =>
          resourcePresets.reduce(
            (row, preset) => applyResourcePreset(row as never, preset) as typeof resource,
            resource,
          ),
        ),
      },
    }
  }
  if (next.class_resources?.length) {
    next = {
      ...next,
      class_resources: next.class_resources.map((resource) =>
        resourcePresets.reduce(
          (row, preset) => applyResourcePreset(row as never, preset) as typeof resource,
          resource,
        ),
      ),
    }
  }

  next = patchInitiativeRechargeFromFeatures(next)
  next = sanitizeAlchemistImportContent(next)
  next = sanitizeCaptainImportContent(next)
  next = sanitizeGunslingerImportContent(next)
  next = sanitizeCraftsmanMasteriesImportContent(next)
  next = sanitizeInvestigatorImportContent(next)
  next = sanitizeNecromancerImportContent(next)
  next = sanitizeVagabondImportContent(next)
  next = sanitizeWarmageImportContent(next)
  next = sanitizeOccultistImportContent(next)
  next = sanitizeBeastheartImportContent(next)
  next = sanitizeKibblesWardenImportContent(next)
  next = sanitizeInventorImportContent(next)
  next = sanitizeAlternateSorcererImportContent(next)
  next = sanitizeAlternateBarbarianImportContent(next)
  next = sanitizeAlternateMonkImportContent(next)
  next = sanitizeAlternateRogueImportContent(next)
  next = sanitizeAlternateFighterImportContent(next)
  // Exploits after Alternate Barbarian/Monk/Rogue/Fighter so eligibility is already normalized.
  next = sanitizeLaserLlamaExploitsImportContent(next)
  next = sanitizeLaserLlamaMonkTechniquesImportContent(next)
  next = sanitizeAlternateRangerImportContent(next)
  next = sanitizeLaserLlamaRangerKnacksImportContent(next)
  next = sanitizeWitchImportContent(next)

  return next
}

/** Feature-gated initiative restores that must not apply from the level table alone. */
function patchInitiativeRechargeFromFeatures(content: ImportContent): ImportContent {
  const stripInitiative = (uses: UsesConfig): UsesConfig => {
    if (uses.rechargeOnInitiative == null) return uses
    const { rechargeOnInitiative: _drop, ...rest } = uses
    return rest
  }

  const patchRows = <T extends { class_name?: string; className?: string; resource_key?: string; resourceKey?: string; uses: UsesConfig }>(
    rows: T[] | undefined,
  ): { rows: T[]; changed: boolean } => {
    if (!rows?.length) return { rows: rows ?? [], changed: false }
    let changed = false
    const nextRows = rows.map((row) => {
      const resourceKey = row.resource_key ?? row.resourceKey ?? ""
      // Level-gated restores (Dire Gambit, Empowered Endurance, Master Warmage) live on
      // the feature as resourceRefreshOnInitiative — never on the pool itself.
      if (
        resourceKey === "risk_dice" ||
        resourceKey === "endurance_dice" ||
        resourceKey === "arcane_surge"
      ) {
        if (row.uses.rechargeOnInitiative != null) {
          changed = true
          return { ...row, uses: stripInitiative(row.uses) }
        }
        return row
      }
      return row
    })
    return { rows: nextRows, changed }
  }

  let next = content
  const classResources = patchRows(next.class_resources)
  if (classResources.changed) {
    next = { ...next, class_resources: classResources.rows }
  }
  const proposals = next.import_proposals?.class_resources
  if (proposals?.length) {
    const patched = patchRows(
      proposals.map((row) => ({
        ...row,
        class_name: row.class_name,
        resource_key: row.resource_key,
        uses: row.uses,
      })),
    )
    if (patched.changed) {
      next = {
        ...next,
        import_proposals: {
          ...next.import_proposals!,
          class_resources: patched.rows as typeof proposals,
        },
      }
    }
  }
  return next
}
