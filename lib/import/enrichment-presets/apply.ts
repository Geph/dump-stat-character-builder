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
import type {
  EnrichmentOperation,
  EnrichmentPreset,
  FeatureLike,
} from "@/lib/import/enrichment-presets/types"

const CLASS_ROW_PACKS = new Set(["monk", "alternate_ranger", "alternate_sorcerer"])
const CONTENT_PACKS = new Set(["alchemist", "investigator", "psion"])

function presetsForPacks(packs: Set<string>, target?: EnrichmentPreset["target"]): EnrichmentPreset[] {
  return getEnrichmentPresets().filter(
    (preset) => packs.has(preset.pack) && (target == null || preset.target === target),
  )
}
import { parseCraftableItemsTable } from "@/lib/import/parse-craftable-items-table"
import { prefixedResourceKey, slugClassPrefix } from "@/lib/import/third-party-resources"
import type { ImportContent } from "@/lib/import/content-schema"
import type { Feature, UsesConfig } from "@/lib/types"

function hasCharacteristicType(
  modifiers: LinkedModifierInstance[] | undefined,
  types: string[] | undefined,
): boolean {
  if (!types?.length || !modifiers?.length) return false
  return modifiers.some((mod) =>
    mod.characteristics?.some((char) => types.includes(char.type)),
  )
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
          description: `${next.description ?? ""}\n\n${operation.text}`.trim(),
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
          description: `${next.description ?? ""}\n\n${text}`.trim(),
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
      case "setChoices": {
        const base = next.choices ?? {
          category: "Skills",
          count: 2,
          options: [],
          swappableOnRest: true,
          swapRestType: "long" as const,
        }
        next = {
          ...next,
          isChoice: operation.isChoice ?? true,
          choices: {
            ...base,
            ...operation.choices,
            options: base.options?.length ? base.options : operation.choices.options,
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
        const attached = resolveNamedPreset(operation.preset, {
          className: ctx.className,
          name: ctx.name ?? next.name,
        })
        if (!attached.length) break
        const merged = {
          ...next,
          linkedModifiers: [...(next.linkedModifiers ?? []), ...attached],
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
        next = syncModifierRefs({
          ...next,
          linkedModifiers: [
            ...(next.linkedModifiers ?? []),
            charInstance(instanceId, catalogRefId, [
              {
                id: modId(operation.idKey),
                type: "craftable_items",
                category: operation.category,
                items,
                label: operation.label,
              } as never,
            ]),
          ],
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

  return features.map((feature) => {
    let next = feature as FeatureLike
    for (const preset of presets) {
      next = applyPresetToFeature(next, preset, { className, hasPointPool })
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
    next = {
      ...next,
      classes: next.classes.map((cls) => {
        const className = cls.name
        const features = (cls.features ?? []).map((feature) => {
          let row = feature as unknown as FeatureLike
          for (const preset of presets.filter((p) => p.target === "class_feature")) {
            row = applyPresetToFeature(row, preset, { className })
          }
          return row as unknown as (typeof cls.features)[number]
        })
        return { ...cls, features }
      }),
    }
  }

  if (next.subclasses?.length) {
    next = {
      ...next,
      subclasses: next.subclasses.map((subclass) => {
        // Legacy: enrich when class_name is empty OR matches /psion/i
        if (subclass.class_name && !/psion/i.test(subclass.class_name)) {
          return subclass
        }
        const features = (subclass.features ?? []).map((feature) => {
          let row = feature as unknown as FeatureLike
          for (const preset of presets.filter((p) => p.target === "subclass_feature")) {
            row = applyPresetToFeature(row, preset, {
              className: subclass.class_name || "Psion",
              subclassClassName: subclass.class_name || "Psion",
            })
          }
          return row as unknown as (typeof subclass.features)[number]
        })
        return { ...subclass, features }
      }),
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
          const synced = row.linkedModifiers?.length
            ? (syncModifierRefs({
                ...ability,
                ability_role: row.ability_role,
                uses: row.uses,
                companion_stat_block: row.companion_stat_block,
                linkedModifiers: row.linkedModifiers,
              }) as Record<string, unknown>)
            : null
          if (!synced) {
            const out: Record<string, unknown> = { ...ability }
            if (row.ability_role != null) out.ability_role = row.ability_role
            if (row.uses != null) out.uses = row.uses
            if (row.companion_stat_block != null) {
              out.companion_stat_block = row.companion_stat_block
            }
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

  return next
}
