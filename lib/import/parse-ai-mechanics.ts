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
import type { UsesConfig } from "@/lib/types"

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

function isReactionRechargePhrase(phrase: string): boolean {
  return (
    /\bonce you take this reaction\b/i.test(phrase) ||
    /\bcan'?t use this benefit again until you finish a long rest\b/i.test(phrase)
  )
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
          },
        ],
      }),
    }
  }

  if (mechanic.kind === "turn_start_resource_restore") {
    if (!mechanic.restoreResourceKey || mechanic.restoreResourceAmount == null) return null
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
    return {
      ruleId: "ai.turn_start_trigger",
      confidence: aiConfidence(mechanic),
      matchedPhrase,
      instance: charInstance(instanceId, characteristicCatalogRefId("turn_start_trigger"), [
        {
          id: modId(instanceKey(ctx, "turn_start")),
          type: "turn_start_trigger",
          ...(mechanic.hpBelowFraction != null ? { hpBelowFraction: mechanic.hpBelowFraction } : {}),
          ...(mechanic.restoreResourceKey
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
          // Dice / scaling / damageTypeOptions remain on the ImportMechanic for review when
          // nested bonus-damage wiring is incomplete.
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
          ...(mode === "ability_modifier"
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

  // Accepted in mechanics[] for import review / future wiring (no stable characteristic mapping yet).
  if (
    mechanic.kind === "temporary_hit_points" ||
    mechanic.kind === "weapon_reach_modifier" ||
    mechanic.kind === "extra_weapon_mastery" ||
    mechanic.kind === "movement_grant"
  ) {
    return null
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
      const characteristic = {
        id: modId(instanceKey(ctx, "damage")),
        type: "damage_roll_modifiers" as const,
        entries: [entry],
        label: creatureTypes?.length
          ? `Extra ${dice}${damageType ? ` ${damageType}` : ""} vs ${creatureTypes.join(", ")}`
          : `Extra ${dice}${damageType ? ` ${damageType}` : ""} damage`,
        ...(mechanic.requiresSheetToggle ? { requiresSheetToggle: mechanic.requiresSheetToggle } : {}),
      }
      return {
        ruleId: creatureTypes?.length ? "ai.damage.creature_type" : "ai.damage",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, characteristicCatalogRefId("damage_roll_modifiers"), [
          characteristic,
        ]),
      }
    }
    case "damage_resistance": {
      const types = (mechanic.damageTypes ?? []).map(titleCaseWords).filter(Boolean)
      if (!types.length) return null
      return {
        ruleId: "ai.resistance",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, characteristicCatalogRefId("damage_resistance"), [
          {
            id: modId(instanceKey(ctx, "resistance")),
            type: "damage_resistance",
            damageTypes: types,
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
          },
        ]),
      }
    }
    case "speed": {
      if (mechanic.speedFeet == null) return null
      return {
        ruleId: "ai.speed",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, characteristicCatalogRefId("speed"), [
          {
            id: modId(instanceKey(ctx, "speed")),
            type: "speed",
            speedType: mechanic.speedType ?? "walk",
            mode: "add",
            value: mechanic.speedFeet,
            ...(mechanic.canHover && (mechanic.speedType ?? "walk") === "fly"
              ? { customType: "hover" }
              : {}),
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
            visionType: "darkvision",
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
      const uses: UsesConfig = mechanic.usesAbility
        ? {
            type: "ability_modifier",
            abilityModifier: mechanic.usesAbility,
            recharges: usesRechargesFromImport(mechanic.usesRecharge),
          }
        : {
            type: "fixed",
            fixedAmount: mechanic.usesFixed ?? 1,
            recharges: usesRechargesFromImport(mechanic.usesRecharge),
          }
      // alternateRefresh is retained on the ImportMechanic for review; UsesConfig has no field yet.
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
