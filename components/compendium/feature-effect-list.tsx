"use client"

import { Plus, Trash2 } from "lucide-react"
import {
  ABILITY_CHECK_OPTIONS,
  ACTION_EFFECT_GROUPS,
  ACTION_EFFECT_OPTIONS,
  CHECK_CATEGORIES,
  effectFieldsForKind,
} from "@/lib/compendium/class-feature-metadata"
import { DAMAGE_TYPES } from "@/lib/compendium/damage-types"
import { ABILITY_MODIFIER_KEYS } from "@/lib/compendium/characteristic-modifiers"
import { normalizeFeatureEffects } from "@/lib/compendium/normalize-feature-activation"
import { DND_SKILLS } from "@/lib/compendium/constants"
import type { ClassResource, FeatureActivation, FeatureEffect } from "@/lib/types"

function newEffectId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `fx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

type FeatureEffectListProps = {
  activation: FeatureActivation
  classResources: ClassResource[]
  onChange: (activation: FeatureActivation) => void
}

export function FeatureEffectList({ activation, classResources, onChange }: FeatureEffectListProps) {
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

  const changeKind = (id: string, kind: string) => {
    const defaults: Partial<FeatureEffect> = {
      kind,
      mitigation: null,
      damageTypes: [],
      reductionAmount: null,
      bonusByLevel: [],
      bonusDice: null,
      checkCategory: null,
      checkAbility: null,
      checkSkills: [],
      bonusAmount: null,
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
    }
    if (kind === "class_resource") {
      defaults.classResourceChange = "reduce"
      defaults.classResourceAmount = 1
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
          onKindChange={(kind) => changeKind(effect.id, kind)}
          onChange={(patch) => updateEffect(effect.id, patch)}
          onRemove={() => removeEffect(effect.id)}
        />
      ))}
    </div>
  )
}

function EffectRow({
  effect,
  classResources,
  onKindChange,
  onChange,
  onRemove,
}: {
  effect: FeatureEffect
  classResources: ClassResource[]
  onKindChange: (kind: string) => void
  onChange: (patch: Partial<FeatureEffect>) => void
  onRemove: () => void
}) {
  const fields = effectFieldsForKind(effect.kind)
  const option = ACTION_EFFECT_OPTIONS.find((entry) => entry.value === effect.kind)

  return (
    <div className="rounded-lg border border-border bg-background p-3 space-y-3">
      <div className="flex gap-2">
        <select
          value={effect.kind}
          onChange={(e) => onKindChange(e.target.value)}
          className="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
        >
          <option value="">Select effect...</option>
          {ACTION_EFFECT_GROUPS.map((group) => (
            <optgroup key={group.id} label={group.label}>
              {ACTION_EFFECT_OPTIONS.filter((entry) => entry.group === group.id).map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
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

      {fields.includes("damageTypes") && (
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

      {fields.includes("bonusByLevel") && (
        <BonusByLevelEditor
          rows={effect.bonusByLevel ?? []}
          onChange={(bonusByLevel) => onChange({ bonusByLevel })}
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
            <label className="block text-xs font-semibold text-foreground mb-1">Ability</label>
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
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Bonus amount</label>
          <input
            type="number"
            value={effect.bonusAmount ?? ""}
            onChange={(e) =>
              onChange({ bonusAmount: e.target.value ? parseInt(e.target.value, 10) : null })
            }
            className="w-full max-w-[8rem] px-3 py-2 bg-card border border-border rounded-lg text-sm"
          />
        </div>
      )}

      {fields.includes("advantageFlags") && (
        <div className="flex flex-wrap gap-4 text-sm">
          {effect.kind === "check_advantage" && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!effect.grantAdvantage}
                onChange={(e) => onChange({ grantAdvantage: e.target.checked })}
                className="accent-primary"
              />
              <span className="text-muted-foreground">Grant advantage</span>
            </label>
          )}
          {effect.kind === "check_disadvantage" && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!effect.grantDisadvantage}
                onChange={(e) => onChange({ grantDisadvantage: e.target.checked })}
                className="accent-primary"
              />
              <span className="text-muted-foreground">Grant disadvantage</span>
            </label>
          )}
        </div>
      )}

      {fields.includes("healAmount") && (
        <HealAmountEditor effect={effect} onChange={onChange} />
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
    </div>
  )
}

function HealAmountEditor({
  effect,
  onChange,
}: {
  effect: FeatureEffect
  onChange: (patch: Partial<FeatureEffect>) => void
}) {
  const mode = effect.healMode ?? "fixed"
  const dieTypes = ["d4", "d6", "d8", "d10", "d12", "d20"] as const

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/50 p-3">
      <label className="block text-xs font-semibold text-foreground">Healing amount</label>
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
}: {
  rows: { level: number; bonus: string }[]
  onChange: (rows: { level: number; bonus: string }[]) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-semibold text-foreground">Bonus by level</label>
        <button
          type="button"
          onClick={() => onChange([...rows, { level: 1, bonus: "+2" }])}
          className="text-xs text-primary hover:underline"
        >
          + Add row
        </button>
      </div>
      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div key={idx} className="flex items-center gap-2">
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
            <span className="text-xs text-muted-foreground">Bonus</span>
            <input
              type="text"
              value={row.bonus}
              onChange={(e) => {
                const next = [...rows]
                next[idx] = { ...row, bonus: e.target.value }
                onChange(next)
              }}
              placeholder="+2 or 2d6"
              className="flex-1 px-2 py-1.5 bg-card border border-border rounded text-sm"
            />
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, i) => i !== idx))}
              className="text-xs text-destructive px-2"
            >
              Remove
            </button>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Add rows for level-scaled bonuses (e.g. Rage damage).</p>
        )}
      </div>
    </div>
  )
}
