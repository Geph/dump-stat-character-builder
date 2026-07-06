import { charInstance, fxInstance, modId, usesInstance } from "@/lib/compendium/modifier-instance-builders"
import { createModifierInstanceId } from "@/lib/compendium/linked-modifiers"
import { syncModifierRefs } from "@/lib/compendium/linked-modifiers"
import { innateArcanumPresetForClass } from "@/lib/compendium/enrich-srd-class-features"
import type { ImportContent } from "@/lib/import/content-schema"
import type { Equipment, Feature } from "@/lib/types"

const TRINKETS_KEY = "trinkets"
const ON_HIT_TRIGGER_CATALOG = "cat_char_on_hit_trigger"
const EXTRA_DAMAGE_CATALOG = "cat_fx_extra_damage_on_hit"
const FORCE_SAVE_CATALOG = "cat_fx_force_save_control"
const HEAL_SELF_CATALOG = "cat_fx_heal_self"
const BOOST_AC_CATALOG = "cat_fx_boost_ac"

function isInvestigator(name: string | null | undefined): boolean {
  return /investigator/i.test(name ?? "")
}

function trinketUsesInstance(label: string) {
  return usesInstance(
    createModifierInstanceId(),
    {
      type: "class_resource",
      classResourceKey: TRINKETS_KEY,
      classResourceAmount: 1,
    },
    label,
  )
}

function holyTrinketEquipment(
  name: string,
  description: string,
  activation: ReturnType<typeof fxInstance>,
): NonNullable<ImportContent["equipment"]>[number] {
  return {
    name,
    category: "Adventuring Gear",
    subcategory: null,
    description: `Wondrous Item, uncommon (requires attunement by an Investigator)\n\n${description}`,
    magic_item_category: "Wondrous Item",
    rarity: "Uncommon",
    requires_attunement: true,
    magic_effects: [trinketUsesInstance(name), activation],
  }
}

function coreHolyTrinkets(): NonNullable<ImportContent["equipment"]> {
  return [
    holyTrinketEquipment(
      "Amulet of Warding",
      "As a Bonus Action, place a divine ward on a creature within 60 feet. Until the start of your next turn, that creature gains a bonus to AC and saving throws equal to your Intelligence modifier (minimum +1).",
      fxInstance("modinst_amulet_of_warding", BOOST_AC_CATALOG, {
        bonusAction: true,
        effects: [
          {
            id: modId("amulet_of_warding"),
            kind: "boost_ac",
            bonusConfig: { mode: "ability_modifier", ability: "INT", minimum: 1 } as import("@/lib/compendium/roll-bonus-config").RollBonusConfig,
            label: "Amulet of Warding",
          },
        ],
      }),
    ),
    holyTrinketEquipment(
      "Restorative Ankh",
      "As a Bonus Action, a creature within 60 feet regains Hit Points equal to your Investigator level plus your Intelligence modifier.",
      fxInstance("modinst_restorative_ankh", HEAL_SELF_CATALOG, {
        bonusAction: true,
        effects: [
          {
            id: modId("restorative_ankh"),
            kind: "heal_self",
            healMode: "character_level",
            healLevelMultiplier: 1,
            healAbility: "INT",
            label: "Restorative Ankh",
          },
        ],
      }),
    ),
    holyTrinketEquipment(
      "Rune of Banishment",
      "As a Bonus Action, one creature within 60 feet must succeed on a Charisma saving throw against your spell save DC or be banished (Incapacitated, speed 0) until the start of your next turn.",
      fxInstance("modinst_rune_of_banishment", FORCE_SAVE_CATALOG, {
        bonusAction: true,
        effects: [
          {
            id: modId("rune_of_banishment"),
            kind: "force_save_control",
            saveAbility: "Charisma",
            label: "Rune of Banishment",
          },
        ],
      }),
    ),
  ]
}

function finisherModifiers(): Feature["linkedModifiers"] {
  return [
    charInstance(createModifierInstanceId(), ON_HIT_TRIGGER_CATALOG, [
      {
        id: modId("finisher_trigger"),
        type: "on_hit_trigger",
        oncePerTurn: true,
        onlyIfTargetBelowHalfHp: true,
        appliesTo: "weapon",
        label: "Finisher (Bloodied target)",
        effect: { catalogRefId: EXTRA_DAMAGE_CATALOG },
      },
    ]),
    fxInstance("modinst_finisher_damage", EXTRA_DAMAGE_CATALOG, {
      effects: [
        {
          id: modId("finisher_damage"),
          kind: "extra_damage_on_hit",
          bonusDice: "1d8",
          bonusByLevel: [
            { level: 2, mode: "dice", dieCount: 1, dieType: "d8" },
            { level: 11, mode: "dice", dieCount: 2, dieType: "d8" },
            { level: 17, mode: "dice", dieCount: 3, dieType: "d8" },
          ],
          label: "Finisher damage",
        },
      ],
    }),
  ]
}

