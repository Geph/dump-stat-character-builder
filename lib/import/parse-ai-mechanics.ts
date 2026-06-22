import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
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

function usesRechargesFromImport(
  recharge: ImportMechanic["usesRecharge"],
): UsesConfig["recharges"] {
  if (recharge === "short_rest") return [{ rest: "short_rest" }]
  if (recharge === "both") return [{ rest: "short_rest" }, { rest: "long_rest" }]
  return [{ rest: "long_rest" }]
}

function aiConfidence(mechanic: ImportMechanic): DetectionConfidence {
  return mechanic.confidence ?? "medium"
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
      if (!tools.length) return null
      return {
        ruleId: "ai.tools",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, characteristicCatalogRefId("tool_proficiencies"), [
          {
            id: modId(instanceKey(ctx, "tools")),
            type: "tool_proficiencies",
            values: tools,
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
            mode: mechanic.weaponMode,
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
      const abilities = (mechanic.acAbilities ?? []) as AbilityScoreKey[]
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
      return {
        ruleId: "ai.damage",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: charInstance(instanceId, characteristicCatalogRefId("damage_roll_modifiers"), [
          {
            id: modId(instanceKey(ctx, "damage")),
            type: "damage_roll_modifiers",
            entries: [
              {
                bonus: 0,
                target: "all",
                customTarget: `${dice}${damageType ? ` ${damageType}` : ""}`,
              },
            ],
            label: `Extra ${dice}${damageType ? ` ${damageType}` : ""} damage`,
          },
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
      return {
        ruleId: "ai.uses",
        confidence: aiConfidence(mechanic),
        matchedPhrase,
        instance: usesInstance(instanceId, uses, ctx.featureName ?? "Limited uses"),
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
