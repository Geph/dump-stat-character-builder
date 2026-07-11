import { INFLUENCE_POINTS_KEY, IN_COMBAT_TOGGLE } from "@/lib/character/influence-points"
import {
  innateArcanumPresetForClass,
  innateSorceryPreset,
} from "@/lib/compendium/enrich-srd-class-features"
import { createModifierInstanceId, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import { characteristicCatalogRefId } from "@/lib/compendium/modifier-catalog-refs"
import { charInstance, fxInstance, modId, usesInstance } from "@/lib/compendium/modifier-instance-builders"
import type { NamedModifierPreset } from "@/lib/import/enrichment-presets/types"
import { prefixedResourceKey, slugClassPrefix } from "@/lib/import/third-party-resources"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import type { ImportContent } from "@/lib/import/content-schema"
import type { UsesConfig } from "@/lib/types"

const REAGENTS_KEY = "reagents"
const QUARRY_TOGGLE = "quarry_marked"
const TRINKETS_KEY = "trinkets"

function formulaDamageTypes(name: string): string[] {
  if (/acid/i.test(name)) return ["Acid"]
  if (/cold/i.test(name)) return ["Cold"]
  if (/lightning/i.test(name)) return ["Lightning"]
  if (/poison/i.test(name)) return ["Poison"]
  if (/holy|radiant/i.test(name)) return ["Radiant"]
  if (/shadow|necrotic/i.test(name)) return ["Necrotic"]
  return ["Fire"]
}

function bombAttackCharacteristic(damageTypes: string[]): CharacteristicModifier {
  return {
    id: modId("bomb_attack"),
    type: "special_attack",
    label: "Bomb — Attack",
    attackName: "Bomb",
    attackProfile: "ranged",
    attackVariant: "attack",
    targetMode: "single",
    properties: ["Martial", "Thrown"],
    damageTypes,
    damageDiceCount: 1,
    damageDieType: "d10",
    rangeFeet: 60,
    resourceScaleKey: REAGENTS_KEY,
    bonusDicePerResource: "1d10",
    maxResourcesSpentByLevel: [
      { level: 1, mode: "fixed", fixed: 0 },
      { level: 5, mode: "fixed", fixed: 1 },
      { level: 11, mode: "fixed", fixed: 2 },
      { level: 17, mode: "fixed", fixed: 3 },
    ],
  }
}

function bombExplodeCharacteristic(damageTypes: string[]): CharacteristicModifier {
  return {
    id: modId("bomb_explode"),
    type: "special_attack",
    label: "Bomb — Explode",
    attackName: "Bomb",
    attackProfile: "force_save",
    attackVariant: "explode",
    targetMode: "area",
    areaShape: "sphere",
    areaLengthFeet: 5,
    properties: ["Martial", "Thrown"],
    damageTypes,
    damageDiceCount: 1,
    damageDieType: "d10",
    saveAbility: "DEX",
    saveDCBase: 8,
    saveDCAbilityChoice: "higher_str_dex",
    saveHalfDamage: true,
    omitPositiveAbilityModFromDamage: true,
    resourceScaleKey: REAGENTS_KEY,
    bonusDicePerResource: "1d10",
    radiusIncreaseFeetPerResource: 5,
    maxResourcesSpentByLevel: [
      { level: 1, mode: "fixed", fixed: 0 },
      { level: 5, mode: "fixed", fixed: 1 },
      { level: 11, mode: "fixed", fixed: 2 },
      { level: 17, mode: "fixed", fixed: 3 },
    ],
  }
}

function unifiedBombModifiers(damageTypes = ["Fire"]): LinkedModifierInstance[] {
  const instanceId = createModifierInstanceId()
  return [
    charInstance(instanceId, characteristicCatalogRefId("special_attack"), [
      bombAttackCharacteristic(damageTypes),
      bombExplodeCharacteristic(damageTypes),
    ]),
  ]
}

function finisherModifiers(): LinkedModifierInstance[] {
  return [
    charInstance(createModifierInstanceId(), "cat_char_on_hit_trigger", [
      {
        id: modId("finisher_trigger"),
        type: "on_hit_trigger",
        oncePerTurn: true,
        onlyIfTargetBelowHalfHp: true,
        appliesTo: "weapon",
        label: "Finisher (Bloodied target)",
        effect: { catalogRefId: "cat_fx_extra_damage_on_hit" },
      },
    ]),
    fxInstance("modinst_finisher_damage", "cat_fx_extra_damage_on_hit", {
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

function improvedFinisherModifiers(): LinkedModifierInstance[] {
  return [
    charInstance(createModifierInstanceId(), "cat_char_on_hit_trigger", [
      {
        id: modId("improved_finisher_trigger"),
        type: "on_hit_trigger",
        oncePerTurn: true,
        appliesTo: "weapon",
        label: "Improved Finisher (any target)",
        effect: { catalogRefId: "cat_fx_extra_damage_on_hit" },
      },
    ]),
    fxInstance("modinst_improved_finisher_damage", "cat_fx_extra_damage_on_hit", {
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

export function resolveNamedPreset(
  preset: NamedModifierPreset,
  ctx: { className?: string; name?: string },
): LinkedModifierInstance[] {
  switch (preset.kind) {
    case "innate_arcanum":
      return innateArcanumPresetForClass(ctx.className ?? "Warlock", preset.tiers)
    case "innate_sorcery":
      return innateSorceryPreset()
    case "alchemist_bomb":
      return unifiedBombModifiers(preset.damageTypes ?? ["Fire"])
    case "alchemist_bomb_formula_from_name":
      return unifiedBombModifiers(formulaDamageTypes(ctx.name ?? ""))
    case "investigator_finisher":
      return finisherModifiers()
    case "investigator_improved_finisher":
      return improvedFinisherModifiers()
    case "climactic_moment_influence":
      return [
        charInstance(createModifierInstanceId(), characteristicCatalogRefId("turn_start_trigger"), [
          {
            id: modId("climactic_moment_influence"),
            type: "turn_start_trigger",
            label: "Gain 1 Influence point",
            accrueResourceKey: INFLUENCE_POINTS_KEY,
            accrueResourceAmount: 1,
            accrueResourceMaxAbility: "intelligence",
            accrueDecayMinutes: 1,
            requiresSheetToggle: IN_COMBAT_TOGGLE,
          },
        ]),
      ]
    case "monk_unarmored_defense": {
      const prefix = slugClassPrefix(ctx.className ?? "monk")
      return [
        charInstance(`modinst_${prefix}_uac`, characteristicCatalogRefId("ac"), [
          {
            id: modId(`${prefix}_uac`),
            type: "ac",
            mode: "ability_modifiers",
            base: 10,
            abilities: ["DEX", "WIS"],
            label: "Unarmored Defense",
          },
        ]),
      ]
    }
    case "quarry_on_hit": {
      const prefix = (ctx.className ?? "ranger").toLowerCase().replace(/[^a-z0-9]+/g, "_")
      const instanceKey = `${prefix}_quarry_hit`
      return [
        charInstance(`modinst_${instanceKey}`, characteristicCatalogRefId("on_hit_trigger"), [
          {
            id: modId(`${instanceKey}_on_hit`),
            type: "on_hit_trigger",
            requiresSheetToggle: QUARRY_TOGGLE,
            effect: {
              catalogRefId: modId(`${instanceKey}_damage`),
              characteristics: [
                {
                  id: modId(`${instanceKey}_damage`),
                  type: "extra_damage_on_hit",
                  bonusDice: "1d6",
                  label: "Quarry Die damage (scales on class table)",
                } as unknown as CharacteristicModifier,
              ],
            },
          },
        ]),
      ]
    }
    case "held_items_cap":
      return [
        charInstance(createModifierInstanceId(), characteristicCatalogRefId("held_items_cap"), [
          {
            id: modId(preset.idKey),
            type: "held_items_cap",
            flatBonus: preset.flatBonus ?? 0,
            baseAbility: (preset.baseAbility as "intelligence") ?? "intelligence",
            label: preset.label ?? "Held items cap",
          },
        ]),
      ]
    case "craftable_items_static":
      return [
        charInstance(createModifierInstanceId(), characteristicCatalogRefId("craftable_items"), [
          {
            id: modId(preset.idKey),
            type: "craftable_items",
            category: preset.category,
            items: preset.items,
            label: preset.label,
          } as unknown as CharacteristicModifier,
        ]),
      ]
    case "char_instance":
      return [
        charInstance(
          createModifierInstanceId(),
          preset.catalogRefId,
          preset.characteristics as CharacteristicModifier[],
        ),
      ]
    default:
      return []
  }
}

export function remapResourceKeyInModifiers(
  modifiers: LinkedModifierInstance[] | undefined,
  fromKey: string,
  toKey: string,
): LinkedModifierInstance[] | undefined {
  if (!modifiers?.length || fromKey === toKey) return modifiers
  const json = JSON.stringify(modifiers)
  if (!json.includes(fromKey)) return modifiers
  return JSON.parse(json.replaceAll(fromKey, toKey)) as LinkedModifierInstance[]
}

export function resolveRemapTarget(to: string, className: string): string {
  if (to.startsWith("prefixed:")) {
    const base = to.slice("prefixed:".length)
    return prefixedResourceKey(slugClassPrefix(className), base)
  }
  return to
}

export function enrichReagentResourceUses(uses: UsesConfig): UsesConfig {
  const recharges = [...(uses.recharges ?? [])]
  const hasSynthesis = recharges.some(
    (rule) => rule.kind !== "real_time" && rule.amountFormula === "ability_modifier",
  )
  if (!hasSynthesis) {
    recharges.unshift({
      rest: "short_rest",
      amountFormula: "ability_modifier",
      amountFormulaAbility: "INT",
      maxPerLongRest: 1,
    })
  }
  if (!recharges.some((rule) => rule.kind !== "real_time" && rule.rest === "long_rest")) {
    recharges.push({ rest: "long_rest" })
  }
  return { ...uses, recharges }
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
    magic_effects: [
      usesInstance(
        createModifierInstanceId(),
        {
          type: "class_resource",
          classResourceKey: TRINKETS_KEY,
          classResourceAmount: 1,
        },
        name,
      ),
      activation,
    ],
  }
}

export function buildInvestigatorHolyTrinkets(): NonNullable<ImportContent["equipment"]> {
  return [
    holyTrinketEquipment(
      "Amulet of Warding",
      "As a Bonus Action, place a divine ward on a creature within 60 feet. Until the start of your next turn, that creature gains a bonus to AC and saving throws equal to your Intelligence modifier (minimum +1).",
      fxInstance("modinst_amulet_of_warding", "cat_fx_boost_ac", {
        bonusAction: true,
        effects: [
          {
            id: modId("amulet_of_warding"),
            kind: "boost_ac",
            bonusConfig: {
              mode: "ability_modifier",
              ability: "INT",
              minimum: 1,
            } as import("@/lib/compendium/roll-bonus-config").RollBonusConfig,
            label: "Amulet of Warding",
          },
        ],
      }),
    ),
    holyTrinketEquipment(
      "Restorative Ankh",
      "As a Bonus Action, a creature within 60 feet regains Hit Points equal to your Investigator level plus your Intelligence modifier.",
      fxInstance("modinst_restorative_ankh", "cat_fx_heal_self", {
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
      fxInstance("modinst_rune_of_banishment", "cat_fx_force_save_control", {
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

export function buildQuarryClassResource(className: string) {
  const uses: UsesConfig = {
    type: "ability_modifier",
    abilityModifier: "WIS",
    recharges: [{ rest: "short_rest", amount: 1 }, { rest: "long_rest" }],
    restoreBySpellSlot: { minSpellLevel: 1, restores: 1 },
    rechargeOverrides: [
      {
        atClassLevel: 10,
        recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
      },
    ],
  }
  return {
    class_name: className,
    resource_key: "quarry",
    name: "Quarry",
    description: "Mark a creature as your Quarry. Uses equal your Wisdom modifier (minimum 1).",
    uses,
  }
}

export { REAGENTS_KEY, formulaDamageTypes }
