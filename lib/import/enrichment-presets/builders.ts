import { enrichReagentResourceUses } from "@/lib/compendium/alchemist-feature-wiring"
import { INFLUENCE_POINTS_KEY, IN_COMBAT_TOGGLE } from "@/lib/character/influence-points"
import {
  innateArcanumPresetForClass,
  innateSorceryPreset,
} from "@/lib/compendium/enrich-srd-class-features"
import { createModifierInstanceId, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import {
  characteristicCatalogRefId,
  effectCatalogRefId,
} from "@/lib/compendium/modifier-catalog-refs"
import { charInstance, fxInstance, modId, usesInstance } from "@/lib/compendium/modifier-instance-builders"
import type { NamedModifierPreset } from "@/lib/import/enrichment-presets/types"
import { prefixedResourceKey, slugClassPrefix } from "@/lib/import/third-party-resources"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
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
    icon: "rolling-bomb",
    attackProfile: "ranged",
    attackVariant: "attack",
    targetMode: "single",
    properties: ["Martial", "Thrown", "Finesse", "Destructible"],
    damageTypes,
    damageDiceCount: 1,
    damageDieType: "d10",
    damageAbilityModifier: "attack",
    damageByLevel: [
      { level: 1, mode: "dice", dieCount: 1, dieType: "d10" },
      { level: 5, mode: "dice", dieCount: 2, dieType: "d10" },
      { level: 11, mode: "dice", dieCount: 3, dieType: "d10" },
      { level: 17, mode: "dice", dieCount: 4, dieType: "d10" },
    ],
    rangeFeet: 30,
    resourceScaleKey: REAGENTS_KEY,
    bonusDicePerResource: "1d10",
    maxResourcesSpentByLevel: [
      { level: 2, mode: "fixed", fixed: 1 },
      { level: 5, mode: "fixed", fixed: 2 },
      { level: 9, mode: "fixed", fixed: 3 },
      { level: 13, mode: "fixed", fixed: 4 },
      { level: 17, mode: "fixed", fixed: 5 },
    ],
  }
}

