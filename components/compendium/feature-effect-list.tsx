"use client"

import { Plus, Trash2, Copy } from "lucide-react"
import {
  ABILITY_CHECK_OPTIONS,
  ACTION_EFFECT_GROUPS,
  ACTION_EFFECT_OPTIONS,
  CHECK_CATEGORIES,
  MOVEMENT_TYPE_OPTIONS,
  CAST_SPELL_CASTING_TIME_OPTIONS,
  effectFieldsForKind,
  normalizeEffectKind,
  resolveCheckRollMode,
} from "@/lib/compendium/class-feature-metadata"
import { DAMAGE_TYPES } from "@/lib/compendium/damage-types"
import { SRD_CONDITIONS } from "@/lib/srd/condition-descriptions"
import { ABILITY_MODIFIER_KEYS } from "@/lib/compendium/characteristic-modifiers"
import { normalizeFeatureEffects } from "@/lib/compendium/normalize-feature-activation"
import { defaultRollBonusConfig, rollBonusFromLegacy } from "@/lib/compendium/roll-bonus-config"
import { DND_SKILLS } from "@/lib/compendium/constants"
import { ModifierLimitationsEditor } from "@/components/compendium/modifier-limitations-editor"
import { RollBonusEditor } from "@/components/compendium/roll-bonus-editor"
import {
  defaultBonusByLevelEntry,
  normalizeBonusByLevel,
  type BonusByLevelEntry,
} from "@/lib/compendium/bonus-by-level"
import type { ClassResource, FeatureActivation, FeatureEffect, MovementType } from "@/lib/types"

