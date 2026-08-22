import { applyFeatureSheetDisplay } from "@/lib/compendium/feature-sheet-display"
import { enrichClassFeatureWithResource } from "@/lib/compendium/class-resource-features"
import {
  enrichClassFeatureWithModifierPresets,
  monkToolProficiencyChoice,
} from "@/lib/compendium/enrich-srd-class-features"
import { defaultClassIconForName } from "@/lib/compendium/class-icons-defaults"
import { SRD_CLASS_CARD_IMAGES_BY_NAME } from "@/lib/compendium/class-card-images-defaults"
import { applyBundledCardImage } from "@/lib/compendium/card-image"
import { wireClassToolProficiencyChoices } from "@/lib/compendium/class-tool-proficiencies"
import { applySrdFlavorDescription } from "@/lib/compendium/srd-flavor-descriptions"
import { migrateFeatureFeatChoiceToModifierRefs } from "@/lib/compendium/grant-feat-catalog"
import { ensureMilestoneGrantFeatFeatures } from "@/lib/compendium/ensure-asi-milestone-features"
import {
  type LinkedModifierInstance,
} from "@/lib/compendium/linked-modifiers"
import { defaultClassComplexityForName, isClassComplexity } from "@/lib/compendium/class-complexity"
import { applyWeaponMasteryProficiencies } from "@/lib/compendium/weapon-mastery-choice"
import { ensureSubclassUnlockFeature } from "@/lib/compendium/subclass-unlock-modifier"
import type { Feature } from "@/lib/types"

const SRD_SUBCLASS_FEATURE_NAMES: Record<string, string> = {
  Barbarian: "Primal Path",
  Bard: "Bard College",
  Cleric: "Divine Domain",
  Druid: "Druid Circle",
  Fighter: "Martial Archetype",
  Monk: "Monastic Tradition",
  Paladin: "Sacred Oath",
  Ranger: "Ranger Archetype",
  Rogue: "Roguish Archetype",
  Sorcerer: "Sorcerous Origin",
  Warlock: "Otherworldly Patron",
  Wizard: "Arcane Tradition",
}

function uniqueRefs(refs: string[]): string[] {
  return [...new Set(refs)]
}

function enrichFeature(className: string, feature: Feature): Feature {
  let next = migrateFeatureFeatChoiceToModifierRefs(feature)
  next = enrichClassFeatureWithResource(className, next)
  next = enrichClassFeatureWithModifierPresets(className, next)
  return applyFeatureSheetDisplay(next)
}

function enrichFeatures(className: string, features: unknown): Feature[] {
  if (!Array.isArray(features)) return []
  const mapped = features.map((raw) => enrichFeature(className, raw as Feature))
  return ensureMilestoneGrantFeatFeatures(mapped)
}

/**
 * Class-level weapon proficiency overrides where the SRD wording carries a
 * qualifier the parser flattens away (e.g. Monk's Light-only Martial weapons).
 */
const SRD_CLASS_WEAPON_PROFICIENCY_OVERRIDES: Record<string, string[]> = {
  Monk: ["Simple weapons", "Martial weapons that have the Light property"],
  Rogue: ["Simple weapons", "Martial weapons that have the Finesse or Light property"],
}

function appendLinkedModifier(feature: Feature, instance: LinkedModifierInstance): Feature {
  const existing = feature.linkedModifiers ?? []
  if (existing.some((entry) => entry.instanceId === instance.instanceId)) return feature
  return {
    ...feature,
    linkedModifiers: [...existing, instance],
    modifierRefs: uniqueRefs([...(feature.modifierRefs ?? []), instance.catalogRefId]),
  }
}

/** Wire class-level proficiency choices that attach to a level-1 feature. */
function injectClassProficiencyChoices(className: string, features: Feature[]): Feature[] {
  if (className !== "Monk") return features
  // Monk: "Choose one type of Artisan's Tools or Musical Instrument".
  const target =
    features.find((feature) => feature.level === 1 && /martial arts/i.test(feature.name ?? "")) ??
    features.find((feature) => feature.level === 1)
  if (!target) return features
  const toolChoice = monkToolProficiencyChoice()
  return features.map((feature) =>
    feature === target ? appendLinkedModifier(feature, toolChoice) : feature,
  )
}

function normalizeSpellcasting(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null
  const spellcasting = { ...(raw as unknown as Record<string, unknown>) }
  if (spellcasting.starts_at == null) spellcasting.starts_at = 1
  return spellcasting
}

/** Apply SRD defaults: feat-granting modifier refs, icons, spellcasting starts_at. */
export function enrichSrdClassRow(row: Record<string, unknown>): Record<string, unknown> {
  const name = String(row.name ?? "")
  const features = ensureSubclassUnlockFeature(
    {
      name,
      features: injectClassProficiencyChoices(name, enrichFeatures(name, row.features)),
    },
    3,
    SRD_SUBCLASS_FEATURE_NAMES[name] ?? "Subclass",
  )
  const icon =
    typeof row.icon === "string" && row.icon.trim()
      ? row.icon.trim()
      : defaultClassIconForName(name)
  const weaponProficiencyOverride = SRD_CLASS_WEAPON_PROFICIENCY_OVERRIDES[name]
  const complexity = isClassComplexity(row.complexity)
    ? row.complexity
    : defaultClassComplexityForName(
        name,
        typeof row.source === "string" ? row.source : null,
      )

  return wireClassToolProficiencyChoices(
    applySrdFlavorDescription(
      applyBundledCardImage(
        applyWeaponMasteryProficiencies({
          ...row,
          icon,
          features,
          ...(complexity ? { complexity } : {}),
          ...(weaponProficiencyOverride ? { weapon_proficiencies: weaponProficiencyOverride } : {}),
          spellcasting: normalizeSpellcasting(row.spellcasting),
        }),
        SRD_CLASS_CARD_IMAGES_BY_NAME,
      ),
      "class",
    ),
  )
}

export function enrichSrdClassList(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(enrichSrdClassRow)
}