function bombExplodeCharacteristic(damageTypes: string[]): CharacteristicModifier {
  return {
    id: modId("bomb_explode"),
    type: "special_attack",
    label: "Bomb — Explode (+INT mod, min +1)",
    attackName: "Bomb",
    icon: "explosion-rays",
    attackProfile: "force_save",
    attackVariant: "explode",
    targetMode: "area",
    areaShape: "sphere",
    areaLengthFeet: 5,
    properties: ["Martial", "Thrown", "Destructible"],
    damageTypes,
    damageDiceCount: 1,
    damageDieType: "d10",
    damageByLevel: [
      { level: 1, mode: "dice", dieCount: 1, dieType: "d10" },
      { level: 5, mode: "dice", dieCount: 2, dieType: "d10" },
      { level: 11, mode: "dice", dieCount: 3, dieType: "d10" },
      { level: 17, mode: "dice", dieCount: 4, dieType: "d10" },
    ],
    saveAbility: "DEX",
    saveDCBase: 8,
    saveDCAbilityChoice: "higher_str_dex",
    alternateSaveDCAbility: "INT",
    saveHalfDamage: true,
    omitPositiveAbilityModFromDamage: true,
    damageAbilityModifier: "INT",
    damageAbilityMinimum: 1,
    resourceScaleKey: REAGENTS_KEY,
    bonusDicePerResource: "1d10",
    radiusIncreaseFeetPerResource: 5,
    maxResourcesSpentByLevel: [
      { level: 2, mode: "fixed", fixed: 1 },
      { level: 5, mode: "fixed", fixed: 2 },
      { level: 9, mode: "fixed", fixed: 3 },
      { level: 13, mode: "fixed", fixed: 4 },
      { level: 17, mode: "fixed", fixed: 5 },
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
    fxInstance(createModifierInstanceId(), "cat_fx_extra_damage_on_hit", {
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
    charInstance(createModifierInstanceId(), characteristicCatalogRefId("power_rider"), [
      {
        id: modId("finisher_power_rider"),
        type: "power_rider",
        parentPowerNames: ["Attack", "Unarmed Strike"],
        label: "Finisher",
        alertSummary:
          "Finisher: once per turn vs a Bloodied target, add Finisher dice under Damage modifiers on the weapon DMG menu.",
      },
    ]),
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
    fxInstance(createModifierInstanceId(), "cat_fx_extra_damage_on_hit", {
      effects: [
        {
          id: modId("improved_finisher_damage"),
          kind: "extra_damage_on_hit",
          bonusDice: "1d8",
          label: "Improved Finisher (reduced)",
        },
      ],
    }),
    charInstance(createModifierInstanceId(), characteristicCatalogRefId("power_rider"), [
      {
        id: modId("improved_finisher_power_rider"),
        type: "power_rider",
        parentPowerNames: ["Attack", "Unarmed Strike"],
        label: "Improved Finisher",
        alertSummary:
          "Improved Finisher: once per turn on a hit, add Finisher dice under Damage modifiers on the weapon DMG menu.",
      },
    ]),
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
        {
          ...charInstance(
            createModifierInstanceId(),
            preset.catalogRefId,
            preset.characteristics as CharacteristicModifier[],
          ),
          ...(preset.activation
            ? {
                activation: {
                  ...(preset.activation ?? {}),
                },
              }
            : {}),
        },
      ]
    case "fx_instance":
      return [
        fxInstance(createModifierInstanceId(), preset.catalogRefId, {
          ...(preset.activation ?? {}),
          effects: preset.effects as never[],
        }),
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

export { enrichReagentResourceUses }

const MAGIC_WEAPON_TOGGLE = "magic_weapon_active"

function trinketPoolSpend(label: string): LinkedModifierInstance {
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

function freeCastTrinketSpell(
  instanceKey: string,
  spellName: string,
  opts?: { bonusAction?: boolean; action?: boolean },
): LinkedModifierInstance {
  return fxInstance(createModifierInstanceId(), effectCatalogRefId("cast_spell"), {
    ...(opts?.bonusAction ? { bonusAction: true } : {}),
    ...(opts?.action ? { action: true } : {}),
    effects: [
      {
        id: modId(instanceKey),
        kind: "cast_spell",
        castSpellName: spellName,
        castSpellWithoutSlot: true,
        label: `${spellName} without a spell slot or components`,
      },
    ],
  })
}

function magicWeaponBuffModifiers(label: string): LinkedModifierInstance[] {
  return [
    charInstance(createModifierInstanceId(), characteristicCatalogRefId("attack_roll_modifiers"), [
      {
        id: modId(`${label}_atk`),
        type: "attack_roll_modifiers",
        label: "Magic Weapon (+1 attack)",
        requiresSheetToggle: MAGIC_WEAPON_TOGGLE,
        entries: [{ bonus: 1, target: "all" }],
      },
    ]),
    charInstance(createModifierInstanceId(), characteristicCatalogRefId("damage_roll_modifiers"), [
      {
        id: modId(`${label}_dmg`),
        type: "damage_roll_modifiers",
        label: "Magic Weapon (+1 damage)",
        requiresSheetToggle: MAGIC_WEAPON_TOGGLE,
        entries: [{ bonus: 1, target: "all" }],
      },
    ]),
  ]
}

/**
 * Name → mechanical wiring for Investigator trinkets (subclass + holy).
 * Recognition only — never invents equipment rows or ships item prose.
 */
export type KnownEquipmentNameWiring = {
  magic_effects: LinkedModifierInstance[]
}

export function investigatorHolyTrinketWiringByName(): Record<string, KnownEquipmentNameWiring> {
  const all = investigatorTrinketWiringByName()
  return {
    "amulet of warding": all["amulet of warding"]!,
    "restorative ankh": all["restorative ankh"]!,
    "rune of banishment": all["rune of banishment"]!,
  }
}

export function investigatorTrinketWiringByName(): Record<string, KnownEquipmentNameWiring> {
  const dragonTypes = ["Acid", "Cold", "Fire", "Force", "Lightning", "Poison", "Thunder"]
  return {
    "amulet of warding": {
      magic_effects: [
        trinketPoolSpend("Amulet of Warding"),
        fxInstance(createModifierInstanceId(), effectCatalogRefId("boost_ac"), {
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
      ],
    },
    "restorative ankh": {
      magic_effects: [
        trinketPoolSpend("Restorative Ankh"),
        fxInstance(createModifierInstanceId(), effectCatalogRefId("heal_self"), {
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
      ],
    },
    "rune of banishment": {
      magic_effects: [
        trinketPoolSpend("Rune of Banishment"),
        fxInstance(createModifierInstanceId(), effectCatalogRefId("force_save_control"), {
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
      ],
    },
    "consecrated whetstone": {
      magic_effects: [
        trinketPoolSpend("Consecrated Whetstone"),
        freeCastTrinketSpell("consecrated_whetstone_cast", "Magic Weapon", { bonusAction: true }),
        ...magicWeaponBuffModifiers("consecrated_whetstone"),
      ],
    },
    "fogstone periapt": {
      magic_effects: [
        trinketPoolSpend("Fogstone Periapt"),
        freeCastTrinketSpell("fogstone_periapt_cast", "Misty Step"),
      ],
    },
    "glass medallion": {
      magic_effects: [
        trinketPoolSpend("Glass Medallion"),
        freeCastTrinketSpell("glass_medallion_cast", "Invisibility", { bonusAction: true }),
      ],
    },
    "skeleton's key": {
      magic_effects: [
        trinketPoolSpend("Skeleton's Key"),
        freeCastTrinketSpell("skeletons_key_cast", "Knock", { bonusAction: true }),
      ],
    },
    "cold iron pendant": {
      magic_effects: [
        trinketPoolSpend("Cold Iron Pendant"),
        freeCastTrinketSpell("cold_iron_pendant_cast", "Detect Evil and Good"),
      ],
    },
    "dead mist vial": {
      magic_effects: [
        trinketPoolSpend("Dead Mist Vial"),
        freeCastTrinketSpell("dead_mist_vial_cast", "Fog Cloud"),
      ],
    },
    "engraved lens": {
      magic_effects: [
        trinketPoolSpend("Engraved Lens"),
        freeCastTrinketSpell("engraved_lens_cast", "Identify"),
      ],
    },
    "gilded dragon scale": {
      magic_effects: [
        trinketPoolSpend("Gilded Dragon Scale"),
        charInstance(
          createModifierInstanceId(),
          characteristicCatalogRefId("resource_ability_menu"),
          [
            {
              id: modId("gilded_dragon_scale_menu"),
              type: "resource_ability_menu",
              resourceKey: TRINKETS_KEY,
              waiveResourceCost: true,
              label: "Gilded Dragon Scale",
              options: dragonTypes.map((name) => ({
                name,
                description: `Gain Resistance to ${name} damage for 1 minute.`,
              })),
            },
          ],
        ),
      ],
    },
    "mimic-tooth necklace": {
      magic_effects: [
        trinketPoolSpend("Mimic-Tooth Necklace"),
        fxInstance(createModifierInstanceId(), effectCatalogRefId("extra_damage_on_hit"), {
          bonusAction: true,
          effects: [
            {
              id: modId("mimic_tooth_necklace"),
              kind: "extra_damage_on_hit",
              bonusDice: "2d8",
              damageTypes: ["Acid"],
              label: "Mimic-Tooth Necklace (2d8 Acid)",
            },
          ],
        }),
      ],
    },
  }
}

function isTrinketUsesOnly(effect: LinkedModifierInstance): boolean {
  const chars = effect.characteristics ?? []
  if (!chars.length || effect.activation?.effects?.length) return false
  return chars.every(
    (char) =>
      char.type === "uses" &&
      char.uses?.type === "class_resource" &&
      char.uses.classResourceKey === TRINKETS_KEY,
  )
}

/** Apply known-name equipment wiring onto existing import rows only (no row creation). */
export function applyKnownEquipmentNameWiring<T extends { name: string }>(rows: T[]): T[] {
  const wiring = investigatorTrinketWiringByName()
  return rows.map((row) => {
    const key = row.name.trim().toLowerCase()
    const match = wiring[key]
    if (!match) return row
    const existing = ((row as { magic_effects?: LinkedModifierInstance[] | null }).magic_effects ??
      []) as LinkedModifierInstance[]
    const hasTrinketSpend = existing.some((effect) =>
      effect.characteristics?.some(
        (char) =>
          char.type === "uses" &&
          char.uses?.type === "class_resource" &&
          char.uses.classResourceKey === TRINKETS_KEY,
      ),
    )
    const onlySpend = hasTrinketSpend && existing.every(isTrinketUsesOnly)
    if (hasTrinketSpend && !onlySpend) return row
    const additions = hasTrinketSpend
      ? match.magic_effects.filter((effect) => !isTrinketUsesOnly(effect))
      : match.magic_effects
    if (!additions.length) return row
    return { ...row, magic_effects: [...existing, ...additions] }
  })
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