function newEffectId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `fx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

type FeatureEffectListProps = {
  activation: FeatureActivation
  classResources: ClassResource[]
  onChange: (activation: FeatureActivation) => void
  otherAbilities?: { id: string; name: string }[]
  /** Catalog admin: preview styling distinct from live feature editors. */
  templatePreview?: boolean
}

export function FeatureEffectList({
  activation,
  classResources,
  onChange,
  otherAbilities = [],
  templatePreview = false,
}: FeatureEffectListProps) {
  const effects = normalizeFeatureEffects(activation)

  const setEffects = (next: FeatureEffect[]) => {
    const { effect: _legacy, ...rest } = activation
    onChange({ ...rest, effects: next.length > 0 ? next : undefined })
  }

  const updateEffect = (id: string, patch: Partial<FeatureEffect>) => {
    setEffects(effects.map((effect) => (effect.id === id ? { ...effect, ...patch } : effect)))
  }

  const addEffect = () => {
    setEffects([...effects, { id: newEffectId(), kind: "" }])
  }

  const removeEffect = (id: string) => {
    setEffects(effects.filter((effect) => effect.id !== id))
  }

  const duplicateEffect = (id: string) => {
    const source = effects.find((effect) => effect.id === id)
    if (!source) return
    setEffects([
      ...effects,
      { ...JSON.parse(JSON.stringify(source)), id: newEffectId() },
    ])
  }

  const changeKind = (id: string, kind: string) => {
    const defaults: Partial<FeatureEffect> = {
      kind,
      mitigation: null,
      damageTypes: [],
      conditionTypes: [],
      reductionAmount: null,
      bonusByLevel: [],
      bonusDice: null,
      checkCategory: null,
      checkAbility: null,
      checkSkills: [],
      checkConditionTypes: [],
      bonusAmount: null,
      bonusConfig: null,
      buffMode: null,
      buffBonus: null,
      grantAdvantage: undefined,
      grantDisadvantage: undefined,
      classResourceKey: null,
      classResourceChange: null,
      classResourceAmount: null,
      healMode: null,
      healFixed: null,
      healDiceCount: null,
      healDieType: null,
      healFlatBonus: null,
      healLevelMultiplier: null,
      healAbility: null,
      rollTarget: null,
      extraAttackCount: null,
      movementDash: false,
      movementDisengage: false,
      movementHide: false,
      movementMoveThroughLargerSpaces: false,
      movementHideBehindLargerCreatures: false,
      moveDistanceMode: null,
      moveDistanceFixed: null,
      moveDistanceMultiplier: null,
      attackStyle: null,
      attackDiceCount: null,
      attackDieType: null,
      attackAbility: null,
      attackDamageBonus: null,
      attackProfile: null,
      saveDCBase: null,
      saveDCConfig: null,
      saveAbility: null,
      effectDamageTypes: [],
      effectConditionTypes: [],
      creatureModifyMode: null,
      creatureSpeedChange: null,
      creatureSpeedAmount: null,
      creatureMoveDistance: null,
      creatureRestrictions: [],
      checkRollMode: null,
      checkRerollOnNaturalOne: false,
      checkRollFloorEnabled: false,
      checkRollFloorBelow: null,
      checkRollFloorSetTo: null,
    }
    if (kind === "check_roll_modifier" || kind === "check_advantage" || kind === "check_bonus" || kind === "check_disadvantage") {
      defaults.kind = "check_roll_modifier"
      defaults.checkRollMode =
        kind === "check_advantage" ? "advantage" : kind === "check_disadvantage" ? "disadvantage" : "bonus"
    }
    if (kind === "class_resource") {
      defaults.classResourceChange = "reduce"
      defaults.classResourceAmount = 1
    }
    if (kind === "modify_creature" || kind === "modify_creature_roll") {
      defaults.rollTarget = "ally"
      defaults.creatureModifyMode = "roll"
      defaults.buffMode = "bonus"
      defaults.buffBonus = defaultRollBonusConfig("die")
    }
    if (kind === "movement_option") {
      defaults.movementDash = true
      defaults.movementDisengage = true
      defaults.movementHide = true
    }
    if (kind === "extra_attack") {
      defaults.extraAttackCount = 2
    }
    if (kind === "weapon_attack") {
      defaults.attackProfile = "melee"
      defaults.attackStyle = "melee"
      defaults.attackDiceCount = 1
      defaults.attackDieType = "d8"
      defaults.attackAbility = "STR"
      defaults.saveDCBase = 8
      defaults.saveDCConfig = defaultRollBonusConfig("proficiency")
    }
    updateEffect(id, defaults)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-foreground">Effect types</label>
        <button
          type="button"
          onClick={addEffect}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Plus className="h-3 w-3" />
          Add effect
        </button>
      </div>

      {effects.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No effects defined yet.</p>
      )}

      {effects.map((effect) => (
        <EffectRow
          key={effect.id}
          effect={effect}
          classResources={classResources}
          otherAbilities={otherAbilities}
          onKindChange={(kind) => changeKind(effect.id, kind)}
          onChange={(patch) => updateEffect(effect.id, patch)}
          onRemove={() => removeEffect(effect.id)}
          onDuplicate={() => duplicateEffect(effect.id)}
          templatePreview={templatePreview}
        />
      ))}
    </div>
  )
}

function EffectRow({
  effect,
  classResources,
  otherAbilities,
  onKindChange,
  onChange,
  onRemove,
  onDuplicate,
  templatePreview = false,
}: {
  effect: FeatureEffect
  classResources: ClassResource[]
  otherAbilities: { id: string; name: string }[]
  onKindChange: (kind: string) => void
  onChange: (patch: Partial<FeatureEffect>) => void
  onRemove: () => void
  onDuplicate: () => void
  templatePreview?: boolean
}) {
  const normalizedKind = normalizeEffectKind(effect.kind)
  const fields = effectFieldsForKind(normalizedKind)
  const visibleOptions = ACTION_EFFECT_OPTIONS.filter(
    (entry) => entry.value !== "buff_ally_roll" && entry.value !== "debuff_enemy_roll",
  )
  const option = visibleOptions.find(
    (entry) => entry.value === normalizedKind || entry.value === effect.kind,
  )

  return (
    <div
      className={
        templatePreview
          ? "rounded-lg border border-dashed border-secondary/40 bg-background/70 p-3 space-y-3"
          : "rounded-lg border border-border bg-background p-3 space-y-3"
      }
    >
      <div className="flex gap-2">
        <select
          value={normalizedKind}
          onChange={(e) => onKindChange(e.target.value)}
          className="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
        >
          <option value="">Select effect...</option>
          {ACTION_EFFECT_GROUPS.map((group) => (
            <optgroup key={group.id} label={group.label}>
              {visibleOptions.filter((entry) => entry.group === group.id).map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          type="button"
          onClick={onDuplicate}
          className="p-2 text-muted-foreground hover:text-primary"
          title="Duplicate effect"
        >
          <Copy className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="p-2 text-muted-foreground hover:text-destructive"
          title="Remove effect"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {option?.hint && <p className="text-xs text-muted-foreground">{option.hint}</p>}

      {fields.includes("mitigation") && (
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Mitigation</label>
          <select
            value={effect.mitigation ?? ""}
            onChange={(e) =>
              onChange({ mitigation: (e.target.value || null) as FeatureEffect["mitigation"] })
            }
            className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm"
          >
            <option value="">Select...</option>
            <option value="resistance">Resistance</option>
            <option value="immunity">Immunity</option>
            <option value="reduction">Flat reduction</option>
          </select>
        </div>
      )}

      {fields.includes("damageTypes") &&
        (effect.mitigation === "resistance" ||
          effect.mitigation === "immunity" ||
          effect.mitigation === "reduction" ||
          !effect.mitigation) && (
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Damage types</label>
          <div className="flex flex-wrap gap-2">
            {DAMAGE_TYPES.map((type) => {
              const selected = effect.damageTypes?.includes(type) ?? false
              return (
                <label
                  key={type}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-card text-xs cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(e) => {
                      const current = effect.damageTypes ?? []
                      onChange({
                        damageTypes: e.target.checked
                          ? [...current, type]
                          : current.filter((entry) => entry !== type),
                      })
                    }}
                    className="accent-primary"
                  />
                  {type}
                </label>
              )
            })}
          </div>
        </div>
      )}

      {fields.includes("conditionTypes") &&
        (effect.mitigation === "resistance" || effect.mitigation === "immunity") && (
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Conditions</label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {SRD_CONDITIONS.map((condition) => {
              const selected = effect.conditionTypes?.includes(condition.name) ?? false
              return (
                <label
                  key={condition.name}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-card text-xs cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(e) => {
                      const current = effect.conditionTypes ?? []
                      onChange({
                        conditionTypes: e.target.checked
                          ? [...current, condition.name]
                          : current.filter((entry) => entry !== condition.name),
                      })
                    }}
                    className="accent-primary"
                  />
                  {condition.name}
                </label>
              )
            })}
          </div>
        </div>
      )}

      {fields.includes("reductionAmount") && effect.mitigation === "reduction" && (
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Reduction amount</label>
          <input
            type="number"
            min={1}
            value={effect.reductionAmount ?? ""}
            onChange={(e) =>
              onChange({ reductionAmount: e.target.value ? parseInt(e.target.value, 10) : null })
            }
            className="w-full max-w-[8rem] px-3 py-2 bg-card border border-border rounded-lg text-sm"
          />
        </div>
      )}

      {fields.includes("defensiveSaveScope") && effect.mitigation === "reduction" && (
        <div className="space-y-2 rounded-lg border border-border bg-card/50 p-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={!!effect.defensiveSaveScope}
              onChange={(e) =>
                onChange({
                  defensiveSaveScope: e.target.checked,
                  checkCategory: e.target.checked ? "save" : effect.checkCategory,
                  checkAbility: e.target.checked ? effect.checkAbility ?? "Dexterity" : effect.checkAbility,
                })
              }
              className="accent-primary"
            />
            <span className="text-muted-foreground">Scoped to a saving throw (Evasion)</span>
          </label>
          {effect.defensiveSaveScope && (
            <>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Saving throw</label>
                <select
                  value={effect.checkAbility ?? "Dexterity"}
                  onChange={(e) => onChange({ checkAbility: e.target.value || null, checkCategory: "save" })}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm"
                >
                  {ABILITY_CHECK_OPTIONS.map((ability) => (
                    <option key={ability} value={ability}>
                      {ability}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">On successful save</label>
                <select
                  value={effect.defensiveSaveSuccess ?? "none"}
                  onChange={(e) =>
                    onChange({
                      defensiveSaveSuccess: e.target.value as FeatureEffect["defensiveSaveSuccess"],
                    })
                  }
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm"
                >
                  <option value="none">Take no damage (Evasion)</option>
                  <option value="half">Take half damage only</option>
                </select>
              </div>
            </>
          )}
        </div>
      )}

      {fields.includes("bonusByLevel") && (
        <BonusByLevelEditor
          rows={normalizeBonusByLevel(effect.bonusByLevel)}
          onChange={(bonusByLevel) => onChange({ bonusByLevel })}
          classResources={classResources}
        />
      )}

      {fields.includes("bonusDice") && (
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Bonus dice</label>
          <input
            type="text"
            value={effect.bonusDice ?? ""}
            onChange={(e) => onChange({ bonusDice: e.target.value || null })}
            placeholder="e.g. 2d6"
            className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm"
          />
        </div>
      )}

      {fields.includes("checkRollModifier") && (
        <CheckRollModifierEditor
          effect={effect}
          onChange={onChange}
          classResources={classResources}
        />
      )}

      {fields.includes("checkCategory") && (
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Check type</label>
          <select
            value={effect.checkCategory ?? ""}
            onChange={(e) =>
              onChange({ checkCategory: (e.target.value || null) as FeatureEffect["checkCategory"] })
            }
            className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm"
          >
            <option value="">Select...</option>
            {CHECK_CATEGORIES.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {fields.includes("checkAbility") &&
        (effect.checkCategory === "ability" ||
          effect.checkCategory === "save" ||
          effect.checkCategory === "attack") && (
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              {effect.checkCategory === "save" ? "Saving throw ability" : "Ability"}
            </label>
            <select
              value={effect.checkAbility ?? ""}
              onChange={(e) => onChange({ checkAbility: e.target.value || null })}
              className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm"
            >
              <option value="">Any / not specified</option>
              {ABILITY_CHECK_OPTIONS.map((ability) => (
                <option key={ability} value={ability}>
                  {ability}
                </option>
              ))}
            </select>
          </div>
        )}

      {fields.includes("checkConditionTypes") &&
        (effect.checkCategory === "save" || effect.checkCategory === "ability") && (
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Avoid or end condition
          </label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {SRD_CONDITIONS.map((condition) => {
              const selected = effect.checkConditionTypes?.includes(condition.name) ?? false
              return (
                <label
                  key={condition.name}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-card text-xs cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(e) => {
                      const current = effect.checkConditionTypes ?? []
                      onChange({
                        checkConditionTypes: e.target.checked
                          ? [...current, condition.name]
                          : current.filter((entry) => entry !== condition.name),
                      })
                    }}
                    className="accent-primary"
                  />
                  {condition.name}
                </label>
              )
            })}
          </div>
        </div>
      )}

      {fields.includes("checkSkills") && effect.checkCategory === "skill" && (
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Skills</label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {DND_SKILLS.map((skill) => {
              const selected = effect.checkSkills?.includes(skill) ?? false
              return (
                <label
                  key={skill}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-card text-xs cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(e) => {
                      const current = effect.checkSkills ?? []
                      onChange({
                        checkSkills: e.target.checked
                          ? [...current, skill]
                          : current.filter((entry) => entry !== skill),
                      })
                    }}
                    className="accent-primary"
                  />
                  {skill}
                </label>
              )
            })}
          </div>
        </div>
      )}

      {fields.includes("bonusAmount") && (
        <RollBonusEditor
          value={
            effect.bonusConfig ??
            rollBonusFromLegacy(effect.bonusAmount) ??
            defaultRollBonusConfig("fixed")
          }
          onChange={(bonusConfig) => onChange({ bonusConfig, bonusAmount: null })}
          classResources={classResources}
        />
      )}

      {fields.includes("modifyCreatureRoll") && (
        <ModifyCreatureEditor
          effect={effect}
          onChange={onChange}
          classResources={classResources}
        />
      )}

      {fields.includes("extraAttackCount") && (
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Attacks when taking the Attack action
          </label>
          <select
            value={effect.extraAttackCount ?? 2}
            onChange={(e) =>
              onChange({ extraAttackCount: parseInt(e.target.value, 10) })
            }
            className="w-full max-w-xs px-3 py-2 bg-card border border-border rounded-lg text-sm"
          >
            <option value={2}>2 attacks (Extra Attack)</option>
            <option value={3}>3 attacks (Two Extra Attacks)</option>
            <option value={4}>4 attacks (Three Extra Attacks)</option>
          </select>
        </div>
      )}

      {fields.includes("movementOption") && (
        <MovementOptionEditor effect={effect} onChange={onChange} />
      )}

      {fields.includes("castSpell") && (
        <CastSpellEditor effect={effect} onChange={onChange} />
      )}

      {fields.includes("weaponAttack") && (
        <WeaponAttackEditor effect={effect} onChange={onChange} />
      )}

      {fields.includes("healAmount") && (
        <HealAmountEditor effect={effect} onChange={onChange} label={effect.kind === "grant_temp_hp" ? "Temporary HP amount" : "Healing amount"} />
      )}

      {fields.includes("damageLinkedHeal") && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(effect.healEqualToDamageDealt)}
              onChange={(e) => onChange({ healEqualToDamageDealt: e.target.checked })}
              className="accent-primary"
            />
            <span className="text-muted-foreground">Heal HP equal to damage dealt</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(effect.bonusEqualToDamageDealt)}
              onChange={(e) => onChange({ bonusEqualToDamageDealt: e.target.checked })}
              className="accent-primary"
            />
            <span className="text-muted-foreground">Grant bonus equal to damage dealt</span>
          </label>
          {effect.bonusEqualToDamageDealt ? (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Bonus expires (minutes)</label>
              <input
                type="number"
                min={1}
                value={effect.bonusExpiresMinutes ?? ""}
                onChange={(e) =>
                  onChange({
                    bonusExpiresMinutes: e.target.value ? parseInt(e.target.value, 10) : null,
                  })
                }
                placeholder="e.g. 10"
                className="w-24 px-3 py-2 bg-card border border-border rounded-lg text-sm"
              />
            </div>
          ) : null}
        </div>
      )}

      {fields.includes("checkRollTargets") && (
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Affected roll types</label>
          <div className="flex flex-wrap gap-3 text-sm">
            {(["attack", "save", "ability", "skill"] as const).map((target) => {
              const selected = effect.checkRollTargets ?? []
              const checked = selected.includes(target)
              return (
                <label key={target} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...selected, target]
                        : selected.filter((value) => value !== target)
                      onChange({ checkRollTargets: next.length ? next : undefined })
                    }}
                    className="accent-primary"
                  />
                  <span className="text-muted-foreground capitalize">{target}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      {fields.includes("remoteViewing") && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Viewing range (ft.)</label>
            <input
              type="number"
              min={0}
              value={effect.remoteViewingRangeFeet ?? ""}
              onChange={(e) =>
                onChange({
                  remoteViewingRangeFeet: e.target.value ? parseInt(e.target.value, 10) : null,
                })
              }
              placeholder="e.g. 60"
              className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Duration (minutes)</label>
            <input
              type="number"
              min={1}
              value={effect.remoteViewingDurationMinutes ?? ""}
              onChange={(e) =>
                onChange({
                  remoteViewingDurationMinutes: e.target.value ? parseInt(e.target.value, 10) : null,
                })
              }
              placeholder="e.g. 10"
              className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer md:col-span-2">
            <input
              type="checkbox"
              checked={Boolean(effect.destroysTokenOnEnd)}
              onChange={(e) => onChange({ destroysTokenOnEnd: e.target.checked })}
              className="accent-primary"
            />
            <span className="text-muted-foreground">Destroy linked token when effect ends</span>
          </label>
        </div>
      )}

      {fields.includes("tempHpTrigger") && (
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">When granted</label>
          <select
            value={effect.tempHpTrigger ?? "passive"}
            onChange={(e) =>
              onChange({ tempHpTrigger: e.target.value as FeatureEffect["tempHpTrigger"] })
            }
            className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm"
          >
            <option value="passive">Passive / always active</option>
            <option value="on_kill">When you reduce an enemy to 0 HP</option>
            <option value="on_action">When you take the Action</option>
            <option value="bonus_action">When you take a Bonus Action</option>
          </select>
        </div>
      )}

      {fields.includes("bonusRiderOptions") && (
        <BonusRiderOptionsEditor effect={effect} onChange={onChange} />
      )}

      {fields.includes("classResourceKey") && (
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Class resource</label>
          {classResources.length > 0 ? (
            <select
              value={effect.classResourceKey ?? ""}
              onChange={(e) => onChange({ classResourceKey: e.target.value || null })}
              className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm"
            >
              <option value="">Select resource...</option>
              {classResources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={effect.classResourceKey ?? ""}
              onChange={(e) =>
                onChange({
                  classResourceKey: e.target.value.trim().replace(/\s+/g, "_").toLowerCase() || null,
                })
              }
              placeholder="rage"
              className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm font-mono"
            />
          )}
        </div>
      )}

      {fields.includes("classResourceChange") && (
        <ClassResourceChangeEditor effect={effect} onChange={onChange} />
      )}

      {fields.includes("casterBuffLabel") && (
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Caster state label</label>
          <input
            type="text"
            value={effect.casterBuffLabel ?? ""}
            onChange={(e) => onChange({ casterBuffLabel: e.target.value || null })}
            placeholder="e.g. Innate Sorcery, Sacred Weapon"
            className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Tags a temporary caster-mode buff (extended range, bonus damage, etc.). Full duration rules are set on the linked feature.
          </p>
        </div>
      )}

      {fields.includes("customAbilityId") && (
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Custom ability</label>
          {otherAbilities.length > 0 ? (
            <select
              value={effect.customAbilityId ?? ""}
              onChange={(e) => onChange({ customAbilityId: e.target.value || null })}
              className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm"
            >
              <option value="">Select ability...</option>
              {otherAbilities.map((ability) => (
                <option key={ability.id} value={ability.id}>
                  {ability.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={effect.customAbilityId ?? ""}
              onChange={(e) => onChange({ customAbilityId: e.target.value || null })}
              placeholder="Custom ability ID"
              className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm font-mono"
            />
          )}
        </div>
      )}
    </div>
  )
}

function ClassResourceChangeEditor({
  effect,
  onChange,
}: {
  effect: FeatureEffect
  onChange: (patch: Partial<FeatureEffect>) => void
}) {
  const mode = effect.classResourceChange ?? "reduce"

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/50 p-3">
      <label className="block text-xs font-semibold text-foreground">Resource change</label>
      <select
        value={mode}
        onChange={(e) => {
          const next = e.target.value as FeatureEffect["classResourceChange"]
          onChange({
            classResourceChange: next,
            classResourceAmount: next === "reset" ? null : effect.classResourceAmount ?? 1,
          })
        }}
        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
      >
        <option value="reduce">Reduce by amount</option>
        <option value="increase">Increase by amount</option>
        <option value="reset">Reset to full pool</option>
      </select>

      {mode !== "reset" && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            {mode === "reduce" ? "Uses spent" : "Uses restored"}
          </label>
          <input
            type="number"
            min={1}
            max={99}
            value={effect.classResourceAmount ?? 1}
            onChange={(e) =>
              onChange({
                classResourceAmount: e.target.value ? parseInt(e.target.value, 10) : 1,
              })
            }
            className="w-full max-w-[8rem] px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
        </div>
      )}

      {mode === "reset" && (
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Cap restored uses (leave blank for full pool)
            </label>
            <input
              type="number"
              min={1}
              max={99}
              value={effect.resourceRefreshCap ?? ""}
              onChange={(e) =>
                onChange({
                  resourceRefreshCap: e.target.value ? parseInt(e.target.value, 10) : null,
                })
              }
              placeholder="e.g. 2"
              className="w-full max-w-[8rem] px-3 py-2 bg-background border border-border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">When refreshed</label>
            <select
              value={
                effect.resourceRefreshOnInitiative
                  ? "initiative"
                  : effect.resourceRefreshOnRest ?? ""
              }
              onChange={(e) => {
                const value = e.target.value
                onChange({
                  resourceRefreshOnInitiative: value === "initiative",
                  resourceRefreshOnRest:
                    value === "initiative" || !value
                      ? null
                      : (value as FeatureEffect["resourceRefreshOnRest"]),
                })
              }}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            >
              <option value="">Manual / unspecified</option>
              <option value="initiative">When you roll Initiative</option>
              <option value="short_or_long_rest">After Short or Long Rest</option>
              <option value="short_rest">After Short Rest</option>
              <option value="long_rest">After Long Rest</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

function BonusRiderOptionsEditor({
  effect,
  onChange,
}: {
  effect: FeatureEffect
  onChange: (patch: Partial<FeatureEffect>) => void
}) {
  const riders = effect.bonusRiderOptions ?? []

  const updateRider = (index: number, patch: Partial<(typeof riders)[number]>) => {
    const next = [...riders]
    next[index] = { ...next[index], ...patch }
    onChange({ bonusRiderOptions: next })
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-card/50 p-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground">Rider options</label>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Max per use</span>
          <input
            type="number"
            min={1}
            max={5}
            value={effect.maxBonusRidersPerUse ?? 1}
            onChange={(e) =>
              onChange({ maxBonusRidersPerUse: parseInt(e.target.value, 10) || 1 })
            }
            className="w-12 px-1 py-0.5 bg-background border border-border rounded text-center"
          />
        </div>
      </div>
      {riders.map((rider, idx) => (
        <div key={rider.id} className="space-y-2 p-2 bg-background rounded-lg border border-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={rider.name}
              onChange={(e) => updateRider(idx, { name: e.target.value })}
              placeholder="Rider name"
              className="flex-1 px-2 py-1.5 bg-card border border-border rounded text-sm"
            />
            <input
              type="text"
              value={rider.costDice ?? ""}
              onChange={(e) => updateRider(idx, { costDice: e.target.value || null })}
              placeholder="Cost e.g. 1d6"
              className="w-24 px-2 py-1.5 bg-card border border-border rounded text-sm"
            />
            <button
              type="button"
              onClick={() =>
                onChange({ bonusRiderOptions: riders.filter((_, i) => i !== idx) })
              }
              className="p-1 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <input
            type="text"
            value={rider.description ?? ""}
            onChange={(e) => updateRider(idx, { description: e.target.value || null })}
            placeholder="Short description"
            className="w-full px-2 py-1.5 bg-card border border-border rounded text-sm"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange({
            bonusRiderOptions: [
              ...riders,
              { id: `rider_${Date.now()}`, name: "", costDice: null, description: null },
            ],
          })
        }
        className="flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <Plus className="h-3 w-3" />
        Add rider option
      </button>
    </div>
  )
}

function HealAmountEditor({
  effect,
  onChange,
  label = "Healing amount",
}: {
  effect: FeatureEffect
  onChange: (patch: Partial<FeatureEffect>) => void
  label?: string
}) {
  const mode = effect.healMode ?? "fixed"
  const dieTypes = ["d4", "d6", "d8", "d10", "d12", "d20"] as const

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/50 p-3">
      <label className="block text-xs font-semibold text-foreground">{label}</label>
      <select
        value={mode}
        onChange={(e) =>
          onChange({
            healMode: e.target.value as FeatureEffect["healMode"],
            healFixed: null,
            healDiceCount: null,
            healDieType: null,
            healFlatBonus: null,
            healLevelMultiplier: null,
            healAbility: null,
          })
        }
        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
      >
        <option value="fixed">Fixed HP</option>
        <option value="dice">Dice + optional flat bonus</option>
        <option value="character_level">Character level × multiplier</option>
        <option value="proficiency">Proficiency bonus</option>
        <option value="ability_modifier">Ability modifier</option>
      </select>

      {mode === "fixed" && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Hit points</label>
          <input
            type="number"
            min={1}
            value={effect.healFixed ?? ""}
            onChange={(e) =>
              onChange({ healFixed: e.target.value ? parseInt(e.target.value, 10) : null })
            }
            placeholder="e.g. 10"
            className="w-full max-w-[8rem] px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
        </div>
      )}

      {mode === "dice" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Dice count</label>
            <input
              type="number"
              min={1}
              max={20}
              value={effect.healDiceCount ?? ""}
              onChange={(e) =>
                onChange({ healDiceCount: e.target.value ? parseInt(e.target.value, 10) : null })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Die</label>
            <select
              value={effect.healDieType ?? ""}
              onChange={(e) =>
                onChange({ healDieType: (e.target.value || null) as FeatureEffect["healDieType"] })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            >
              <option value="">Select...</option>
              {dieTypes.map((die) => (
                <option key={die} value={die}>
                  {die}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Flat bonus</label>
            <input
              type="number"
              value={effect.healFlatBonus ?? ""}
              onChange={(e) =>
                onChange({
                  healFlatBonus: e.target.value === "" ? null : parseInt(e.target.value, 10),
                })
              }
              placeholder="0"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            />
          </div>
        </div>
      )}

      {mode === "character_level" && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Multiplier (HP = level × n)</label>
          <input
            type="number"
            min={1}
            value={effect.healLevelMultiplier ?? 1}
            onChange={(e) =>
              onChange({
                healLevelMultiplier: e.target.value ? parseInt(e.target.value, 10) : 1,
              })
            }
            className="w-full max-w-[8rem] px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
        </div>
      )}

      {mode === "proficiency" && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Proficiency multiplier</label>
          <input
            type="number"
            min={1}
            value={effect.healProficiencyMultiplier ?? 1}
            onChange={(e) =>
              onChange({
                healProficiencyMultiplier: e.target.value ? parseInt(e.target.value, 10) : 1,
              })
            }
            className="w-full max-w-[8rem] px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
        </div>
      )}

      {mode === "ability_modifier" && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Ability</label>
          <select
            value={effect.healAbility ?? ""}
            onChange={(e) =>
              onChange({
                healAbility: (e.target.value || null) as FeatureEffect["healAbility"],
              })
            }
            className="w-full max-w-xs px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            <option value="">Select ability...</option>
            {ABILITY_MODIFIER_KEYS.map((key) => (
              <option key={key} value={key}>
                {key} modifier
              </option>
            ))}
          </select>
        </div>
      )}

      {mode === "proficiency" && (
        <p className="text-xs text-muted-foreground">Healing equals the character&apos;s proficiency bonus.</p>
      )}
    </div>
  )
}

function BonusByLevelEditor({
  rows,
  onChange,
  classResources,
}: {
  rows: BonusByLevelEntry[]
  onChange: (rows: BonusByLevelEntry[]) => void
  classResources: ClassResource[]
}) {
  const dieTypes = ["d4", "d6", "d8", "d10", "d12"] as const

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-semibold text-foreground">Bonus by level</label>
        <button
          type="button"
          onClick={() => onChange([...rows, defaultBonusByLevelEntry()])}
          className="text-xs text-primary hover:underline"
        >
          + Add row
        </button>
      </div>
      <div className="space-y-3">
        {rows.map((row, idx) => (
          <div key={idx} className="rounded-lg border border-border bg-card/50 p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Level</span>
              <input
                type="number"
                min={1}
                max={20}
                value={row.level}
                onChange={(e) => {
                  const next = [...rows]
                  next[idx] = { ...row, level: parseInt(e.target.value, 10) || 1 }
                  onChange(next)
                }}
                className="w-16 px-2 py-1.5 bg-card border border-border rounded text-sm text-center"
              />
              <select
                value={row.mode}
                onChange={(e) => {
                  const mode = e.target.value as BonusByLevelEntry["mode"]
                  const next = [...rows]
                  next[idx] = {
                    ...row,
                    mode,
                    fixed: mode === "fixed" ? row.fixed ?? 2 : null,
                    dieCount: mode === "dice" ? row.dieCount ?? 1 : null,
                    dieType: mode === "dice" ? row.dieType ?? "d6" : null,
                    modifierConfig:
                      mode === "modifier"
                        ? row.modifierConfig ?? defaultRollBonusConfig("proficiency")
                        : null,
                  }
                  onChange(next)
                }}
                className="flex-1 min-w-[140px] px-2 py-1.5 bg-card border border-border rounded text-sm"
              >
                <option value="fixed">Fixed number</option>
                <option value="dice">Dice</option>
                <option value="modifier">Ability / prof. / spell attack</option>
              </select>
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, i) => i !== idx))}
                className="text-xs text-destructive px-2"
              >
                Remove
              </button>
            </div>
            {row.mode === "fixed" && (
              <input
                type="number"
                min={0}
                value={row.fixed ?? 0}
                onChange={(e) => {
                  const next = [...rows]
                  next[idx] = { ...row, fixed: parseInt(e.target.value, 10) || 0 }
                  onChange(next)
                }}
                placeholder="Bonus amount"
                className="w-full max-w-[8rem] px-2 py-1.5 bg-background border border-border rounded text-sm"
              />
            )}
            {row.mode === "dice" && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={1}
                  value={row.dieCount ?? 1}
                  onChange={(e) => {
                    const next = [...rows]
                    next[idx] = { ...row, dieCount: parseInt(e.target.value, 10) || 1 }
                    onChange(next)
                  }}
                  className="px-2 py-1.5 bg-background border border-border rounded text-sm"
                  placeholder="Count"
                />
                <select
                  value={row.dieType ?? "d6"}
                  onChange={(e) => {
                    const next = [...rows]
                    next[idx] = {
                      ...row,
                      dieType: e.target.value as BonusByLevelEntry["dieType"],
                    }
                    onChange(next)
                  }}
                  className="px-2 py-1.5 bg-background border border-border rounded text-sm"
                >
                  {dieTypes.map((die) => (
                    <option key={die} value={die}>
                      {die}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {row.mode === "modifier" && (
              <RollBonusEditor
                value={row.modifierConfig ?? defaultRollBonusConfig("proficiency")}
                onChange={(modifierConfig) => {
                  const next = [...rows]
                  next[idx] = { ...row, modifierConfig }
                  onChange(next)
                }}
                classResources={classResources}
                allowDie={false}
                label="Modifier source"
              />
            )}
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Add rows for level-scaled bonuses (e.g. Rage damage).</p>
        )}
      </div>
    </div>
  )
}

function ModifyCreatureEditor({
  effect,
  onChange,
  classResources,
}: {
  effect: FeatureEffect
  onChange: (patch: Partial<FeatureEffect>) => void
  classResources: ClassResource[]
}) {
  const mode = effect.creatureModifyMode ?? "roll"
  const restrictions = effect.creatureRestrictions ?? []

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/50 p-3">
      <label className="block text-xs font-semibold text-foreground">Target creature</label>
      <select
        value={effect.rollTarget ?? "ally"}
        onChange={(e) => onChange({ rollTarget: e.target.value as FeatureEffect["rollTarget"] })}
        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
      >
        <option value="ally">Ally</option>
        <option value="enemy">Enemy</option>
      </select>

      <label className="block text-xs font-semibold text-foreground">Modification type</label>
      <select
        value={mode}
        onChange={(e) =>
          onChange({
            creatureModifyMode: e.target.value as FeatureEffect["creatureModifyMode"],
          })
        }
        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
      >
        <option value="roll">Modify a roll (advantage / bonus / penalty)</option>
        <option value="disadvantage">Impose disadvantage</option>
        <option value="speed">Alter speed</option>
        <option value="forced_movement">Push / pull / move</option>
        <option value="restrict">Restrict actions</option>
      </select>

      {mode === "roll" && (
        <>
          {effect.rollTarget === "enemy" && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={!!effect.attackRollsCantHaveAdvantage}
                onChange={(e) =>
                  onChange({
                    attackRollsCantHaveAdvantage: e.target.checked,
                    buffMode: e.target.checked ? null : effect.buffMode ?? "bonus",
                  })
                }
                className="accent-primary"
              />
              <span className="text-muted-foreground">
                Attack rolls against you can&apos;t have Advantage (Elusive)
              </span>
            </label>
          )}
          {!effect.attackRollsCantHaveAdvantage && (
            <>
              <select
                value={effect.buffMode ?? "bonus"}
                onChange={(e) =>
                  onChange({
                    buffMode: e.target.value as FeatureEffect["buffMode"],
                    buffBonus:
                      e.target.value === "bonus"
                        ? effect.buffBonus ?? defaultRollBonusConfig("die")
                        : null,
                  })
                }
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
              >
                <option value="advantage">Grant advantage</option>
                <option value="bonus">Grant bonus or penalty on roll</option>
              </select>
              {effect.buffMode !== "advantage" && (
                <RollBonusEditor
                  value={effect.buffBonus ?? defaultRollBonusConfig("die")}
                  onChange={(buffBonus) => onChange({ buffBonus })}
                  classResources={classResources}
                  label="Roll modifier"
                />
              )}
            </>
          )}
        </>
      )}

      {mode === "speed" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={effect.creatureSpeedChange ?? "halve"}
            onChange={(e) =>
              onChange({
                creatureSpeedChange: e.target.value as FeatureEffect["creatureSpeedChange"],
              })
            }
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            <option value="halve">Halve speed</option>
            <option value="reduce">Reduce by amount (ft.)</option>
            <option value="set">Set to amount (ft.)</option>
            <option value="zero">Reduce to 0</option>
          </select>
          {(effect.creatureSpeedChange === "reduce" || effect.creatureSpeedChange === "set") && (
            <input
              type="number"
              min={0}
              value={effect.creatureSpeedAmount ?? 10}
              onChange={(e) =>
                onChange({ creatureSpeedAmount: parseInt(e.target.value, 10) || 0 })
              }
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
              placeholder="Feet"
            />
          )}
        </div>
      )}

      {mode === "forced_movement" && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Distance (ft.)</label>
          <input
            type="number"
            min={0}
            value={effect.creatureMoveDistance ?? 5}
            onChange={(e) =>
              onChange({ creatureMoveDistance: parseInt(e.target.value, 10) || 0 })
            }
            className="w-full max-w-[8rem] px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
        </div>
      )}

      {mode === "restrict" && (
        <div className="flex flex-wrap gap-2">
          {[
            ["no_opportunity_attacks", "No opportunity attacks"],
            ["no_reactions", "No reactions"],
            ["disadvantage_on_attacks", "Disadvantage on attacks"],
            ["cannot_move", "Cannot move"],
          ].map(([value, label]) => (
            <label
              key={value}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-card text-xs cursor-pointer"
            >
              <input
                type="checkbox"
                checked={restrictions.includes(value)}
                onChange={(e) => {
                  const current = effect.creatureRestrictions ?? []
                  onChange({
                    creatureRestrictions: e.target.checked
                      ? [...current, value]
                      : current.filter((entry) => entry !== value),
                  })
                }}
                className="accent-primary"
              />
              {label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function EffectOutcomeEditor({
  effect,
  onChange,
  label,
}: {
  effect: FeatureEffect
  onChange: (patch: Partial<FeatureEffect>) => void
  label: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-foreground mb-1">{label}</label>
      <div className="space-y-2">
        <div>
          <span className="text-xs text-muted-foreground">Damage types</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {DAMAGE_TYPES.map((type) => {
              const selected = effect.effectDamageTypes?.includes(type) ?? false
              return (
                <label
                  key={type}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-card text-xs cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(e) => {
                      const current = effect.effectDamageTypes ?? []
                      onChange({
                        effectDamageTypes: e.target.checked
                          ? [...current, type]
                          : current.filter((entry) => entry !== type),
                      })
                    }}
                    className="accent-primary"
                  />
                  {type}
                </label>
              )
            })}
          </div>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Conditions applied</span>
          <div className="flex flex-wrap gap-2 mt-1 max-h-32 overflow-y-auto">
            {SRD_CONDITIONS.map((condition) => {
              const selected = effect.effectConditionTypes?.includes(condition.name) ?? false
              return (
                <label
                  key={condition.name}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-card text-xs cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(e) => {
                      const current = effect.effectConditionTypes ?? []
                      onChange({
                        effectConditionTypes: e.target.checked
                          ? [...current, condition.name]
                          : current.filter((entry) => entry !== condition.name),
                      })
                    }}
                    className="accent-primary"
                  />
                  {condition.name}
                </label>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function CheckRollModifierEditor({
  effect,
  onChange,
  classResources,
}: {
  effect: FeatureEffect
  onChange: (patch: Partial<FeatureEffect>) => void
  classResources: ClassResource[]
}) {
  const rollMode = resolveCheckRollMode(effect)

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card/50 p-3">
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">Roll modifier</label>
        <select
          value={rollMode ?? ""}
          onChange={(e) =>
            onChange({
              kind: "check_roll_modifier",
              checkRollMode: (e.target.value || null) as FeatureEffect["checkRollMode"],
            })
          }
          className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm"
        >
          <option value="">Special rules only (no bonus / adv.)</option>
          <option value="bonus">Bonus</option>
          <option value="advantage">Advantage</option>
          <option value="disadvantage">Disadvantage</option>
          <option value="replace_failure">Replace failed save (auto-success)</option>
        </select>
      </div>

      {rollMode === "bonus" && (
        <RollBonusEditor
          value={
            effect.bonusConfig ??
            rollBonusFromLegacy(effect.bonusAmount) ??
            defaultRollBonusConfig("fixed")
          }
          onChange={(bonusConfig) => onChange({ bonusConfig, bonusAmount: null })}
          classResources={classResources}
        />
      )}

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">Check type</label>
        <select
          value={effect.checkCategory ?? ""}
          onChange={(e) =>
            onChange({ checkCategory: (e.target.value || null) as FeatureEffect["checkCategory"] })
          }
          className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm"
        >
          <option value="">Any check or roll</option>
          {CHECK_CATEGORIES.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {entry.label}
            </option>
          ))}
        </select>
      </div>

      {(effect.checkCategory === "ability" ||
        effect.checkCategory === "save" ||
        effect.checkCategory === "attack") && (
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            {effect.checkCategory === "save" ? "Saving throw ability" : "Ability"}
          </label>
          <select
            value={effect.checkAbility ?? ""}
            onChange={(e) => onChange({ checkAbility: e.target.value || null })}
            className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm"
          >
            <option value="">Any / not specified</option>
            {ABILITY_CHECK_OPTIONS.map((ability) => (
              <option key={ability} value={ability}>
                {ability}
              </option>
            ))}
          </select>
        </div>
      )}

      {(effect.checkCategory === "save" || effect.checkCategory === "ability") && (
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Avoid or end condition
          </label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {SRD_CONDITIONS.map((condition) => {
              const selected = effect.checkConditionTypes?.includes(condition.name) ?? false
              return (
                <label
                  key={condition.name}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-card text-xs cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(e) => {
                      const current = effect.checkConditionTypes ?? []
                      onChange({
                        checkConditionTypes: e.target.checked
                          ? [...current, condition.name]
                          : current.filter((entry) => entry !== condition.name),
                      })
                    }}
                    className="accent-primary"
                  />
                  {condition.name}
                </label>
              )
            })}
          </div>
        </div>
      )}

      <ModifierLimitationsEditor value={effect} onChange={onChange} />

      {effect.checkCategory === "skill" && (
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Skills</label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {DND_SKILLS.map((skill) => {
              const selected = effect.checkSkills?.includes(skill) ?? false
              return (
                <label
                  key={skill}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-card text-xs cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(e) => {
                      const current = effect.checkSkills ?? []
                      onChange({
                        checkSkills: e.target.checked
                          ? [...current, skill]
                          : current.filter((entry) => entry !== skill),
                      })
                    }}
                    className="accent-primary"
                  />
                  {skill}
                </label>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-2 border-t border-border pt-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={!!effect.checkRerollOnNaturalOne}
            onChange={(e) => onChange({ checkRerollOnNaturalOne: e.target.checked })}
            className="accent-primary"
          />
          <span className="text-muted-foreground">
            Reroll on natural 1 (D20 Test — must use new roll)
          </span>
        </label>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={!!effect.checkRollFloorEnabled}
            onChange={(e) => onChange({ checkRollFloorEnabled: e.target.checked })}
            className="accent-primary"
          />
          <span className="text-muted-foreground">Roll minimum — treat low rolls as a fixed value</span>
        </label>

        {effect.checkRollFloorEnabled && (
          <div className="flex flex-wrap items-center gap-2 pl-6 text-sm">
            <span className="text-muted-foreground">Rolls under</span>
            <input
              type="number"
              min={1}
              max={20}
              value={effect.checkRollFloorBelow ?? ""}
              onChange={(e) =>
                onChange({
                  checkRollFloorBelow: e.target.value ? parseInt(e.target.value, 10) : null,
                })
              }
              className="w-16 px-2 py-1.5 bg-card border border-border rounded text-sm text-center"
            />
            <span className="text-muted-foreground">count as</span>
            <input
              type="number"
              min={1}
              max={20}
              value={effect.checkRollFloorSetTo ?? ""}
              onChange={(e) =>
                onChange({
                  checkRollFloorSetTo: e.target.value ? parseInt(e.target.value, 10) : null,
                })
              }
              className="w-16 px-2 py-1.5 bg-card border border-border rounded text-sm text-center"
            />
          </div>
        )}
      </div>
    </div>
  )
}

function MovementOptionEditor({
  effect,
  onChange,
}: {
  effect: FeatureEffect
  onChange: (patch: Partial<FeatureEffect>) => void
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/50 p-3">
      <label className="block text-xs font-semibold text-foreground">Movement options</label>
      <div className="flex flex-wrap gap-4 text-sm">
        {(
          [
            ["movementDash", "Dash"],
            ["movementDisengage", "Disengage"],
            ["movementHide", "Hide"],
            ["movementMoveThroughLargerSpaces", "Move through larger creatures' spaces"],
            ["movementHideBehindLargerCreatures", "Hide behind larger creatures"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!effect[key]}
              onChange={(e) => onChange({ [key]: e.target.checked })}
              className="accent-primary"
            />
            <span className="text-muted-foreground">{label}</span>
          </label>
        ))}
      </div>
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">Additional movement</label>
        <select
          value={effect.moveDistanceMode ?? ""}
          onChange={(e) =>
            onChange({
              moveDistanceMode: (e.target.value || null) as FeatureEffect["moveDistanceMode"],
            })
          }
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
        >
          <option value="">None</option>
          <option value="speed">Move up to speed</option>
          <option value="fixed">Fixed distance (feet)</option>
          <option value="multiplier">Multiplier × speed</option>
        </select>
      </div>
      {effect.moveDistanceMode === "fixed" && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Feet</label>
          <input
            type="number"
            min={0}
            value={effect.moveDistanceFixed ?? ""}
            onChange={(e) =>
              onChange({
                moveDistanceFixed: e.target.value ? parseInt(e.target.value, 10) : null,
              })
            }
            className="w-full max-w-[8rem] px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
        </div>
      )}
      {effect.moveDistanceMode === "multiplier" && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">× speed</label>
          <input
            type="number"
            step="0.1"
            min={0}
            value={effect.moveDistanceMultiplier ?? 0.5}
            onChange={(e) =>
              onChange({
                moveDistanceMultiplier: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
            className="w-full max-w-[8rem] px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
        </div>
      )}
      <MovementTypesCheckboxes
        value={effect.movementTypes ?? []}
        onChange={(movementTypes) => onChange({ movementTypes })}
        label="Applies to movement types"
      />
    </div>
  )
}

function MovementTypesCheckboxes({
  value,
  onChange,
  label,
}: {
  value: MovementType[]
  onChange: (types: MovementType[]) => void
  label: string
}) {
  const toggle = (type: MovementType) => {
    if (value.includes(type)) {
      onChange(value.filter((entry) => entry !== type))
    } else {
      onChange([...value, type])
    }
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-foreground mb-1">{label}</label>
      <p className="text-xs text-muted-foreground mb-2">Leave all unchecked to apply to any movement type.</p>
      <div className="flex flex-wrap gap-3 text-sm">
        {MOVEMENT_TYPE_OPTIONS.map(({ value: type, label: typeLabel }) => (
          <label key={type} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value.includes(type as MovementType)}
              onChange={() => toggle(type as MovementType)}
              className="accent-primary"
            />
            <span className="text-muted-foreground">{typeLabel}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function CastSpellEditor({
  effect,
  onChange,
}: {
  effect: FeatureEffect
  onChange: (patch: Partial<FeatureEffect>) => void
}) {
  const spellClasses = effect.castSpellListClasses ?? []

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/50 p-3">
      <label className="block text-xs font-semibold text-foreground">Cast spell requirements</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Spell level</label>
          <select
            value={effect.castSpellLevel ?? 0}
            onChange={(e) => onChange({ castSpellLevel: parseInt(e.target.value, 10) })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            <option value={0}>Cantrip</option>
            {Array.from({ length: 9 }, (_, i) => i + 1).map((level) => (
              <option key={level} value={level}>
                Level {level}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Casting time</label>
          <select
            value={effect.castSpellCastingTime ?? "action"}
            onChange={(e) =>
              onChange({
                castSpellCastingTime: e.target.value as FeatureEffect["castSpellCastingTime"],
              })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            {CAST_SPELL_CASTING_TIME_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Fixed spell name (optional)</label>
        <input
          type="text"
          value={effect.castSpellName ?? ""}
          onChange={(e) => onChange({ castSpellName: e.target.value || null })}
          placeholder="Leave empty for player choice within constraints"
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Spell school filter (optional)</label>
        <input
          type="text"
          value={effect.castSpellSchool ?? ""}
          onChange={(e) => onChange({ castSpellSchool: e.target.value || null })}
          placeholder="e.g. Evocation"
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Spell list classes (comma-separated)</label>
        <input
          type="text"
          value={spellClasses.join(", ")}
          onChange={(e) =>
            onChange({
              castSpellListClasses: e.target.value
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean),
            })
          }
          placeholder="Cleric, Warlock"
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
        />
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!effect.castSpellWithoutSlot}
            onChange={(e) => onChange({ castSpellWithoutSlot: e.target.checked })}
            className="accent-primary"
          />
          <span className="text-muted-foreground">Without expending a spell slot</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!effect.castSpellRitual}
            onChange={(e) => onChange({ castSpellRitual: e.target.checked })}
            className="accent-primary"
          />
          <span className="text-muted-foreground">May cast as ritual</span>
        </label>
      </div>
    </div>
  )
}

function WeaponAttackEditor({
  effect,
  onChange,
}: {
  effect: FeatureEffect
  onChange: (patch: Partial<FeatureEffect>) => void
}) {
  const dieTypes = ["d4", "d6", "d8", "d10", "d12"] as const
  const profile = effect.attackProfile ?? effect.attackStyle ?? "melee"
  const isWeaponProfile = profile === "melee" || profile === "ranged"
  const isForceSave = profile === "force_save"

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/50 p-3">
      <label className="block text-xs font-semibold text-foreground">Attack profile</label>
      <select
        value={profile}
        onChange={(e) => {
          const next = e.target.value as NonNullable<FeatureEffect["attackProfile"]>
          onChange({
            attackProfile: next,
            attackStyle: next === "melee" || next === "ranged" ? next : effect.attackStyle,
            saveDCBase: next === "force_save" ? effect.saveDCBase ?? 8 : effect.saveDCBase,
            saveDCConfig:
              next === "force_save"
                ? effect.saveDCConfig ?? defaultRollBonusConfig("proficiency")
                : effect.saveDCConfig,
          })
        }}
        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
      >
        <option value="melee">Melee attack</option>
        <option value="ranged">Ranged attack</option>
        <option value="emanation">Emanation (area around you)</option>
        <option value="force_save">Force saving throw</option>
      </select>

      {isWeaponProfile && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Ability modifier</label>
            <select
              value={effect.attackAbility ?? "STR"}
              onChange={(e) =>
                onChange({
                  attackAbility: (e.target.value || null) as FeatureEffect["attackAbility"],
                })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            >
              {ABILITY_MODIFIER_KEYS.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Dice count</label>
            <input
              type="number"
              min={1}
              max={20}
              value={effect.attackDiceCount ?? 1}
              onChange={(e) =>
                onChange({ attackDiceCount: e.target.value ? parseInt(e.target.value, 10) : 1 })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Die type</label>
            <select
              value={effect.attackDieType ?? "d8"}
              onChange={(e) =>
                onChange({
                  attackDieType: (e.target.value || null) as FeatureEffect["attackDieType"],
                })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            >
              {dieTypes.map((die) => (
                <option key={die} value={die}>
                  {die}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Flat damage bonus</label>
            <input
              type="number"
              value={effect.attackDamageBonus ?? ""}
              onChange={(e) =>
                onChange({
                  attackDamageBonus: e.target.value === "" ? null : parseInt(e.target.value, 10),
                })
              }
              placeholder="0"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            />
          </div>
        </div>
      )}

      {profile === "emanation" && (
        <>
          <p className="text-xs text-muted-foreground">
            Emanation affects creatures in an area around you (configure damage below).
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Dice count</label>
              <input
                type="number"
                min={1}
                value={effect.attackDiceCount ?? 1}
                onChange={(e) =>
                  onChange({ attackDiceCount: parseInt(e.target.value, 10) || 1 })
                }
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Die type</label>
              <select
                value={effect.attackDieType ?? "d8"}
                onChange={(e) =>
                  onChange({
                    attackDieType: (e.target.value || null) as FeatureEffect["attackDieType"],
                  })
                }
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
              >
                {dieTypes.map((die) => (
                  <option key={die} value={die}>
                    {die}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}

      {isForceSave && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Saving throw ability</label>
            <select
              value={effect.saveAbility ?? ""}
              onChange={(e) => onChange({ saveAbility: e.target.value || null })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            >
              <option value="">Select ability...</option>
              {ABILITY_CHECK_OPTIONS.map((ability) => (
                <option key={ability} value={ability}>
                  {ability}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">DC base</label>
              <input
                type="number"
                min={0}
                value={effect.saveDCBase ?? 8}
                onChange={(e) =>
                  onChange({ saveDCBase: parseInt(e.target.value, 10) || 8 })
                }
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <RollBonusEditor
                value={effect.saveDCConfig ?? defaultRollBonusConfig("proficiency")}
                onChange={(saveDCConfig) => onChange({ saveDCConfig })}
                allowDie={false}
                label="DC modifier (+ base)"
              />
            </div>
          </div>
        </div>
      )}

      {(profile === "emanation" || isForceSave) && (
        <EffectOutcomeEditor
          effect={effect}
          onChange={onChange}
          label={isForceSave ? "On failed save" : "Effect on targets"}
        />
      )}
    </div>
  )
}
