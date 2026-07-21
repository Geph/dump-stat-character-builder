/**
 * Declarative import enrichment presets.
 *
 * Prefer data here over class-specific enricher modules. Match criteria + operations
 * replace hand-written chains in enrich-import-classes / enrich-import-modifiers.
 */
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { ClassResourceImportRow } from "@/lib/import/enrich-import-classes"
import type { ImportContent } from "@/lib/import/content-schema"
import type { Feature, FeatureChoice, UsesConfig } from "@/lib/types"

export type EnrichmentMatch = {
  /** Class / source name must match (string = case-insensitive equality, RegExp = test). */
  className?: string | RegExp
  /** Exact class name that must NOT match (e.g. SRD "Monk"). */
  classNameExcludeExact?: string
  /** Subclass parent class_name gate. */
  subclassClassName?: string | RegExp
  /** Feature / ability / proposal name. */
  name?: string | RegExp
  /** Ability role on proposal abilities. */
  abilityRole?: string | RegExp
  /** Description must match. */
  description?: RegExp
  /** Source name on proposal abilities. */
  sourceName?: string | RegExp
  /** Class resource key. */
  resourceKey?: string
  /** Require point-pool spellcasting (or optional classNameAlternate). */
  requiresPointPool?: boolean
  /** When requiresPointPool is false, still match if className matches this. */
  classNameWhenNoPointPool?: string | RegExp
}

export type NamedModifierPreset =
  | { kind: "innate_arcanum"; tiers: { spellLevel: number; classLevel: number }[] }
  | { kind: "innate_sorcery" }
  | { kind: "alchemist_bomb"; damageTypes?: string[] }
  | { kind: "alchemist_bomb_formula_from_name" }
  | { kind: "investigator_finisher" }
  | { kind: "investigator_improved_finisher" }
  | { kind: "climactic_moment_influence" }
  | { kind: "monk_unarmored_defense" }
  | { kind: "quarry_on_hit" }
  | { kind: "held_items_cap"; flatBonus?: number; baseAbility?: string; label?: string; idKey: string }
  | { kind: "craftable_items_static"; idKey: string; label: string; category: string; items: unknown[] }
  | {
      kind: "char_instance"
      idKey: string
      catalogRefId: string
      characteristics: unknown[]
    }

export type EnrichmentOperation =
  | { op: "appendDescription"; text: string }
  | {
      op: "appendDescriptionTemplate"
      /** Supports {{prefixed:resource_key}} and {{resource_label}} */
      template: string
      resourceKey: string
    }
  | { op: "setLimitedUses"; uses: UsesConfig | null | undefined }
  | { op: "clearLimitedUses" }
  | { op: "setUses"; uses: UsesConfig }
  | { op: "setAbilityRole"; role: string }
  | { op: "setChoices"; isChoice?: boolean; choices: FeatureChoice }
  | {
      op: "setActivation"
      activation: NonNullable<Feature["activation"]>
    }
  | {
      op: "setSheetDisplay"
      sheetDisplay: NonNullable<Feature["sheetDisplay"]>
    }
  | {
      op: "attachNamedPreset"
      preset: NamedModifierPreset
      skipIfCharacteristicTypes?: string[]
      /** Drop existing linkedModifiers that include these characteristic types before attaching. */
      replaceCharacteristicTypes?: string[]
      /** When true, do not call syncModifierRefs (legacy psion Climactic Moment). */
      skipSyncRefs?: boolean
    }
  | {
      op: "remapResourceKeysInModifiers"
      from: string
      /** Literal key, or `prefixed:<base>` using class slug prefix. */
      to: string
    }
  | {
      op: "parseCraftableItemsTable"
      idKey: string
      catalogRefId?: string
      label: string
      category: string
      descriptionGate?: RegExp
    }
  | { op: "parseCompanionStatBlock" }
  | {
      op: "ensureResourceRecharges"
      /** Prepend synthesis-style ability_modifier short rest if missing. */
      synthesisAbility?: "INT" | "WIS" | "CHA" | "STR" | "DEX" | "CON"
      ensureLongRest?: boolean
    }
  | {
      op: "patchUsesFields"
      fields: Partial<UsesConfig>
    }

export type EnrichmentTarget =
  | "class_feature"
  | "subclass_feature"
  | "proposal_ability"
  | "class_resource"
  | "feat_modifiers"
  | "content"

export type EnrichmentPreset = {
  id: string
  /** Pack label for docs / inventory (e.g. "alchemist"). */
  pack: string
  target: EnrichmentTarget
  match: EnrichmentMatch
  operations: EnrichmentOperation[]
  /** Skip the entire preset when linked modifiers already include these characteristic types. */
  skipIfCharacteristicTypes?: string[]
  /**
   * Category (c) hook id — when set, operations are ignored and the registered hook runs.
   * Prefer empty; use only when logic cannot be expressed as operations.
   */
  hookId?: string
}

export type EnrichmentHookContext = {
  content: ImportContent
  className?: string
  spellcasting?: unknown
  feature?: Feature
  row?: Record<string, unknown>
}

export type EnrichmentHook = (ctx: EnrichmentHookContext) => EnrichmentHookContext

export type ContentSeed = {
  id: string
  pack: string
  /** Append class resource when class matches and a named feature exists. */
  seedClassResource?: {
    className: string | RegExp
    requiresFeatureName: string | RegExp
    resourceKey: string
    build: (className: string) => ClassResourceImportRow
  }
}

export type FeatureLike = Feature & {
  linkedModifiers?: LinkedModifierInstance[]
  ability_role?: string
  source_name?: string
  companion_stat_block?: unknown
  uses?: UsesConfig
}
