import { applyNamedItemIcon, SRD_FEAT_ICONS_BY_NAME } from "@/lib/compendium/srd-item-icons-defaults"
import {
  applyFeatMechanicalDetection,
  applyFeatNamePreset,
  resolveFeatNamePreset,
} from "@/lib/compendium/apply-feat-name-preset"
import {
  FEAT_MODIFIER_PRESETS,
  type FeatModifierPreset,
} from "@/lib/compendium/feat-modifier-presets"
export { FEAT_MODIFIER_CATALOG, SRD_FEAT_MODIFIER_PRESETS } from "@/lib/compendium/feat-modifier-presets"
import { type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import { isSrdSource } from "@/lib/srd/source"

function isLegacySkilledRow(row: Record<string, unknown>): boolean {
  if (String(row.name ?? "") !== "Skilled") return false
  if (Boolean(row.is_choice ?? row.isChoice)) return true
  const linked = (row.linkedModifiers ?? row.linked_modifiers) as LinkedModifierInstance[] | undefined
  if (!Array.isArray(linked)) return false
  return linked.some((item) =>
    item.characteristics?.some(
      (mod) =>
        mod.type === "skills" &&
        (mod as { choiceCount?: number }).choiceCount === 3 &&
        !(mod as { sharedChoiceGroup?: string }).sharedChoiceGroup,
    ),
  )
}

function migrateSkilledRow(row: Record<string, unknown>, preset: FeatModifierPreset): Record<string, unknown> {
  const linked = preset.linkedModifiers ?? []
  return {
    ...row,
    is_choice: false,
    isChoice: false,
    choices: null,
    linked_modifiers: linked,
    linkedModifiers: linked,
    modifier_refs: linked.map((instance) => instance.catalogRefId),
    modifierRefs: linked.map((instance) => instance.catalogRefId),
    benefits: row.benefits ?? null,
    repeatable: row.repeatable ?? preset.repeatable ?? false,
  }
}

/** Apply bundled feat modifier presets when not already configured. */
export function enrichSrdFeatRow(row: Record<string, unknown>): Record<string, unknown> {
  return applyNamedItemIcon(enrichSrdFeatRowCore(row), SRD_FEAT_ICONS_BY_NAME)
}

function enrichSrdFeatRowCore(row: Record<string, unknown>): Record<string, unknown> {
  if (!isSrdSource(row.source as string | null | undefined)) return row
  const name = String(row.name ?? "")
  const preset = FEAT_MODIFIER_PRESETS[name] ?? resolveFeatNamePreset(name)

  if (name === "Skilled" && isLegacySkilledRow(row) && preset?.linkedModifiers) {
    return applyFeatMechanicalDetection(migrateSkilledRow(row, preset))
  }

  if (preset) {
    return applyFeatNamePreset(row)
  }

  return applyFeatMechanicalDetection(row)
}

export function enrichSrdFeatList(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(enrichSrdFeatRow)
}

/** Resolve SRD bundled preset by feat name (for tests / tooling). */
export function presetForFeatName(name: string): FeatModifierPreset | undefined {
  return FEAT_MODIFIER_PRESETS[name]
}
