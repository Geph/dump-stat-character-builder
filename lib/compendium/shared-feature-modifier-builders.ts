import type { FeatPickCategory } from "@/lib/compendium/class-feature-metadata"
import { GRANT_FEAT_CATALOG_ID, grantFeatCharacteristic } from "@/lib/compendium/grant-feat-catalog"
import { charInstance, fxInstance, modId } from "@/lib/compendium/modifier-instance-builders"
import { createModifierInstanceId, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"

const DAMAGE_REDUCTION_CATALOG_ID = "cat_fx_damage_reduction"
const FEATURE_OPTION_PICKER_CATALOG_ID = "cat_char_feature_option_picker"

export function buildGrantFeatModifier(
  categories: FeatPickCategory[],
  label: string,
  instanceId = createModifierInstanceId(),
): LinkedModifierInstance {
  const characteristic = grantFeatCharacteristic(categories, 1)
  characteristic.label = label
  return charInstance(instanceId, GRANT_FEAT_CATALOG_ID, [characteristic])
}

/** Dex-save Evasion: no damage on successful save, half on failed (SRD Rogue/Monk). */
export function buildEvasionModifier(instanceId = "modinst_evasion"): LinkedModifierInstance {
  return fxInstance(instanceId, DAMAGE_REDUCTION_CATALOG_ID, {
    effects: [
      {
        id: modId("evasion"),
        kind: "damage_reduction",
        mitigation: "reduction",
        defensiveSaveScope: true,
        checkCategory: "save",
        checkAbility: "Dexterity",
        defensiveSaveSuccess: "none",
      },
    ],
  })
}

/**
 * Weapon Mastery (SRD p.89): pick weapon types whose mastery properties you can use.
 * Slot count scales via class_resources.weapon_mastery from the class table.
 */
export function buildWeaponMasteryModifier(
  instanceId = "modinst_weapon_mastery",
): LinkedModifierInstance {
  return charInstance(instanceId, FEATURE_OPTION_PICKER_CATALOG_ID, [
    {
      id: modId("weapon_mastery"),
      type: "feature_option_picker",
      category: "Weapon Mastery",
      choiceCount: 1,
      resourceKey: "weapon_mastery",
      swappableOnRest: true,
      label: "Weapon types with mastery (count scales on class table)",
    },
  ])
}
