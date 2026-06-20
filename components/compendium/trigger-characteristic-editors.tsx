"use client"

import {
  SAVING_THROW_NAMES,
  SAVING_THROW_TARGET_SCOPES,
  type SavingThrowTriggerCharacteristic,
  type OnHitTriggerCharacteristic,
  type FailedRollTriggerCharacteristic,
  type OnCastSpellTriggerCharacteristic,
  type SpellHealingModifierCharacteristic,
  type ResourceAbilityMenuCharacteristic,
  type ExtraTurnCharacteristic,
  type FeatureOptionPickerCharacteristic,
  type FeatureOptionPickerOption,
  type ResourceAbilityMenuOption,
} from "@/lib/compendium/characteristic-modifiers"
import { NestedModifierEffectEditor } from "@/components/compendium/nested-modifier-effect-editor"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import type { ClassResource } from "@/lib/types"

function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[]
  onChange: (values: string[]) => void
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
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={mod.oncePerTurn !== false}
          onChange={(e) => onChange({ ...mod, oncePerTurn: e.target.checked })}
          className="accent-primary"
        />
        <span className="text-muted-foreground">Once per turn</span>
      </label>
      <input
        type="text"
        value={mod.appliesTo ?? ""}
        onChange={(e) => onChange({ ...mod, appliesTo: e.target.value || null })}
        placeholder="Applies to (e.g. Flurry of Blows)"
        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
      />
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={mod.resourceKey}
        onChange={(e) => onChange({ ...mod, resourceKey: e.target.value })}
        placeholder="Resource key"
        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
      />
      {(mod.options ?? []).map((option, index) => (
        <div key={index} className="rounded-lg border border-border p-3 space-y-2">
          <input
            type="text"
            value={option.name}
            onChange={(e) => updateOption(index, { name: e.target.value })}
            placeholder="Ability name"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
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

export function FeatureOptionPickerEditor({
  mod,
  onChange,
  modifierCatalog,
  classResources = [],
}: {
  mod: FeatureOptionPickerCharacteristic
  onChange: (next: FeatureOptionPickerCharacteristic) => void
  modifierCatalog: ModifierCatalogEntry[]
  classResources?: ClassResource[]
}) {
  const updateOption = (index: number, patch: Partial<FeatureOptionPickerOption>) => {
    const options = [...(mod.options ?? [])]
    options[index] = { ...options[index], ...patch }
    onChange({ ...mod, options })
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={mod.category}
        onChange={(e) => onChange({ ...mod, category: e.target.value })}
        placeholder="Option category"
        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
      />
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Choose</span>
        <input
          type="number"
          min={1}
          value={mod.choiceCount}
          onChange={(e) => onChange({ ...mod, choiceCount: Math.max(1, parseInt(e.target.value, 10) || 1) })}
          className="w-16 px-2 py-1 bg-background border border-border rounded text-center text-sm"
        />
        <span className="text-sm text-muted-foreground">option(s)</span>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={!!mod.swappableOnRest}
          onChange={(e) => onChange({ ...mod, swappableOnRest: e.target.checked })}
          className="accent-primary"
        />
        <span className="text-muted-foreground">Can swap on rest</span>
      </label>
      {(mod.options ?? []).map((option, index) => (
        <div key={index} className="rounded-lg border border-border p-3 space-y-2">
          <input
            type="text"
            value={option.name}
            onChange={(e) => updateOption(index, { name: e.target.value })}
            placeholder="Option name"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
          <NestedModifierEffectEditor
            value={option.effect}
            onChange={(effect) => updateOption(index, { effect })}
            modifierCatalog={modifierCatalog}
            classResources={classResources}
            label="Option effect"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange({ ...mod, options: [...(mod.options ?? []), { name: "" }] })}
        className="text-sm text-primary hover:underline"
      >
        + Add fixed option
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
