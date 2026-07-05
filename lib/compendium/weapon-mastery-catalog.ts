import { legacyFeatureOptionPickerCharacteristic } from "@/lib/compendium/feature-option-choice-migration"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import { createModifierInstanceId } from "@/lib/compendium/linked-modifiers"

/** Reusable common-modifier template for Weapon Mastery picks (SRD martial classes). */
export const WEAPON_MASTERY_CATALOG_ID = "cat_char_weapon_mastery"

export function buildWeaponMasteryCatalogEntry(): ModifierCatalogEntry {
  return {
    id: WEAPON_MASTERY_CATALOG_ID,
    name: "Weapon Mastery",
    group: "Feats & choices",
    summary: "Passive: pick weapon types whose mastery properties you can use (count scales via class table)",
    description:
      "<p>Link this template to a class feature named <strong>Weapon Mastery</strong>. " +
      "The builder shows one pick per slot from compendium weapons that have a mastery property. " +
      "Slot count scales via <code>choices.choiceCountByLevel</code> on the feature (legacy <code>resourceKey: weapon_mastery</code> still supported).</p>",
    characteristics: [
      legacyFeatureOptionPickerCharacteristic({
        id: "mod_weapon_mastery",
        category: "Weapon Mastery",
        choiceCount: 1,
        swappableOnRest: true,
        label: "Weapon types with mastery",
      }),
    ],
  }
}

export function buildWeaponMasteryModifierInstance(
  instanceId = createModifierInstanceId(),
): LinkedModifierInstance {
  return {
    instanceId,
    catalogRefId: WEAPON_MASTERY_CATALOG_ID,
    characteristics: buildWeaponMasteryCatalogEntry().characteristics ?? [],
  }
}
