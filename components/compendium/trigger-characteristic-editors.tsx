"use client"

import {
  ABILITY_SCORE_KEYS,
  type AbilityScoreKey,
  SAVING_THROW_NAMES,
  SAVING_THROW_TARGET_SCOPES,
  type SavingThrowTriggerCharacteristic,
  type OnHitTriggerCharacteristic,
  type FailedRollTriggerCharacteristic,
  type OnCastSpellTriggerCharacteristic,
  type SpellHealingModifierCharacteristic,
  type ResourceAbilityMenuCharacteristic,
  type ExtraTurnCharacteristic,
  type ResourceAbilityMenuOption,
  type D20TestReactionCharacteristic,
  type DamageHalvingReactionCharacteristic,
  type HealingDicePoolCharacteristic,
  type OnCreatureDeathTriggerCharacteristic,
  type TurnStartTriggerCharacteristic,
  type RollTriggerKind,
  type TelepathyCharacteristic,
} from "@/lib/compendium/characteristic-modifiers"
import { CREATURE_TYPES } from "@/lib/compendium/constants"
import { NestedModifierEffectEditor } from "@/components/compendium/nested-modifier-effect-editor"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import type { ClassResource } from "@/lib/types"

function TagInput({
  values,
  onChange,
  suggestions,
  placeholder,
}: {
  values: string[]
  onChange: (values: string[]) => void
  suggestions?: readonly string[]
  placeholder?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <span key={value} className="inline-flex items-center gap-1 px-2 py-1 bg-secondary/20 border border-border rounded text-xs">
            {value}
            <button type="button" onClick={() => onChange(values.filter((v) => v !== value))}>×</button>
          </span>
        ))}
      </div>
      <input
        type="text"
        onKeyDown={(e) => {
          const input = e.currentTarget
          if (e.key === "Enter" && input.value.trim()) {
            e.preventDefault()
            const next = input.value.trim()
            if (!values.includes(next)) onChange([...values, next])
            input.value = ""
          }
        }}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
      />
    </div>
  )
}

