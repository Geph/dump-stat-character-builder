import { GRANT_CREATURE_CATALOG_ID, grantCreatureCharacteristic } from "@/lib/compendium/grant-creature-catalog"
import { charInstance, modId } from "@/lib/compendium/modifier-instance-builders"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import { FIND_FAMILIAR_FORMS } from "@/lib/character/companion-form-options"

/**
 * SRD spell presets that grant Creatures & Companions entries via grant_creature.
 * Applied at seed/enrich time onto spell.linkedModifiers (Summon Creature section).
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

/** Name → linked modifier presets for summon / animate / awaken spells. */
export const SRD_SPELL_SUMMON_CREATURE_PRESETS: Record<string, LinkedModifierInstance[]> = {
  "Find Familiar": [
    grantCreature("find_familiar", [...FIND_FAMILIAR_FORMS], {
      choiceOptions: [...FIND_FAMILIAR_FORMS],
      count: 1,
      label: "Familiar form (Celestial, Fey, or Fiend spirit)",
    }),
  ],
  "Find Steed": [
    grantCreature("find_steed", ["Otherworldly Steed"], {
      label: "Otherworldly Steed",
    }),
  ],
  "Summon Dragon": [
    grantCreature("summon_dragon", ["Draconic Spirit"], {
      label: "Draconic Spirit",
    }),
  ],
  "Giant Insect": [
    grantCreature("giant_insect", ["Giant Insect"], {
      label: "Giant Insect (centipede, spider, or wasp)",
    }),
  ],
  "Animate Dead": [
    grantCreature("animate_dead", ["Skeleton", "Zombie"], {
      choiceOptions: ["Skeleton", "Zombie"],
      count: 1,
      label: "Animated Undead (Skeleton or Zombie)",
    }),
  ],
  "Create Undead": [
    grantCreature("create_undead", ["Ghoul", "Ghast", "Wight", "Mummy"], {
      choiceOptions: ["Ghoul", "Ghast", "Wight", "Mummy"],
      count: 1,
      label: "Created Undead (slot level may unlock stronger options)",
    }),
  ],
  Awaken: [
    grantCreature("awaken", ["Awakened Shrub", "Awakened Tree"], {
      choiceOptions: ["Awakened Shrub", "Awakened Tree"],
      count: 1,
      label: "Awakened plant (Beast targets keep their own stats)",
    }),
  ],
}

export function spellSummonCreaturePresets(spellName: string): LinkedModifierInstance[] | null {
  const key = spellName.trim()
  return SRD_SPELL_SUMMON_CREATURE_PRESETS[key] ?? null
}
