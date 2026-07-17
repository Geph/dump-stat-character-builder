import { GRANT_CREATURE_CATALOG_ID, grantCreatureCharacteristic } from "@/lib/compendium/grant-creature-catalog"
import { charInstance, modId } from "@/lib/compendium/modifier-instance-builders"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"

/**
 * Magic items that summon / become creatures — grant_creature magic_effects
 * so they appear on the Companions tab when the item is in inventory.
 */

function grantCreature(
  instanceKey: string,
  creatureNames: string[],
  options?: { choiceOptions?: string[]; count?: number; label?: string },
): LinkedModifierInstance {
  return charInstance(`modinst_${instanceKey}`, GRANT_CREATURE_CATALOG_ID, [
    {
      ...grantCreatureCharacteristic(creatureNames, {
        choiceOptions: options?.choiceOptions,
        count: options?.count,
      }),
      id: modId(instanceKey),
      ...(options?.label ? { label: options.label } : {}),
    },
  ])
}

export const SRD_MAGIC_ITEM_SUMMON_CREATURE_PRESETS: Record<string, LinkedModifierInstance[]> = {
  "Ring of Djinni Summoning": [
    grantCreature("ring_djinni", ["Djinni"], { label: "Djinni (Ring of Djinni Summoning)" }),
  ],
  "Efreeti Bottle": [
    grantCreature("efreeti_bottle", ["Efreeti"], { label: "Efreeti (Efreeti Bottle)" }),
  ],
  "Figurine of Wondrous Power": [
    grantCreature("figurine_wondrous", ["Griffon", "Giant Fly"], {
      choiceOptions: ["Griffon", "Giant Fly"],
      count: 1,
      label: "Figurine creature (Bronze Griffon or Ebony Fly)",
    }),
  ],
  "Feather Token": [
    grantCreature("feather_token_roc", ["Roc"], {
      label: "Roc (Bird Feather Token — can't attack)",
    }),
  ],
  "Mysterious Deck": [
    grantCreature("mysterious_deck_knight", ["Knight"], {
      label: "Knight (Mysterious Deck card)",
    }),
  ],
  "Horn of Valhalla": [
    grantCreature("horn_valhalla", ["Berserker"], {
      label: "Warrior spirits (Berserker)",
    }),
  ],
  "Staff of the Python": [
    grantCreature("staff_python", ["Giant Constrictor Snake"], {
      label: "Giant Constrictor Snake",
    }),
  ],
  "Bowl of Commanding Water Elementals": [
    grantCreature("bowl_water_elemental", ["Water Elemental"], { label: "Water Elemental" }),
  ],
  "Brazier of Commanding Fire Elementals": [
    grantCreature("brazier_fire_elemental", ["Fire Elemental"], { label: "Fire Elemental" }),
  ],
  "Censer of Controlling Air Elementals": [
    grantCreature("censer_air_elemental", ["Air Elemental"], { label: "Air Elemental" }),
  ],
  "Stone of Controlling Earth Elementals": [
    grantCreature("stone_earth_elemental", ["Earth Elemental"], { label: "Earth Elemental" }),
  ],
  "Elemental Gem": [
    grantCreature(
      "elemental_gem",
      ["Air Elemental", "Earth Elemental", "Fire Elemental", "Water Elemental"],
      {
        choiceOptions: ["Air Elemental", "Earth Elemental", "Fire Elemental", "Water Elemental"],
        count: 1,
        label: "Elemental (gem color determines type)",
      },
    ),
  ],
}

export function magicItemSummonCreaturePresets(itemName: string): LinkedModifierInstance[] | null {
  return SRD_MAGIC_ITEM_SUMMON_CREATURE_PRESETS[itemName.trim()] ?? null
}
