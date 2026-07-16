import type { AbilityModifierKey, AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import type { FeatPickCategory } from "@/lib/compendium/class-feature-metadata"
import { GRANT_FEAT_CATALOG_ID, grantFeatCharacteristic } from "@/lib/compendium/grant-feat-catalog"
import { CHARACTERISTIC_MODIFIER_TYPE_OPTIONS } from "@/lib/compendium/characteristic-modifiers"
import { isKnownEffectKind } from "@/lib/compendium/modifier-catalog-refs"
import {
  characteristicCatalogRefId,
  effectCatalogRefId,
} from "@/lib/compendium/modifier-catalog-refs"
import {
  charInstance,
  fxInstance,
  modId,
  usesInstance,
} from "@/lib/compendium/modifier-instance-builders"
import { createModifierInstanceId } from "@/lib/compendium/linked-modifiers"
import type { ImportMechanic } from "@/lib/import/content-schema"
import type {
  DetectFeatureContext,
  DetectedModifier,
  DetectionConfidence,
} from "@/lib/import/detect-feature-modifiers"
import { spellNamePlaceholder } from "@/lib/import/resolve-linked-modifier-spells"
import { createModifierLimitation } from "@/lib/compendium/modifier-limitations"
import { buildEvasionModifier } from "@/lib/compendium/shared-feature-modifier-builders"
import type { FeatureActivation, UsesConfig } from "@/lib/types"

const VALID_CHARACTERISTIC_KINDS = new Set(
  CHARACTERISTIC_MODIFIER_TYPE_OPTIONS.map((option) => option.value),
)

function instanceKey(ctx: DetectFeatureContext, kind: string): string {
  const base = [ctx.contentKind, ctx.sourceName, ctx.featureName, kind, "ai"]
    .filter(Boolean)
    .join("_")
    .replace(/[^a-z0-9]+/gi, "_")
    .toLowerCase()
  return `import_${base}`
}

function titleCaseWords(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
}

function abilityScoreToModifierKey(
  ability: AbilityScoreKey | null | undefined,
): AbilityModifierKey {
  const map: Record<AbilityScoreKey, AbilityModifierKey> = {
    strength: "STR",
    dexterity: "DEX",
    constitution: "CON",
    intelligence: "INT",
    wisdom: "WIS",
    charisma: "CHA",
  }
  return ability ? map[ability] : "CHA"
}

function usesRechargesFromImport(
  recharge: ImportMechanic["usesRecharge"],
): UsesConfig["recharges"] {
  if (recharge === "until_item_consumed" || recharge === "on_resource_reactivation") {
    return undefined
  }
  if (recharge === "short_rest") return [{ rest: "short_rest" }]
  if (recharge === "both") return [{ rest: "short_rest" }, { rest: "long_rest" }]
  return [{ rest: "long_rest" }]
}

function aiConfidence(mechanic: ImportMechanic): DetectionConfidence {
  return mechanic.confidence ?? "medium"
}

/**
 * Shared by the top-level `damage_roll_modifiers` mechanic and `on_hit_trigger`'s nested effect —
 * both describe "extra NdM [damage type] damage" via the same characteristic shape. Returns null
 * when there's no dice to report (bonusDice missing/blank).
 */
function buildDamageRollModifiersCharacteristic(
  mechanic: ImportMechanic,
  ctx: DetectFeatureContext,
  idSuffix: string,
  labelSuffix?: string,
) {
  const dice = mechanic.bonusDice?.trim()
  if (!dice) return null
  const damageType = mechanic.damageType ? titleCaseWords(mechanic.damageType) : undefined
  const creatureTypes = mechanic.targetCreatureTypes?.map(titleCaseWords).filter(Boolean)
  const entry = {
    bonus: 0,
    target: "all",
    customTarget: `${dice}${damageType ? ` ${damageType}` : ""}`,
    ...(creatureTypes?.length ? { onlyVsCreatureTypes: creatureTypes } : {}),
  }
  const baseLabel = creatureTypes?.length
    ? `Extra ${dice}${damageType ? ` ${damageType}` : ""} vs ${creatureTypes.join(", ")}`
    : `Extra ${dice}${damageType ? ` ${damageType}` : ""} damage`
  return {
    id: modId(instanceKey(ctx, idSuffix)),
    type: "damage_roll_modifiers" as const,
    entries: [entry],
    label: labelSuffix ? `${baseLabel} ${labelSuffix}` : baseLabel,
    ...(mechanic.requiresSheetToggle ? { requiresSheetToggle: mechanic.requiresSheetToggle } : {}),
  }
}

function isReactionRechargePhrase(phrase: string): boolean {
  return (
    /\bonce you take this reaction\b/i.test(phrase) ||
    /\bcan'?t use this benefit again until you finish a long rest\b/i.test(phrase)
  )
}

const HEAL_DIE_TYPES = new Set(["d4", "d6", "d8", "d10", "d12", "d20"])

function parseHealDiceExpression(
  dice: string,
): { count: number; dieType: "d4" | "d6" | "d8" | "d10" | "d12" | "d20" } | null {
  const match = dice.trim().match(/^(\d+)\s*d\s*(\d+)$/i)
  if (!match) return null
  const dieType = `d${match[2]}`
  if (!HEAL_DIE_TYPES.has(dieType)) return null
  return { count: parseInt(match[1], 10), dieType: dieType as "d4" | "d6" | "d8" | "d10" | "d12" | "d20" }
}

/**
 * `temporary_hit_points` mechanics[] wiring, scoped to the common case: the feature is
 * activated and the character gains temp HP. Two axes are intentionally left unwired (return
 * null) because there's no matching character-sheet mechanism yet, not because they're rare:
 *  - thpTrigger "turn_start"/"on_hit" — turn_start_trigger/on_hit_trigger characteristics have
 *    no "grant temp HP" field, only resource restore/spend.
 *  - thpTarget other than "self" — the sheet models one character; there's no "ally" or "chosen
 *    creature" state to grant temp HP to (existing SRD presets that describe granting temp HP to
 *    allies, e.g. Mantle of Inspiration, only encode it in the effect's label text).
 *  - amountScaling "class_resource_die" — the resource's die size isn't carried on the mechanic,
 *    so there's no general way to size the temp HP; hardcoded presets set this by hand instead.
 */
function buildTemporaryHitPointsEffect(
  mechanic: ImportMechanic,
  ctx: DetectFeatureContext,
  instanceId: string,
  matchedPhrase: string,
): DetectedModifier | null {
  // `trigger` is a real schema field (used by movement_grant) that models sometimes mis-key
  // thpTrigger onto — if it's set without thpTrigger, treat this as an unrecognized explicit
  // trigger rather than silently defaulting to "on_activation" for a case the source didn't
  // actually describe (see the Improved Warding Flare case: mis-keyed trigger/target produced
  // a bogus "activate for temp HP" effect instead of not wiring at all).
  if (mechanic.thpTrigger == null && mechanic.trigger) {
    return null
  }
  const trigger = mechanic.thpTrigger ?? "on_activation"
  const target = mechanic.thpTarget ?? "self"
  if ((trigger !== "on_activation" && trigger !== "on_use") || target !== "self") {
    return null
  }

  const dice = mechanic.amountDice ? parseHealDiceExpression(mechanic.amountDice) : null
  const healPatch =
    mechanic.amountScaling === "ability_modifier" && mechanic.ability
      ? { healMode: "ability_modifier" as const, healAbility: abilityScoreToModifierKey(mechanic.ability) }
      : mechanic.amountScaling === "character_level"
        ? {
            // amountMultiplier is documented for class_resource_die doubling ("twice the number
            // rolled"), but the cheatsheet's wording is easy to misread for character_level
            // scaling too ("three times your level") — accept it as a fallback rather than
            // silently granting 1x level when the LLM puts the multiplier there instead of amount.
            healMode: "character_level" as const,
            healLevelMultiplier: mechanic.amount ?? mechanic.amountMultiplier ?? 1,
          }
        : dice
          ? { healMode: "dice" as const, healDiceCount: dice.count, healDieType: dice.dieType }
          : mechanic.amount != null
            ? { healMode: "fixed" as const, healFixed: mechanic.amount }
            : null
  if (!healPatch) return null

  return {
    ruleId: "ai.temporary_hit_points",
    confidence: aiConfidence(mechanic),
    matchedPhrase,
    instance: fxInstance(instanceId, effectCatalogRefId("grant_temp_hp"), {
      effects: [
        {
          id: modId(instanceKey(ctx, "temp_hp")),
          kind: "grant_temp_hp",
          tempHpTrigger: "on_action",
          ...healPatch,
        },
      ],
    }),
  }
}

function buildFromMechanic(
  mechanic: ImportMechanic,
  ctx: DetectFeatureContext,
): DetectedModifier | null {
  const instanceId = createModifierInstanceId()
  const matchedPhrase = mechanic.sourcePhrase?.trim() || `AI: ${mechanic.kind}`

  if (mechanic.kind === "check_roll_modifier" || mechanic.kind === "extra_attack") {
    if (!isKnownEffectKind(mechanic.kind)) return null
    if (mechanic.kind === "extra_attack") {
      return {
        ruleId: "ai.extra_attack",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: fxInstance(instanceId, effectCatalogRefId("extra_attack"), {
          effects: [
            {
              id: modId(instanceKey(ctx, "extra_attack")),
              kind: "extra_attack",
              extraAttackCount: 1,
            },
          ],
        }),
      }
    }

    if (!mechanic.checkRollMode) return null
    return {
      ruleId: "ai.check_roll_modifier",
      confidence: aiConfidence(mechanic),
      matchedPhrase,
      instance: fxInstance(instanceId, effectCatalogRefId("check_roll_modifier"), {
        effects: [
          {
            id: modId(instanceKey(ctx, "check_roll")),
            kind: "check_roll_modifier",
            checkRollMode: mechanic.checkRollMode,
            checkCategory: mechanic.checkCategory ?? (mechanic.checkSkills?.length ? "skill" : "save"),
            checkAbility: mechanic.checkAbility ?? undefined,
            checkSkills: mechanic.checkSkills,
            ...(mechanic.requiresSheetToggle
              ? {
                  limitations: [
                    createModifierLimitation({
                      kind: "sheet_toggle",
                      rule: "requires_active",
                      value: mechanic.requiresSheetToggle,
                    }),
                  ],
                }
              : {}),
          },
        ],
      }),
    }
  }

  if (mechanic.kind === "turn_start_resource_restore") {
    if (!mechanic.restoreResourceKey || mechanic.restoreResourceAmount == null) return null
    // See turn_start_trigger below — "hit_points"/"hp" means "heal", not a resource pool restore.
    if (mechanic.restoreResourceKey === "hit_points" || mechanic.restoreResourceKey === "hp") {
      return {
        ruleId: "ai.turn_start_resource_restore.heal",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, characteristicCatalogRefId("turn_start_trigger"), [
          {
            id: modId(instanceKey(ctx, "turn_start_restore")),
            type: "turn_start_trigger",
            healMode: "fixed" as const,
            healFixed: mechanic.restoreResourceAmount,
          },
        ]),
      }
    }
    return {
      ruleId: "ai.turn_start_resource_restore",
      confidence: aiConfidence(mechanic),
      matchedPhrase,
      instance: charInstance(instanceId, characteristicCatalogRefId("turn_start_trigger"), [
        {
          id: modId(instanceKey(ctx, "turn_start_restore")),
          type: "turn_start_trigger",
          restoreResourceKey: mechanic.restoreResourceKey,
          restoreResourceAmount: mechanic.restoreResourceAmount,
        },
      ]),
    }
  }

  // Captured in BYO mechanics[] for review; runtime wiring for ephemeral grants is not implemented yet.
  if (mechanic.kind === "turn_start_bonus_grant") {
    return null
  }

  if (mechanic.kind === "turn_start_trigger") {
    // "hit_points"/"hp" isn't a class-resource pool — the LLM means "heal N HP at turn start"
    // (Elder Champion's Regeneration, etc.), not a resource restore. Route it to the heal
    // fields instead of restoreResourceKey, which would just no-op looking for a nonexistent
    // "..._hit_points" resource row.
    const isHitPointsRestore =
      mechanic.restoreResourceKey === "hit_points" || mechanic.restoreResourceKey === "hp"
    return {
      ruleId: "ai.turn_start_trigger",
      confidence: aiConfidence(mechanic),
      matchedPhrase,
      instance: charInstance(instanceId, characteristicCatalogRefId("turn_start_trigger"), [
        {
          id: modId(instanceKey(ctx, "turn_start")),
          type: "turn_start_trigger",
          ...(mechanic.hpBelowFraction != null ? { hpBelowFraction: mechanic.hpBelowFraction } : {}),
          ...(isHitPointsRestore
            ? { healMode: "fixed" as const, healFixed: mechanic.restoreResourceAmount ?? 1 }
            : mechanic.restoreResourceKey
              ? {
                  restoreResourceKey: mechanic.restoreResourceKey,
                  restoreResourceAmount: mechanic.restoreResourceAmount ?? 1,
                }
              : {}),
          ...(mechanic.grantResourceKey
            ? {
                accrueResourceKey: mechanic.grantResourceKey,
                accrueResourceAmount: mechanic.grantAmount ?? 1,
              }
            : {}),
          ...(mechanic.blockedByConditions?.length
            ? { blockedByConditions: mechanic.blockedByConditions }
            : {}),
          ...(mechanic.requiresSheetToggle
            ? { requiresSheetToggle: mechanic.requiresSheetToggle as never }
            : {}),
        },
      ]),
    }
  }

  if (mechanic.kind === "on_hit_trigger") {
    // Bonus damage ("extra NdM [type] damage on hit") is described via the SAME
    // damage_roll_modifiers shape used by the top-level mechanic — nested here as this
    // trigger's `effect` so it actually shows up on the weapon attack line, gated by
    // triggerOn/oncePerTurn/spendResourceKey on the outer trigger characteristic.
    const nestedDamage = buildDamageRollModifiersCharacteristic(
      mechanic,
      ctx,
      "on_hit_damage",
      mechanic.oncePerTurn ? "(once per turn, on hit)" : "(on hit)",
    )
    const nestedInstanceId = nestedDamage ? instanceKey(ctx, "on_hit_damage_effect") : undefined
    return {
      ruleId: "ai.on_hit_trigger",
      confidence: aiConfidence(mechanic),
      matchedPhrase,
      instance: charInstance(instanceId, characteristicCatalogRefId("on_hit_trigger"), [
        {
          id: modId(instanceKey(ctx, "on_hit")),
          type: "on_hit_trigger",
          triggerOn: mechanic.triggerOn ?? "hit",
          oncePerTurn: mechanic.oncePerTurn ?? false,
          ...(mechanic.spendResourceKey
            ? {
                spendResourceKey: mechanic.spendResourceKey,
                spendResourceAmount: mechanic.spendResourceAmount ?? 1,
              }
            : {}),
          ...(mechanic.maximizeWeaponDamage
            ? {
                maximizeWeaponDamage: true,
                maximizeWeaponDamageAtLevel: mechanic.maximizeWeaponDamageAtLevel ?? null,
              }
            : {}),
          ...(mechanic.requiresSheetToggle
            ? { requiresSheetToggle: mechanic.requiresSheetToggle as never }
            : {}),
          ...(nestedDamage && nestedInstanceId
            ? {
                effect: {
                  instanceId: nestedInstanceId,
                  catalogRefId: characteristicCatalogRefId("damage_roll_modifiers"),
                  characteristics: [nestedDamage],
                },
              }
            : {}),
          // damageTypeOptions (player-chosen damage type per use) remains on the ImportMechanic
          // for review — there's no per-use damage-type-choice mechanism on this characteristic.
        },
      ]),
    }
  }

  if (mechanic.kind === "initiative") {
    const mode = mechanic.initiativeMode ?? "flat_bonus"
    return {
      ruleId: "ai.initiative",
      confidence: aiConfidence(mechanic),
      matchedPhrase,
      instance: charInstance(instanceId, characteristicCatalogRefId("initiative"), [
        {
          id: modId(instanceKey(ctx, "initiative")),
          type: "initiative",
          mode,
          ...(mode === "flat_bonus" ? { flatBonus: mechanic.initiativeFlatBonus ?? 1 } : {}),
          ...(mode === "ability_modifier" || mode === "add_ability_modifier"
            ? {
                ability: abilityScoreToModifierKey(mechanic.initiativeAbility),
                bonus: 0,
              }
            : {}),
        },
      ]),
    }
  }

  if (mechanic.kind === "telepathy") {
    if (mechanic.telepathyRangeFeet == null) return null
    return {
      ruleId: "ai.telepathy",
      confidence: aiConfidence(mechanic),
      matchedPhrase,
      instance: charInstance(instanceId, characteristicCatalogRefId("telepathy"), [
        {
          id: modId(instanceKey(ctx, "telepathy")),
          type: "telepathy",
          rangeFeet: mechanic.telepathyRangeFeet,
        },
      ]),
    }
  }

  if (mechanic.kind === "unarmed_strike_damage") {
    if (!mechanic.dieByLevel?.length) return null
    const dieByLevel = mechanic.dieByLevel.map((entry) => {
      const match = entry.die.match(/^(\d+)d(\d+)$/i)
      return {
        level: entry.level,
        mode: "dice" as const,
        dieCount: match ? parseInt(match[1], 10) : 1,
        dieType: (match ? `d${match[2]}` : "d8") as "d4" | "d6" | "d8" | "d10" | "d12",
      }
    })
    return {
      ruleId: "ai.unarmed_strike_damage",
      confidence: aiConfidence(mechanic),
      matchedPhrase,
      instance: charInstance(instanceId, characteristicCatalogRefId("unarmed_strike_damage"), [
        {
          id: modId(instanceKey(ctx, "unarmed_die")),
          type: "unarmed_strike_damage",
          dieByLevel,
        },
      ]),
    }
  }

  if (mechanic.kind === "resource_ability_menu") {
    const resourceKey = mechanic.classResourceKey ?? mechanic.spendResourceKey
    if (!resourceKey) return null
    return {
      ruleId: "ai.resource_ability_menu",
      confidence: aiConfidence(mechanic),
      matchedPhrase,
      instance: charInstance(instanceId, characteristicCatalogRefId("resource_ability_menu"), [
        {
          id: modId(instanceKey(ctx, "resource_menu")),
          type: "resource_ability_menu",
          resourceKey,
          waiveResourceCost: mechanic.waiveResourceCost ?? false,
          options: (mechanic.menuAbilityNames ?? []).map((name) => ({ name })),
        },
      ]),
    }
  }

  if (mechanic.kind === "temporary_hit_points") {
    return buildTemporaryHitPointsEffect(mechanic, ctx, instanceId, matchedPhrase)
  }

  if (mechanic.kind === "weapon_reach_modifier") {
    const reachBonusFeet = mechanic.reachBonusFeet
    if (reachBonusFeet == null || !(reachBonusFeet > 0)) return null
    return {
      ruleId: "ai.weapon_reach_modifier",
      confidence: aiConfidence(mechanic),
      matchedPhrase,
      instance: charInstance(instanceId, characteristicCatalogRefId("weapon_reach_modifier"), [
        {
          id: modId(instanceKey(ctx, "weapon_reach")),
          type: "weapon_reach_modifier",
          reachBonusFeet,
          weaponPropertyFilter: mechanic.weaponPropertyFilter?.length ? mechanic.weaponPropertyFilter : undefined,
          // Reach mechanics are overwhelmingly "your Unarmed Strike gains reach" (Elemental
          // Attunement, etc.) rather than a filter on carried weapons — default true unless the
          // source explicitly scoped this to specific weapon properties instead.
          appliesToUnarmedStrike: !mechanic.weaponPropertyFilter?.length,
          ...(mechanic.requiresSheetToggle ? { requiresSheetToggle: mechanic.requiresSheetToggle } : {}),
        },
      ]),
    }
  }

  // extra_weapon_mastery: accepted in mechanics[] for import review only (no stable
  // characteristic mapping yet — applying extra Weapon Mastery properties needs per-weapon
  // mastery-slot bookkeeping this pipeline doesn't have).
  if (mechanic.kind === "extra_weapon_mastery") {
    return null
  }

  if (mechanic.kind === "movement_grant") {
    // Moving OTHER creatures (allies/chosen creatures) isn't modeled by movement_option, which
    // is a self-only "extra movement option" effect — leave those for manual review.
    if (mechanic.targets && mechanic.targets !== "self") return null

    let moveDistanceMode: "speed" | "fixed" | "multiplier" | null = null
    let moveDistanceFixed: number | undefined
    let moveDistanceMultiplier: number | undefined
    if (mechanic.distanceMode === "fixed" && mechanic.distanceFeet != null) {
      moveDistanceMode = "fixed"
      moveDistanceFixed = mechanic.distanceFeet
    } else if (mechanic.distanceMode === "fraction_of_speed" && mechanic.fraction != null) {
      moveDistanceMode = "multiplier"
      moveDistanceMultiplier = mechanic.fraction
    } else if (mechanic.distanceMode === "full_speed") {
      moveDistanceMode = "speed"
    }
    if (!moveDistanceMode) return null

    const trigger = mechanic.trigger?.toLowerCase() ?? ""
    const activation: FeatureActivation = trigger.includes("bonus_action")
      ? { bonusAction: true }
      : trigger.includes("reaction")
        ? { reaction: true }
        : trigger.includes("action")
          ? { action: true }
          : {}

    return {
      ruleId: "ai.movement_grant",
      confidence: aiConfidence(mechanic),
      matchedPhrase,
      instance: fxInstance(instanceId, effectCatalogRefId("movement_option"), {
        ...activation,
        effects: [
          {
            id: modId(instanceKey(ctx, "movement_grant")),
            kind: "movement_option",
            moveDistanceMode,
            ...(moveDistanceFixed != null ? { moveDistanceFixed } : {}),
            ...(moveDistanceMultiplier != null ? { moveDistanceMultiplier } : {}),
            ...(mechanic.teleport ? { movementTeleport: true } : {}),
            ...(mechanic.provokesOpportunityAttacks === false ? { moveWithoutOpportunityAttacks: true } : {}),
            label: matchedPhrase,
          },
        ],
      }),
    }
  }

  if (mechanic.kind === "damage_reduction") {
    const mode = mechanic.reductionMode ?? (mechanic.reductionAmount != null ? "flat" : "evasion")
    if (mode === "flat") {
      const amount = mechanic.reductionAmount
      if (amount == null || !(amount > 0)) return null
      return {
        ruleId: "ai.damage_reduction.flat",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, characteristicCatalogRefId("damage_reduction"), [
          {
            id: modId(instanceKey(ctx, "damage_reduction")),
            type: "damage_reduction",
            amount,
            damageTypes: mechanic.damageTypes?.length
              ? mechanic.damageTypes
              : ["Bludgeoning", "Piercing", "Slashing"],
          },
        ]),
      }
    }
    return {
      ruleId: "ai.damage_reduction.evasion",
      confidence: aiConfidence(mechanic),
      matchedPhrase,
      instance: buildEvasionModifier(instanceId),
    }
  }

  if (!VALID_CHARACTERISTIC_KINDS.has(mechanic.kind)) return null

  switch (mechanic.kind) {
    case "skills": {
      if (mechanic.choiceCount && mechanic.choiceCount > 0) {
        return {
          ruleId: "ai.skills.choice",
          confidence: aiConfidence(mechanic),
          matchedPhrase,
          instance: charInstance(instanceId, characteristicCatalogRefId("skills"), [
            {
              id: modId(instanceKey(ctx, "skills_choice")),
              type: "skills",
              entries: [],
              allowAnySkill: true,
              choiceCount: mechanic.choiceCount,
            },
          ]),
        }
      }
      const skills = mechanic.skills?.map(titleCaseWords).filter(Boolean) ?? []
      if (!skills.length) return null
      return {
        ruleId: "ai.skills",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, characteristicCatalogRefId("skills"), [
          {
            id: modId(instanceKey(ctx, "skills")),
            type: "skills",
            entries: skills.map((skill) => ({
              skill,
              expertise: Boolean(mechanic.grantExpertise),
            })),
            grantExpertise: mechanic.grantExpertise,
          },
        ]),
      }
    }
    case "tool_proficiencies": {
      const tools = mechanic.tools?.map(titleCaseWords).filter(Boolean) ?? []
      if (!tools.length && !mechanic.grantExpertise) return null
      return {
        ruleId: mechanic.grantExpertise ? "ai.tools.expertise" : "ai.tools",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, characteristicCatalogRefId("tool_proficiencies"), [
          {
            id: modId(instanceKey(ctx, "tools")),
            type: "tool_proficiencies",
            values: tools,
            ...(mechanic.grantExpertise ? { grantExpertise: true } : {}),
          },
        ]),
      }
    }
    case "armor_proficiencies": {
      const armor = mechanic.armor?.map(titleCaseWords).filter(Boolean) ?? []
      if (!armor.length) return null
      return {
        ruleId: "ai.armor",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, characteristicCatalogRefId("armor_proficiencies"), [
          {
            id: modId(instanceKey(ctx, "armor")),
            type: "armor_proficiencies",
            values: armor,
          },
        ]),
      }
    }
    case "weapon_proficiencies": {
      if (!mechanic.weaponMode) return null
      return {
        ruleId: "ai.weapons",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, characteristicCatalogRefId("weapon_proficiencies"), [
          {
            id: modId(instanceKey(ctx, "weapons")),
            type: "weapon_proficiencies",
            mode: mechanic.weaponMode as import("@/lib/compendium/weapon-proficiency-options").WeaponProficiencyMode,
            values: [],
          },
        ]),
      }
    }
    case "saving_throws": {
      const saves = mechanic.savingThrows ?? []
      if (!saves.length) return null
      return {
        ruleId: "ai.saves",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, characteristicCatalogRefId("saving_throws"), [
          {
            id: modId(instanceKey(ctx, "saves")),
            type: "saving_throws",
            values: saves,
          },
        ]),
      }
    }
    case "languages": {
      const languages = mechanic.languages?.map(titleCaseWords).filter(Boolean) ?? []
      const choiceCount = mechanic.languageChoiceCount ?? 0
      if (!languages.length && choiceCount <= 0) return null
      return {
        ruleId: choiceCount > 0 ? "ai.languages.choice" : "ai.languages",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, characteristicCatalogRefId("languages"), [
          {
            id: modId(instanceKey(ctx, choiceCount > 0 ? "lang_choice" : "lang")),
            type: "languages",
            values: languages,
            choiceCount: choiceCount > 0 ? choiceCount : null,
            choicePool: mechanic.choicePool ?? (choiceCount > 0 ? "standard" : null),
          },
        ]),
      }
    }
    case "spells_known": {
      const spellNames = mechanic.spellNames?.map((name) => name.trim()).filter(Boolean) ?? []
      const choiceGrants = mechanic.spellChoiceGrants ?? []
      if (!spellNames.length && !choiceGrants.length) return null
      return {
        ruleId: "ai.spells_known",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, characteristicCatalogRefId("spells_known"), [
          {
            id: modId(instanceKey(ctx, "spells_known")),
            type: "spells_known",
            spells: spellNames.map((name) => ({
              spellId: spellNamePlaceholder(name),
              alwaysPrepared: mechanic.alwaysPrepared ?? true,
              castAsRitual: mechanic.castAsRitual || undefined,
              unlocksAtClassLevel: mechanic.unlocksAtClassLevel,
            })),
            choiceGrants,
            alwaysPrepared: mechanic.alwaysPrepared ?? (spellNames.length > 0 ? true : undefined),
            castingAbility: mechanic.spellcastingAbility,
            label: mechanic.spellChoiceLabel,
          },
        ]),
      }
    }
    case "ac": {
      if (mechanic.acFlatBonus != null) {
        return {
          ruleId: "ai.ac.flat",
          confidence: aiConfidence(mechanic),
          matchedPhrase,
          instance: charInstance(instanceId, characteristicCatalogRefId("ac"), [
            {
              id: modId(instanceKey(ctx, "ac_bonus")),
              type: "ac",
              mode: "flat_bonus",
              flatBonus: mechanic.acFlatBonus,
              ...(mechanic.requiresSheetToggle ? { requiresSheetToggle: mechanic.requiresSheetToggle } : {}),
            },
          ]),
        }
      }
      const abilities = (mechanic.acAbilities ?? []).map(
        (ability) =>
          ({
            strength: "STR",
            dexterity: "DEX",
            constitution: "CON",
            intelligence: "INT",
            wisdom: "WIS",
            charisma: "CHA",
          })[ability],
      ) as import("@/lib/compendium/characteristic-modifiers").AbilityModifierKey[]
      if (!abilities.length || mechanic.acBase == null) return null
      return {
        ruleId: "ai.ac.formula",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, characteristicCatalogRefId("ac"), [
          {
            id: modId(instanceKey(ctx, "ac_formula")),
            type: "ac",
            mode: "ability_modifiers",
            base: mechanic.acBase,
            abilities,
            ...(mechanic.requiresSheetToggle ? { requiresSheetToggle: mechanic.requiresSheetToggle } : {}),
          },
        ]),
      }
    }
    case "hit_points": {
      if (mechanic.hpValue == null) return null
      return {
        ruleId: "ai.hit_points",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, characteristicCatalogRefId("hit_points"), [
          {
            id: modId(instanceKey(ctx, "hp")),
            type: "hit_points",
            mode: mechanic.hpMode ?? "per_level",
            value: mechanic.hpValue,
          },
        ]),
      }
    }
    case "attack_roll_modifiers": {
      if (mechanic.attackBonus == null) return null
      return {
        ruleId: "ai.attack",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, characteristicCatalogRefId("attack_roll_modifiers"), [
          {
            id: modId(instanceKey(ctx, "attack")),
            type: "attack_roll_modifiers",
            entries: [{ bonus: mechanic.attackBonus, target: mechanic.attackTarget ?? "all" }],
          },
        ]),
      }
    }
    case "damage_roll_modifiers": {
      const characteristic = buildDamageRollModifiersCharacteristic(mechanic, ctx, "damage")
      if (!characteristic) return null
      const hasCreatureTypes = characteristic.entries[0]?.onlyVsCreatureTypes?.length
      return {
        ruleId: hasCreatureTypes ? "ai.damage.creature_type" : "ai.damage",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, characteristicCatalogRefId("damage_roll_modifiers"), [
          characteristic,
        ]),
      }
    }
    case "damage_resistance": {
      const types = (mechanic.damageTypes ?? []).map(titleCaseWords).filter(Boolean)
      // "Spells" / "Spell damage" aren't elemental types — they mean "damage from spells"
      // (Abjurer Spell Resistance). Route that to fromSpells instead of a dead type token.
      const fromSpells = types.some((t) => /^(?:spells?|spell damage)$/i.test(t))
      const concreteTypes = types.filter((t) => !/^(?:spells?|spell damage)$/i.test(t))
      if (!concreteTypes.length && !fromSpells) return null
      return {
        ruleId: fromSpells ? "ai.resistance.spell_damage" : "ai.resistance",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, characteristicCatalogRefId("damage_resistance"), [
          {
            id: modId(instanceKey(ctx, "resistance")),
            type: "damage_resistance",
            damageTypes: concreteTypes,
            ...(fromSpells ? { fromSpells: true } : {}),
            ...(mechanic.requiresSheetToggle ? { requiresSheetToggle: mechanic.requiresSheetToggle } : {}),
          },
        ]),
      }
    }
    case "condition_immunity": {
      const conditions = (mechanic.conditions ?? []).map(titleCaseWords).filter(Boolean)
      if (!conditions.length) return null
      return {
        ruleId: "ai.condition_immunity",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, characteristicCatalogRefId("condition_immunity"), [
          {
            id: modId(instanceKey(ctx, "immune")),
            type: "condition_immunity",
            conditions,
            ...(mechanic.requiresSheetToggle ? { requiresSheetToggle: mechanic.requiresSheetToggle } : {}),
          },
        ]),
      }
    }
    case "speed": {
      const isEqualToWalk = mechanic.speedMode === "equal_to_walk"
      if (!isEqualToWalk && mechanic.speedFeet == null) return null
      return {
        ruleId: "ai.speed",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, characteristicCatalogRefId("speed"), [
          {
            id: modId(instanceKey(ctx, "speed")),
            type: "speed",
            speedType: mechanic.speedType ?? "walk",
            mode: isEqualToWalk ? "equal_to_walk" : "add",
            value: isEqualToWalk ? 0 : (mechanic.speedFeet as number),
            ...(mechanic.canHover && (mechanic.speedType ?? "walk") === "fly"
              ? { customType: "hover" }
              : {}),
            ...(mechanic.requiresSheetToggle ? { requiresSheetToggle: mechanic.requiresSheetToggle } : {}),
          },
        ]),
      }
    }
    case "vision": {
      if (mechanic.visionRangeFeet == null) return null
      return {
        ruleId: "ai.vision",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, characteristicCatalogRefId("vision"), [
          {
            id: modId(instanceKey(ctx, "vision")),
            type: "vision",
            visionType: mechanic.visionType ?? "darkvision",
            rangeFeet: mechanic.visionRangeFeet,
          },
        ]),
      }
    }
    case "uses": {
      if (isReactionRechargePhrase(matchedPhrase)) return null
      if (mechanic.usesRecharge === "until_item_consumed") {
        const uses: UsesConfig = {
          type: "special",
          specialDescription:
            mechanic.sourcePhrase?.trim() ||
            "Spent resource cannot be regained until the crafted item is spent or destroyed",
        }
        return {
          ruleId: "ai.uses",
          confidence: aiConfidence(mechanic),
          matchedPhrase,
          instance: usesInstance(instanceId, uses, ctx.featureName ?? "Limited uses"),
        }
      }
      if (mechanic.usesRecharge === "on_resource_reactivation") {
        const gate = mechanic.gatingResourceKey?.trim() || "resource"
        const uses: UsesConfig = {
          type: "special",
          specialDescription:
            mechanic.sourcePhrase?.trim() ||
            `Refreshes when ${gate} is (re)activated`,
        }
        return {
          ruleId: "ai.uses.on_resource_reactivation",
          confidence: aiConfidence(mechanic),
          matchedPhrase,
          instance: usesInstance(instanceId, uses, ctx.featureName ?? "Limited uses"),
        }
      }
      // "Spend N of class resource X" with no independent usesFixed/usesRecharge means the
      // ability itself has no separate use cap — it's unlimited, gated only by resource
      // availability (e.g. Hand of Healing: "expend 1 Focus Point", no per-rest cap of its own).
      // Only take this branch when usesFixed/usesAbility weren't ALSO given — those mean there's
      // a real cap on top of the resource cost (e.g. "3/long rest, or spend a resource to renew").
      const uses: UsesConfig = mechanic.usesAbility
        ? {
            type: "ability_modifier",
            abilityModifier: mechanic.usesAbility,
            recharges: usesRechargesFromImport(mechanic.usesRecharge),
          }
        : mechanic.usesProficiency
          ? {
              type: "proficiency",
              recharges: usesRechargesFromImport(mechanic.usesRecharge),
            }
          : mechanic.usesFixed == null && mechanic.classResourceKey
            ? {
                type: "class_resource",
                classResourceKey: mechanic.classResourceKey,
                classResourceAmount: mechanic.classResourceCost ?? 1,
              }
            : {
                type: "fixed",
                fixedAmount: mechanic.usesFixed ?? 1,
                recharges: usesRechargesFromImport(mechanic.usesRecharge),
              }
      // "Spend another resource to restore a use" — UsesConfig.restoreByResource/restoreBySpellSlot
      // already exist and are exercised by hand-written presets (e.g. Beguiling Magic rider); the
      // schema just never routed alternateRefresh into them. actionCost has no matching UsesConfig
      // field (restores are modeled as passive bookkeeping, not their own activatable ability) and
      // is intentionally left off.
      const alternateRefresh = mechanic.alternateRefresh
      if (alternateRefresh?.spendSpellSlotMinLevel != null) {
        uses.restoreBySpellSlot = {
          minSpellLevel: alternateRefresh.spendSpellSlotMinLevel,
          restores: 1,
        }
      } else if (alternateRefresh?.spendResourceKey) {
        uses.restoreByResource = {
          resourceKey: alternateRefresh.spendResourceKey,
          resourceAmount: alternateRefresh.spendAmount ?? 1,
          restores: 1,
        }
      }
      return {
        ruleId: "ai.uses",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: usesInstance(instanceId, uses, ctx.featureName ?? "Limited uses"),
      }
    }
    case "grant_feat": {
      const categories = (mechanic.featCategories?.length
        ? mechanic.featCategories
        : ["General"]) as FeatPickCategory[]
      const characteristic = grantFeatCharacteristic(categories, mechanic.featCount ?? 1)
      return {
        ruleId: "ai.grant_feat",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, GRANT_FEAT_CATALOG_ID, [characteristic]),
      }
    }
    case "spellcasting_ability": {
      const ability = mechanic.spellcastingAbility
      if (!ability) return null
      return {
        ruleId: "ai.spellcasting_ability",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, characteristicCatalogRefId("spellcasting_ability"), [
          {
            id: modId(instanceKey(ctx, "spell_ability")),
            type: "spellcasting_ability",
            ability,
            label: mechanic.spellChoiceLabel ?? `${ability} spellcasting`,
            ...(mechanic.requiresSheetToggle ? { requiresSheetToggle: mechanic.requiresSheetToggle } : {}),
          },
        ]),
      }
    }
    case "attunement_slots": {
      if (mechanic.attunementTotal == null && mechanic.attunementBonus == null) return null
      return {
        ruleId: "ai.attunement_slots",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, "cat_char_attunement_slots", [
          {
            id: modId(instanceKey(ctx, "attune")),
            type: "attunement_slots",
            ...(mechanic.attunementTotal != null ? { totalSlots: mechanic.attunementTotal } : {}),
            ...(mechanic.attunementBonus != null ? { bonusSlots: mechanic.attunementBonus } : {}),
            label:
              mechanic.attunementTotal != null
                ? `Attune to ${mechanic.attunementTotal} magic items`
                : `+${mechanic.attunementBonus} attunement slots`,
          },
        ]),
      }
    }
    case "skill_check_alternate_ability": {
      if (!mechanic.alternateAbility) return null
      return {
        ruleId: "ai.skill_check_alternate_ability",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, characteristicCatalogRefId("skill_check_alternate_ability"), [
          {
            id: modId(instanceKey(ctx, "skill_alt_ability")),
            type: "skill_check_alternate_ability",
            ability: mechanic.alternateAbility,
            skills: mechanic.alternateSkills ?? [],
            ...(mechanic.requiresSheetToggle
              ? { limitations: [createModifierLimitation({
                  kind: "sheet_toggle",
                  rule: "requires_active",
                  value: mechanic.requiresSheetToggle,
                })] }
              : {}),
          },
        ]),
      }
    }
    case "saving_throw_alternate_ability": {
      if (!mechanic.alternateAbility) return null
      return {
        ruleId: "ai.saving_throw_alternate_ability",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, characteristicCatalogRefId("saving_throw_alternate_ability"), [
          {
            id: modId(instanceKey(ctx, "save_alt_ability")),
            type: "saving_throw_alternate_ability",
            ability: mechanic.alternateAbility,
            saves: mechanic.alternateSaves ?? [],
          },
        ]),
      }
    }
    case "forced_save_ability_remap": {
      if (!mechanic.toSaveAbility) return null
      return {
        ruleId: "ai.forced_save_ability_remap",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, characteristicCatalogRefId("forced_save_ability_remap"), [
          {
            id: modId(instanceKey(ctx, "forced_save_remap")),
            type: "forced_save_ability_remap",
            fromAbility: (mechanic.fromSaveAbility as "any" | "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA") ?? "any",
            toAbility: mechanic.toSaveAbility,
            scope: mechanic.forcedSaveScope ?? "your_features",
          },
        ]),
      }
    }
    case "weapon_ability_override": {
      if (!mechanic.alternateAbility) return null
      return {
        ruleId: "ai.weapon_ability_override",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, characteristicCatalogRefId("weapon_ability_override"), [
          {
            id: modId(instanceKey(ctx, "weapon_ability")),
            type: "weapon_ability_override",
            ability: mechanic.alternateAbility,
            appliesTo: mechanic.weaponAbilityAppliesTo ?? "both",
            scope: mechanic.weaponAbilityScope ?? "all",
            weaponNames: mechanic.weaponNames ?? [],
          },
        ]),
      }
    }
    default:
      return null
  }
}

/** Convert validated AI mechanics[] entries into detected modifier instances. */
export function aiMechanicsToDetections(
  mechanics: ImportMechanic[] | undefined,
  ctx: DetectFeatureContext,
): DetectedModifier[] {
  if (!mechanics?.length) return []
  const results: DetectedModifier[] = []
  for (const mechanic of mechanics) {
    const detection = buildFromMechanic(mechanic, ctx)
    if (detection) results.push(detection)
  }
  return results
}