function improvedFinisherModifiers(): Feature["linkedModifiers"] {
  return [
    charInstance(createModifierInstanceId(), ON_HIT_TRIGGER_CATALOG, [
      {
        id: modId("improved_finisher_trigger"),
        type: "on_hit_trigger",
        oncePerTurn: true,
        appliesTo: "weapon",
        label: "Improved Finisher (any target)",
        effect: { catalogRefId: EXTRA_DAMAGE_CATALOG },
      },
    ]),
    fxInstance("modinst_improved_finisher_damage", EXTRA_DAMAGE_CATALOG, {
      effects: [
        {
          id: modId("improved_finisher_damage"),
          kind: "extra_damage_on_hit",
          bonusDice: "1d8",
          label: "Improved Finisher (reduced)",
        },
      ],
    }),
  ]
}

function enrichInvestigatorFeature(feature: Feature): Feature {
  const name = feature.name.trim()

  if (
    /^finisher$/i.test(name) &&
    !(feature.linkedModifiers ?? []).some((mod) =>
      mod.characteristics?.some((char) => char.type === "on_hit_trigger"),
    )
  ) {
    return syncModifierRefs({
      ...feature,
      linkedModifiers: [...(feature.linkedModifiers ?? []), ...(finisherModifiers() ?? [])],
    })
  }

  if (/^improved finisher$/i.test(name)) {
    return syncModifierRefs({
      ...feature,
      linkedModifiers: [...(feature.linkedModifiers ?? []), ...(improvedFinisherModifiers() ?? [])],
    })
  }

  if (/^holy trinkets$/i.test(name)) {
    return {
      ...feature,
      limitedUses: undefined,
      description: `${feature.description ?? ""}\n\nCore trinkets (Amulet of Warding, Restorative Ankh, Rune of Banishment) are compendium Magic Items funded by your shared Trinkets pool.`.trim(),
    }
  }

  if (/^rushed incantation$/i.test(name)) {
    return {
      ...feature,
      limitedUses: {
        type: "class_resource",
        classResourceKey: "rushed_incantation",
        classResourceAmount: 1,
      },
    }
  }

  if (/^exploit weakness$/i.test(name)) {
    return syncModifierRefs({
      ...feature,
      description: `${feature.description ?? ""}\n\nResistance strip until start of your next turn is modeled; single-attack Vulnerability grant (non-doubling carve-out) remains descriptive.`.trim(),
      linkedModifiers: [
        ...(feature.linkedModifiers ?? []),
        charInstance(createModifierInstanceId(), "cat_char_damage_roll_modifiers", [
          {
            id: modId("exploit_weakness_resist_strip"),
            type: "damage_roll_modifiers",
            entries: [{ bonus: 0, target: "all" }],
            label: "Target loses resistances until your next turn (track manually)",
          },
        ]),
      ],
    })
  }

  if (/^enigma arcane$/i.test(name)) {
    return syncModifierRefs({
      ...feature,
      linkedModifiers: [
        ...(feature.linkedModifiers ?? []),
        ...innateArcanumPresetForClass("Investigator", [{ spellLevel: 6, classLevel: 17 }]),
      ],
    })
  }

  if (/^spellbinder$/i.test(name)) {
    return {
      ...feature,
      description: `${feature.description ?? ""}\n\nImport review: chosen grimoire spells with free Rushed Incantation use — descriptive only (no subset cost-exemption primitive).`.trim(),
    }
  }

  return feature
}

/** Investigator import enrich: trinket magic items, Finisher triggers, governing ability hooks. */
export function enrichInvestigatorFeatures(content: ImportContent): ImportContent {
  const next: ImportContent = { ...content }
  const trinkets = coreHolyTrinkets()

  if (content.classes?.length) {
    next.classes = content.classes.map((cls) => {
      if (!isInvestigator(cls.name)) return cls
      return {
        ...cls,
        features: (cls.features ?? []).map((feature) =>
          enrichInvestigatorFeature(feature as unknown as Feature),
        ),
      }
    }) as ImportContent["classes"]
  }

  const existingEquipment = [...(next.equipment ?? [])]
  const existingNames = new Set(existingEquipment.map((row) => row.name.toLowerCase()))
  for (const item of trinkets) {
    if (!existingNames.has(item.name.toLowerCase())) {
      existingEquipment.push(item)
      existingNames.add(item.name.toLowerCase())
    }
  }
  if (existingEquipment.length) next.equipment = existingEquipment

  return next as unknown as ImportContent
}