export function SavingThrowTriggerEditor({
  mod,
  onChange,
  modifierCatalog,
  classResources = [],
}: {
  mod: SavingThrowTriggerCharacteristic
  onChange: (next: SavingThrowTriggerCharacteristic) => void
  modifierCatalog: ModifierCatalogEntry[]
  classResources?: ClassResource[]
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Trigger when</label>
          <select
            value={mod.triggerOn}
            onChange={(e) =>
              onChange({ ...mod, triggerOn: e.target.value as SavingThrowTriggerCharacteristic["triggerOn"] })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            <option value="make">Making a saving throw</option>
            <option value="fail">Failing a saving throw</option>
            <option value="ally_fails">Ally fails a saving throw</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Saving throw</label>
          <select
            value={mod.saveAbility ?? ""}
            onChange={(e) => onChange({ ...mod, saveAbility: e.target.value || null })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            <option value="">Any ability</option>
            {SAVING_THROW_NAMES.map((ability) => (
              <option key={ability} value={ability}>{ability}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Applies to</label>
          <select
            value={mod.targetScope}
            onChange={(e) =>
              onChange({ ...mod, targetScope: e.target.value as SavingThrowTriggerCharacteristic["targetScope"] })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            {SAVING_THROW_TARGET_SCOPES.map((scope) => (
              <option key={scope.value} value={scope.value}>{scope.label}</option>
            ))}
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={!!mod.useReaction}
          onChange={(e) => onChange({ ...mod, useReaction: e.target.checked })}
          className="accent-primary"
        />
        <span className="text-muted-foreground">Uses your Reaction</span>
      </label>
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">Replace failed roll with (optional)</label>
        <input
          type="number"
          min={1}
          max={30}
          value={mod.replaceFailedRollWith ?? ""}
          onChange={(e) =>
            onChange({
              ...mod,
              replaceFailedRollWith: e.target.value ? parseInt(e.target.value, 10) : null,
            })
          }
          placeholder="e.g. 20 for Bend Reality"
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
        />
      </div>
      <NestedModifierEffectEditor
        value={mod.effect}
        onChange={(effect) => onChange({ ...mod, effect })}
        modifierCatalog={modifierCatalog}
        classResources={classResources}
      />
    </div>
  )
}

export function OnHitTriggerEditor({
  mod,
  onChange,
  modifierCatalog,
  classResources = [],
}: {
  mod: OnHitTriggerCharacteristic
  onChange: (next: OnHitTriggerCharacteristic) => void
  modifierCatalog: ModifierCatalogEntry[]
  classResources?: ClassResource[]
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Trigger on</label>
          <select
            value={mod.triggerOn ?? "hit"}
            onChange={(e) =>
              onChange({
                ...mod,
                triggerOn: e.target.value as OnHitTriggerCharacteristic["triggerOn"],
              })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            <option value="hit">Hit</option>
            <option value="crit">Critical hit</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer md:mt-6">
          <input
            type="checkbox"
            checked={mod.oncePerTurn !== false}
            onChange={(e) => onChange({ ...mod, oncePerTurn: e.target.checked })}
            className="accent-primary"
          />
          <span className="text-muted-foreground">Once per turn</span>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(mod.maximizeWeaponDamage)}
          onChange={(e) => onChange({ ...mod, maximizeWeaponDamage: e.target.checked })}
          className="accent-primary"
        />
        <span className="text-muted-foreground">Maximize weapon damage dice</span>
      </label>
      {mod.maximizeWeaponDamage ? (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Available from level (blank = always)
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={mod.maximizeWeaponDamageAtLevel ?? ""}
            onChange={(e) =>
              onChange({
                ...mod,
                maximizeWeaponDamageAtLevel: e.target.value
                  ? parseInt(e.target.value, 10)
                  : null,
              })
            }
            className="w-24 px-3 py-2 bg-background border border-border rounded-lg text-sm"
            placeholder="15"
          />
        </div>
      ) : null}
      <input
        type="text"
        value={mod.appliesTo ?? ""}
        onChange={(e) => onChange({ ...mod, appliesTo: e.target.value || null })}
        placeholder="Applies to (e.g. weapon attacks)"
        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Exclude creature types</label>
          <TagInput
            values={mod.excludeCreatureTypes ?? []}
            onChange={(excludeCreatureTypes) => onChange({ ...mod, excludeCreatureTypes })}
            suggestions={[...CREATURE_TYPES]}
            placeholder="Construct, Undead..."
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Include only creature types</label>
          <TagInput
            values={mod.includeCreatureTypes ?? []}
            onChange={(includeCreatureTypes) => onChange({ ...mod, includeCreatureTypes })}
            suggestions={[...CREATURE_TYPES]}
            placeholder="Optional filter..."
          />
        </div>
      </div>
      <NestedModifierEffectEditor
        value={mod.effect}
        onChange={(effect) => onChange({ ...mod, effect })}
        modifierCatalog={modifierCatalog}
        classResources={classResources}
      />
    </div>
  )
}

export function FailedRollTriggerEditor({
  mod,
  onChange,
  modifierCatalog,
  classResources = [],
}: {
  mod: FailedRollTriggerCharacteristic
  onChange: (next: FailedRollTriggerCharacteristic) => void
  modifierCatalog: ModifierCatalogEntry[]
  classResources?: ClassResource[]
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Trigger when</label>
          <select
            value={mod.triggerOn ?? "fail"}
            onChange={(e) =>
              onChange({ ...mod, triggerOn: e.target.value as FailedRollTriggerCharacteristic["triggerOn"] })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            <option value="fail">Roll fails</option>
            <option value="success">Roll succeeds</option>
          </select>
        </div>
        <select
          value={mod.rollKind}
          onChange={(e) =>
            onChange({ ...mod, rollKind: e.target.value as FailedRollTriggerCharacteristic["rollKind"] })
          }
          className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
        >
          <option value="ability">Ability check</option>
          <option value="skill">Skill check</option>
          <option value="attack">Attack roll</option>
          <option value="save">Saving throw</option>
        </select>
        <select
          value={mod.targetScope}
          onChange={(e) =>
            onChange({ ...mod, targetScope: e.target.value as FailedRollTriggerCharacteristic["targetScope"] })
          }
          className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
        >
          {SAVING_THROW_TARGET_SCOPES.map((scope) => (
            <option key={scope.value} value={scope.value}>{scope.label}</option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={!!mod.useReaction}
          onChange={(e) => onChange({ ...mod, useReaction: e.target.checked })}
          className="accent-primary"
        />
        <span className="text-muted-foreground">Uses your Reaction</span>
      </label>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={!!mod.refundResourceOnStillFailed}
          onChange={(e) => onChange({ ...mod, refundResourceOnStillFailed: e.target.checked })}
          className="accent-primary"
        />
        <span className="text-muted-foreground">Refund spent resource if roll still fails (Peerless Skill)</span>
      </label>
      <NestedModifierEffectEditor
        value={mod.effect}
        onChange={(effect) => onChange({ ...mod, effect })}
        modifierCatalog={modifierCatalog}
        classResources={classResources}
      />
    </div>
  )
}

export function OnCastSpellTriggerEditor({
  mod,
  onChange,
  modifierCatalog,
  classResources = [],
}: {
  mod: OnCastSpellTriggerCharacteristic
  onChange: (next: OnCastSpellTriggerCharacteristic) => void
  modifierCatalog: ModifierCatalogEntry[]
  classResources?: ClassResource[]
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        When the character casts a spell matching the filters below, apply the nested effect (e.g. bonus damage on Evocation spells).
      </p>
      <TagInput
        values={mod.spellTags ?? []}
        onChange={(spellTags) => onChange({ ...mod, spellTags })}
        placeholder="Spell tags (smite, healing, hunter's mark…)"
      />
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Spell school (optional)</label>
        <input
          type="text"
          value={mod.spellSchool ?? ""}
          onChange={(e) => onChange({ ...mod, spellSchool: e.target.value || null })}
          placeholder="Evocation, Enchantment…"
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
        />
      </div>
      <NestedModifierEffectEditor
        value={mod.effect}
        onChange={(effect) => onChange({ ...mod, effect })}
        modifierCatalog={modifierCatalog}
        classResources={classResources}
      />
    </div>
  )
}

export function SpellHealingModifierEditor({
  mod,
  onChange,
}: {
  mod: SpellHealingModifierCharacteristic
  onChange: (next: SpellHealingModifierCharacteristic) => void
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Bonus HP (flat)</label>
          <input
            type="number"
            min={0}
            value={mod.bonusFlat ?? 0}
            onChange={(e) => onChange({ ...mod, bonusFlat: parseInt(e.target.value, 10) || 0 })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Bonus HP per spell level</label>
          <input
            type="number"
            min={0}
            value={mod.bonusPerSpellLevel ?? 0}
            onChange={(e) => onChange({ ...mod, bonusPerSpellLevel: parseInt(e.target.value, 10) || 0 })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={!!mod.maximizeHealingDice}
          onChange={(e) => onChange({ ...mod, maximizeHealingDice: e.target.checked })}
          className="accent-primary"
        />
        <span className="text-muted-foreground">Maximize healing dice</span>
      </label>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={!!mod.maximizeOnlyAtZeroHp}
          onChange={(e) => onChange({ ...mod, maximizeOnlyAtZeroHp: e.target.checked })}
          className="accent-primary"
        />
        <span className="text-muted-foreground">Maximize only when target is at 0 HP (Return to Life)</span>
      </label>
    </div>
  )
}

export function ResourceAbilityMenuEditor({
  mod,
  onChange,
  modifierCatalog,
  classResources = [],
}: {
  mod: ResourceAbilityMenuCharacteristic
  onChange: (next: ResourceAbilityMenuCharacteristic) => void
  modifierCatalog: ModifierCatalogEntry[]
  classResources?: ClassResource[]
}) {
  const updateOption = (index: number, patch: Partial<ResourceAbilityMenuOption>) => {
    const options = [...(mod.options ?? [])]
    options[index] = { ...options[index], ...patch }
    onChange({ ...mod, options })
  }

  const rollKinds = mod.appliesOnRollKinds ?? []
  const abilities = mod.appliesOnAbilities ?? []

  const toggleRollKind = (kind: RollTriggerKind) => {
    const next = rollKinds.includes(kind) ? rollKinds.filter((k) => k !== kind) : [...rollKinds, kind]
    onChange({ ...mod, appliesOnRollKinds: next })
  }

  const toggleAbility = (ability: string) => {
    const next = abilities.includes(ability)
      ? abilities.filter((a) => a !== ability)
      : [...abilities, ability]
    onChange({ ...mod, appliesOnAbilities: next })
  }

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={mod.resourceKey}
        onChange={(e) => onChange({ ...mod, resourceKey: e.target.value })}
        placeholder="Resource key"
        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
      />
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(mod.waiveResourceCost)}
          onChange={(e) => onChange({ ...mod, waiveResourceCost: e.target.checked })}
          className="accent-primary"
        />
        <span className="text-muted-foreground">Free use (do not expend resource)</span>
      </label>
      <div className="rounded-lg border border-border bg-card/50 p-3 space-y-2">
        <span className="text-xs font-semibold text-foreground">Free use applies on</span>
        <div className="flex flex-wrap gap-2">
          {(["ability", "save", "skill", "attack"] as const).map((kind) => (
            <label key={kind} className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={rollKinds.includes(kind)}
                onChange={() => toggleRollKind(kind)}
                className="accent-primary"
              />
              <span className="text-muted-foreground capitalize">{kind}</span>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"].map(
            (ability) => (
              <label key={ability} className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={abilities.includes(ability)}
                  onChange={() => toggleAbility(ability)}
                  className="accent-primary"
                />
                <span className="text-muted-foreground">{ability}</span>
              </label>
            ),
          )}
        </div>
      </div>
      {(mod.options ?? []).map((option, index) => (
        <div key={index} className="rounded-lg border border-border p-3 space-y-2">
          <input
            type="text"
            value={option.name}
            onChange={(e) => updateOption(index, { name: e.target.value })}
            placeholder="Ability name"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                Resource cost
              </label>
              <input
                type="number"
                min={0}
                value={option.resourceCost ?? ""}
                onChange={(e) =>
                  updateOption(index, {
                    resourceCost: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  })
                }
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                Hit Dice cost
              </label>
              <input
                type="number"
                min={0}
                value={option.hitDiceCost ?? ""}
                onChange={(e) =>
                  updateOption(index, {
                    hitDiceCost: e.target.value ? parseInt(e.target.value, 10) : null,
                  })
                }
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
              />
            </div>
          </div>
          <NestedModifierEffectEditor
            value={option.effect}
            onChange={(effect) => updateOption(index, { effect })}
            modifierCatalog={modifierCatalog}
            classResources={classResources}
            label="Ability effect"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange({ ...mod, options: [...(mod.options ?? []), { name: "", resourceCost: 1 }] })}
        className="text-sm text-primary hover:underline"
      >
        + Add ability option
      </button>
    </div>
  )
}

export function ExtraTurnEditor({
  mod,
  onChange,
}: {
  mod: ExtraTurnCharacteristic
  onChange: (next: ExtraTurnCharacteristic) => void
}) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={mod.firstRoundOnly !== false}
          onChange={(e) => onChange({ ...mod, firstRoundOnly: e.target.checked })}
          className="accent-primary"
        />
        <span className="text-muted-foreground">First round only</span>
      </label>
      <input
        type="number"
        min={1}
        value={mod.turnCount ?? 1}
        onChange={(e) => onChange({ ...mod, turnCount: parseInt(e.target.value, 10) || 1 })}
        className="w-16 px-2 py-1 bg-background border border-border rounded text-sm"
      />
    </div>
  )
}

export function D20TestReactionEditor({
  mod,
  onChange,
  modifierCatalog,
  classResources = [],
}: {
  mod: D20TestReactionCharacteristic
  onChange: (next: D20TestReactionCharacteristic) => void
  modifierCatalog: ModifierCatalogEntry[]
  classResources?: ClassResource[]
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select
          value={mod.modifierMode}
          onChange={(e) =>
            onChange({ ...mod, modifierMode: e.target.value as D20TestReactionCharacteristic["modifierMode"] })
          }
          className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
        >
          <option value="add">Add to roll</option>
          <option value="subtract">Subtract from roll</option>
        </select>
        <select
          value={mod.targetScope}
          onChange={(e) =>
            onChange({ ...mod, targetScope: e.target.value as D20TestReactionCharacteristic["targetScope"] })
          }
          className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
        >
          {SAVING_THROW_TARGET_SCOPES.map((scope) => (
            <option key={scope.value} value={scope.value}>{scope.label}</option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          value={mod.rangeFeet ?? ""}
          onChange={(e) => onChange({ ...mod, rangeFeet: e.target.value ? parseInt(e.target.value, 10) : null })}
          placeholder="Range (ft.)"
          className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={!!mod.useReaction}
          onChange={(e) => onChange({ ...mod, useReaction: e.target.checked })}
          className="accent-primary"
        />
        <span className="text-muted-foreground">Uses your Reaction</span>
      </label>
      <NestedModifierEffectEditor
        value={mod.effect}
        onChange={(effect) => onChange({ ...mod, effect })}
        modifierCatalog={modifierCatalog}
        classResources={classResources}
      />
    </div>
  )
}

export function DamageHalvingReactionEditor({
  mod,
  onChange,
}: {
  mod: DamageHalvingReactionCharacteristic
  onChange: (next: DamageHalvingReactionCharacteristic) => void
}) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={!!mod.cancelCritRiders}
          onChange={(e) => onChange({ ...mod, cancelCritRiders: e.target.checked })}
          className="accent-primary"
        />
        <span className="text-muted-foreground">Cancel critical hit rider effects</span>
      </label>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={!!mod.requiresPriorDisadvantage}
          onChange={(e) => onChange({ ...mod, requiresPriorDisadvantage: e.target.checked })}
          className="accent-primary"
        />
        <span className="text-muted-foreground">Only vs. creature you imposed disadvantage on</span>
      </label>
    </div>
  )
}

export function HealingDicePoolEditor({
  mod,
  onChange,
}: {
  mod: HealingDicePoolCharacteristic
  onChange: (next: HealingDicePoolCharacteristic) => void
}) {
  const maxAbility = mod.maxDicePerUse?.ability ?? ""
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Die type</label>
          <select
            value={mod.dieType}
            onChange={(e) => onChange({ ...mod, dieType: e.target.value as HealingDicePoolCharacteristic["dieType"] })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            {["d4", "d6", "d8", "d10", "d12", "d20"].map((die) => (
              <option key={die} value={die}>{die}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Pool size (dice)</label>
          <input
            type="number"
            min={0}
            value={mod.poolSize ?? ""}
            onChange={(e) => onChange({ ...mod, poolSize: e.target.value ? parseInt(e.target.value, 10) : null })}
            placeholder="e.g. 6"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Activation</label>
          <select
            value={mod.activation}
            onChange={(e) =>
              onChange({ ...mod, activation: e.target.value as HealingDicePoolCharacteristic["activation"] })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            <option value="action">Action</option>
            <option value="bonus_action">Bonus Action</option>
            <option value="magic_action">Magic Action</option>
          </select>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Controls whether this pool appears in the character sheet Actions area.
          </p>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Max dice per use</label>
          <select
            value={maxAbility}
            onChange={(e) =>
              onChange({
                ...mod,
                maxDicePerUse: e.target.value
                  ? { type: "ability_modifier", ability: e.target.value as AbilityScoreKey }
                  : null,
              })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            <option value="">No per-use cap</option>
            {ABILITY_SCORE_KEYS.map((ability) => (
              <option key={ability} value={ability}>
                {ability.charAt(0).toUpperCase() + ability.slice(1)} modifier
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Dice per use</label>
          <select
            value={mod.dicePerUseSource ?? ""}
            onChange={(e) =>
              onChange({
                ...mod,
                dicePerUseSource: e.target.value === "proficiency" ? "proficiency" : null,
              })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            <option value="">From pool / max dice setting</option>
            <option value="proficiency">Proficiency Bonus dice</option>
          </select>
        </div>
      </div>
    </div>
  )
}

export function TurnStartTriggerEditor({
  mod,
  onChange,
  modifierCatalog,
  classResources = [],
}: {
  mod: TurnStartTriggerCharacteristic
  onChange: (next: TurnStartTriggerCharacteristic) => void
  modifierCatalog: ModifierCatalogEntry[]
  classResources?: ClassResource[]
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">HP below fraction of max</label>
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={mod.hpBelowFraction ?? ""}
            onChange={(e) =>
              onChange({
                ...mod,
                hpBelowFraction: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
            placeholder="0.5 = half HP"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Minimum HP (at least)</label>
          <input
            type="number"
            min={0}
            value={mod.hpAtLeast ?? ""}
            onChange={(e) =>
              onChange({
                ...mod,
                hpAtLeast: e.target.value ? parseInt(e.target.value, 10) : null,
              })
            }
            placeholder="1"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
        </div>
      </div>
      <NestedModifierEffectEditor
        value={mod.effect}
        onChange={(effect) => onChange({ ...mod, effect })}
        modifierCatalog={modifierCatalog}
        classResources={classResources}
        label="Turn start effect"
      />
    </div>
  )
}

export function OnCreatureDeathTriggerEditor({
  mod,
  onChange,
  modifierCatalog,
  classResources = [],
}: {
  mod: OnCreatureDeathTriggerCharacteristic
  onChange: (next: OnCreatureDeathTriggerCharacteristic) => void
  modifierCatalog: ModifierCatalogEntry[]
  classResources?: ClassResource[]
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <select
          value={mod.creatureFilter}
          onChange={(e) =>
            onChange({ ...mod, creatureFilter: e.target.value as OnCreatureDeathTriggerCharacteristic["creatureFilter"] })
          }
          className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
        >
          <option value="enemy">Enemy dies</option>
          <option value="ally">Ally dies</option>
          <option value="any">Any creature dies</option>
        </select>
        <input
          type="number"
          min={0}
          value={mod.rangeFeet}
          onChange={(e) => onChange({ ...mod, rangeFeet: parseInt(e.target.value, 10) || 0 })}
          placeholder="Range (ft.)"
          className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
        />
      </div>
      <NestedModifierEffectEditor
        value={mod.effect}
        onChange={(effect) => onChange({ ...mod, effect })}
        modifierCatalog={modifierCatalog}
        classResources={classResources}
      />
    </div>
  )
}

export function TelepathyEditor({
  mod,
  onChange,
}: {
  mod: TelepathyCharacteristic
  onChange: (next: TelepathyCharacteristic) => void
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Range (ft.)</label>
          <input
            type="number"
            min={0}
            value={mod.rangeFeet}
            onChange={(e) => onChange({ ...mod, rangeFeet: parseInt(e.target.value, 10) || 0 })}
            placeholder="Range (ft.)"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Range (feet per level)</label>
          <input
            type="number"
            min={0}
            value={mod.rangeFeetPerLevel ?? ""}
            onChange={(e) =>
              onChange({
                ...mod,
                rangeFeetPerLevel: e.target.value ? parseInt(e.target.value, 10) : null,
              })
            }
            placeholder="e.g. 10"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Range (miles)</label>
          <input
            type="number"
            min={0}
            value={mod.rangeMiles ?? ""}
            onChange={(e) =>
              onChange({
                ...mod,
                rangeMiles: e.target.value ? parseInt(e.target.value, 10) : null,
              })
            }
            placeholder="Optional"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Max words per message</label>
        <input
          type="number"
          min={1}
          value={mod.maxMessageWords ?? ""}
          onChange={(e) =>
            onChange({
              ...mod,
              maxMessageWords: e.target.value ? parseInt(e.target.value, 10) : null,
            })
          }
          placeholder="Optional"
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={mod.canInitiate !== false}
          onChange={(e) => onChange({ ...mod, canInitiate: e.target.checked })}
          className="accent-primary"
        />
        <span className="text-muted-foreground">Can initiate telepathic contact</span>
      </label>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(mod.requiresActiveToken)}
          onChange={(e) => onChange({ ...mod, requiresActiveToken: e.target.checked })}
          className="accent-primary"
        />
        <span className="text-muted-foreground">Requires an active token or link</span>
      </label>
    </div>
  )
}
