"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import {
  defaultCritByLevelEntry,
  type BonusByLevelEntry,
} from "@/lib/compendium/bonus-by-level"
import { SRD_CONDITIONS } from "@/lib/srd/condition-descriptions"
import { UsesConfigEditor } from "@/components/uses-config-editor"
import {
  ABILITY_SCORE_KEYS,
  ABILITY_MODIFIER_KEYS,
  ATTACK_ROLL_TARGETS,
  CHARACTERISTIC_MODIFIER_TYPE_OPTIONS,
  DAMAGE_ROLL_TARGETS,
  DAMAGE_TYPES,
  SKILL_NAMES,
  SAVING_THROW_NAMES,
  SAVING_THROW_TARGET_SCOPES,
  SPEED_TYPES,
  UNARMED_STRIKE_DICE,
  VISION_TYPES,
  SPECIAL_ATTACK_DIE_TYPES,
  SPECIAL_ATTACK_PROFILES,
  SPECIAL_ATTACK_AREA_SHAPES,
  createCharacteristicModifier,
  getSkillEntries,
  type CharacteristicModifier,
  type CharacteristicModifierType,
  type ListCharacteristic,
  type RollModifierEntry,
  type SkillEntry,
  type SkillsCharacteristic,
  type SpellsKnownCharacteristic,
  type SpellsKnownChoiceGrant,
  type WeaponProficienciesCharacteristic,
  type SpecialAttackCharacteristic,
  type RestReplacementCharacteristic,
  type MagicalSleepImmunityCharacteristic,
  type CreatureSizeCharacteristic,
  type MovementEffectsCharacteristic,
  type AuraCharacteristic,
  type BonusDamageRidersCharacteristic,
  type BonusDamageRiderEntry,
  type SpeedCharacteristic,
  type SavingThrowTriggerCharacteristic,
  type OnHitTriggerCharacteristic,
  type TurnStartTriggerCharacteristic,
  type FailedRollTriggerCharacteristic,
  type OnCastSpellTriggerCharacteristic,
  type SpellHealingModifierCharacteristic,
  type ResourceAbilityMenuCharacteristic,
  type ExtraTurnCharacteristic,
  type ResourceAbilityMenuOption,
} from "@/lib/compendium/characteristic-modifiers"
import { NestedModifierEffectEditor } from "@/components/compendium/nested-modifier-effect-editor"
import { SpecialAttackFieldsEditor } from "@/components/compendium/special-attack-fields-editor"
import {
  SavingThrowTriggerEditor,
  OnHitTriggerEditor,
  FailedRollTriggerEditor,
  D20TestReactionEditor,
  DamageHalvingReactionEditor,
  HealingDicePoolEditor,
  OnCreatureDeathTriggerEditor,
  TurnStartTriggerEditor,
  TelepathyEditor,
  OnCastSpellTriggerEditor,
  SpellHealingModifierEditor,
  ResourceAbilityMenuEditor,
  ExtraTurnEditor,
} from "@/components/compendium/trigger-characteristic-editors"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import type { ClassResource } from "@/lib/types"
import { FEAT_PICK_CATEGORIES } from "@/lib/compendium/class-feature-metadata"
import { formatSpellOptionLabel, type SpellOption } from "@/lib/compendium/spell-options"
import { SRD_TOOL_NAMES } from "@/lib/compendium/srd-tool-names"
import {
  SRD_LANGUAGES,
  SRD_STANDARD_LANGUAGES,
  SRD_RARE_LANGUAGES,
} from "@/lib/compendium/srd-languages"
import { STANDARD_SPELL_CLASSES } from "@/lib/import/class-spell-lists"
import { SRD_WEAPON_NAMES } from "@/lib/compendium/weapon-proficiency-options"
import { WEAPON_PROPERTIES } from "@/lib/compendium/equipment-properties"
import { RollBonusEditor } from "@/components/compendium/roll-bonus-editor"
import {
  defaultRollBonusConfig,
  formatRollBonusSummary,
} from "@/lib/compendium/roll-bonus-config"
import { SPECIES_SIZES } from "@/lib/compendium/constants"

type CharacteristicModifiersEditorProps = {
  value: CharacteristicModifier[]
  onChange: (value: CharacteristicModifier[]) => void
  otherAbilities?: { id: string; name: string }[]
  spellOptions?: SpellOption[]
  /** Common modifiers catalog — required for saving throw trigger effect picker. */
  modifierCatalog?: ModifierCatalogEntry[]
  classResources?: ClassResource[]
  /** Hide add control and header — used when configuring a catalog-linked instance inline. */
  configureOnly?: boolean
  /** Catalog admin: preview how choices appear elsewhere — distinct styling, no page header. */
  templatePreview?: boolean
}

function updateModifier(
  mods: CharacteristicModifier[],
  id: string,
  next: CharacteristicModifier,
): CharacteristicModifier[] {
  return mods.map((mod) => (mod.id === id ? next : mod))
}

function TagInput({
  values,
  onChange,
  suggestions,
  placeholder,
}: {
  values: string[]
  onChange: (values: string[]) => void
  suggestions?: readonly string[]
  placeholder: string
}) {
  const [draft, setDraft] = useState("")

  const addValue = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed || values.includes(trimmed)) return
    onChange([...values, trimmed])
    setDraft("")
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-lg text-sm"
          >
            {value}
            <button
              type="button"
              onClick={() => onChange(values.filter((entry) => entry !== value))}
              className="hover:text-destructive"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        {suggestions ? (
          <select
            value=""
            onChange={(e) => addValue(e.target.value)}
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            <option value="">{placeholder}</option>
            {suggestions.filter((s) => !values.includes(s)).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addValue(draft)
              }
            }}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
        )}
        {!suggestions && (
          <button
            type="button"
            onClick={() => addValue(draft)}
            className="px-3 py-2 bg-muted rounded-lg text-sm font-medium"
          >
            Add
          </button>
        )}
      </div>
    </div>
  )
}

function WeaponProficienciesEditor({
  mod,
  onChange,
}: {
  mod: WeaponProficienciesCharacteristic
  onChange: (next: WeaponProficienciesCharacteristic) => void
}) {
  const usedWeapons = new Set(mod.values)

  const addWeapon = (name: string) => {
    if (!name || usedWeapons.has(name)) return
    onChange({ ...mod, values: [...mod.values, name] })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4">
        <label className="inline-flex items-center gap-1.5 text-sm cursor-pointer">
          <input
            type="radio"
            name={`weapon-prof-mode-${mod.id}`}
            checked={mod.mode === "martial_weapons"}
            onChange={() => onChange({ ...mod, mode: "martial_weapons", values: [] })}
          />
          All martial weapons
        </label>
        <label className="inline-flex items-center gap-1.5 text-sm cursor-pointer">
          <input
            type="radio"
            name={`weapon-prof-mode-${mod.id}`}
            checked={mod.mode === "specific"}
            onChange={() => onChange({ ...mod, mode: "specific" })}
          />
          Specific weapons
        </label>
      </div>
      {mod.mode === "specific" && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {mod.values.map((weapon) => (
              <span
                key={weapon}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-lg text-sm"
              >
                {weapon}
                <button
                  type="button"
                  onClick={() =>
                    onChange({ ...mod, values: mod.values.filter((entry) => entry !== weapon) })
                  }
                  className="hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <select
            value=""
            onChange={(e) => addWeapon(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            <option value="">Add weapon...</option>
            {SRD_WEAPON_NAMES.filter((weapon) => !usedWeapons.has(weapon)).map((weapon) => (
              <option key={weapon} value={weapon}>
                {weapon}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

const ARMOR_PROFICIENCY_OPTIONS = [
  { value: "Light armor", label: "Light" },
  { value: "Medium armor", label: "Medium" },
  { value: "Heavy armor", label: "Heavy" },
  { value: "Shields", label: "Shield" },
] as const

const ARMOR_PROFICIENCY_VALUE_SET = new Set<string>(
  ARMOR_PROFICIENCY_OPTIONS.map((option) => option.value),
)

function ArmorProficienciesEditor({
  values,
  onChange,
}: {
  values: string[]
  onChange: (values: string[]) => void
}) {
  const standard = values.filter((value) => ARMOR_PROFICIENCY_VALUE_SET.has(value))
  const special = values.filter((value) => !ARMOR_PROFICIENCY_VALUE_SET.has(value))
  const [specialEnabled, setSpecialEnabled] = useState(special.length > 0)
  const [specialDraft, setSpecialDraft] = useState("")

  const toggleStandard = (value: string) => {
    const next = standard.includes(value)
      ? values.filter((entry) => entry !== value)
      : [...values, value]
    onChange(next)
  }

  const addSpecial = () => {
    const trimmed = specialDraft.trim()
    if (!trimmed || values.includes(trimmed)) {
      setSpecialDraft("")
      return
    }
    onChange([...values, trimmed])
    setSpecialDraft("")
  }

  const removeSpecial = (value: string) => {
    onChange(values.filter((entry) => entry !== value))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4">
        {ARMOR_PROFICIENCY_OPTIONS.map((option) => (
          <label
            key={option.value}
            className="inline-flex items-center gap-1.5 text-sm cursor-pointer"
          >
            <input
              type="checkbox"
              checked={standard.includes(option.value)}
              onChange={() => toggleStandard(option.value)}
              className="accent-primary"
            />
            {option.label}
          </label>
        ))}
        <label className="inline-flex items-center gap-1.5 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={specialEnabled}
            onChange={(e) => {
              setSpecialEnabled(e.target.checked)
              if (!e.target.checked && special.length > 0) {
                onChange(values.filter((entry) => ARMOR_PROFICIENCY_VALUE_SET.has(entry)))
              }
            }}
            className="accent-primary"
          />
          Special
        </label>
      </div>

      {specialEnabled && (
        <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-2.5">
          {special.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {special.map((value) => (
                <span
                  key={value}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-lg text-sm"
                >
                  {value}
                  <button
                    type="button"
                    onClick={() => removeSpecial(value)}
                    className="hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={specialDraft}
              onChange={(e) => setSpecialDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addSpecial()
                }
              }}
              placeholder="e.g. Mithral plate, Living armor..."
              className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
            />
            <button
              type="button"
              onClick={addSpecial}
              className="flex items-center gap-1 px-2 py-2 text-xs bg-primary/10 text-primary rounded-lg"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CritByLevelEditor({
  rows,
  onChange,
}: {
  rows: BonusByLevelEntry[]
  onChange: (rows: BonusByLevelEntry[]) => void
}) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground">Critical hit range by level</label>
        <button
          type="button"
          onClick={() => onChange([...rows, defaultCritByLevelEntry(rows.length ? rows[rows.length - 1].level + 4 : 5)])}
          className="text-xs text-primary hover:underline"
        >
          + Add tier
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Lowest d20 that counts as a critical hit (e.g. 19 = crit on 19–20).
      </p>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No level tiers — uses default minimum above.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">At level</span>
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
                className="w-16 px-2 py-1.5 bg-background border border-border rounded-lg text-sm text-center"
              />
              <span className="text-xs text-muted-foreground">crit on d20 ≥</span>
              <input
                type="number"
                min={2}
                max={20}
                value={row.fixed ?? ""}
                onChange={(e) => {
                  const next = [...rows]
                  next[idx] = {
                    ...row,
                    mode: "fixed",
                    fixed: e.target.value ? parseInt(e.target.value, 10) : null,
                  }
                  onChange(next)
                }}
                className="w-16 px-2 py-1.5 bg-background border border-border rounded-lg text-sm text-center"
              />
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, i) => i !== idx))}
                className="p-1 text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RollModifiersEditor({
  entries,
  targets,
  onChange,
  mode = "damage",
}: {
  entries: RollModifierEntry[]
  targets: readonly { value: string; label: string }[]
  onChange: (entries: RollModifierEntry[]) => void
  mode?: "attack" | "damage"
}) {
  const updateEntry = (idx: number, next: RollModifierEntry) => {
    const copy = [...entries]
    copy[idx] = next
    onChange(copy)
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, idx) => (
        <div
          key={idx}
          className="space-y-2 p-2 bg-background rounded-lg border border-border"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">
              {mode === "attack" ? "Bonus to hit" : "Bonus damage"}
            </span>
            <input
              type="number"
              value={entry.bonus}
              onChange={(e) =>
                updateEntry(idx, { ...entry, bonus: parseInt(e.target.value, 10) || 0 })
              }
              className="w-20 px-2 py-1.5 bg-card border border-border rounded-lg text-sm text-center"
              placeholder="+N"
            />
            <select
              value={entry.target}
              onChange={(e) => updateEntry(idx, { ...entry, target: e.target.value })}
              className="flex-1 min-w-[160px] px-2 py-1.5 bg-card border border-border rounded-lg text-sm"
            >
              {targets.map((target) => (
                <option key={target.value} value={target.value}>
                  {target.label}
                </option>
              ))}
            </select>
            {entry.target === "custom" && (
              <input
                type="text"
                value={entry.customTarget ?? ""}
                onChange={(e) => updateEntry(idx, { ...entry, customTarget: e.target.value })}
                className="flex-1 min-w-[120px] px-2 py-1.5 bg-card border border-border rounded-lg text-sm"
                placeholder="Custom target"
              />
            )}
            <button
              type="button"
              onClick={() => onChange(entries.filter((_, i) => i !== idx))}
              className="p-1 text-muted-foreground hover:text-destructive"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {mode === "attack" ? (
            <div className="flex flex-wrap items-center gap-3 pl-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Crit on d20 ≥</span>
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={entry.criticalHitMinimum ?? ""}
                  onChange={(e) =>
                    updateEntry(idx, {
                      ...entry,
                      criticalHitMinimum: e.target.value ? parseInt(e.target.value, 10) : null,
                    })
                  }
                  className="w-20 px-2 py-1.5 bg-card border border-border rounded-lg text-sm text-center"
                  placeholder="20"
                />
                <span className="text-xs text-muted-foreground">(blank = 20 only)</span>
              </div>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(entry.ignoreHalfCover)}
                  onChange={(e) =>
                    updateEntry(idx, { ...entry, ignoreHalfCover: e.target.checked })
                  }
                  className="accent-primary"
                />
                <span className="text-muted-foreground">Ignore half cover</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(entry.treatThreeQuartersCoverAsHalf)}
                  onChange={(e) =>
                    updateEntry(idx, {
                      ...entry,
                      treatThreeQuartersCoverAsHalf: e.target.checked,
                    })
                  }
                  className="accent-primary"
                />
                <span className="text-muted-foreground">3/4 cover counts as half</span>
              </label>
            </div>
          ) : null}
          {mode === "attack" && (entry.criticalHitMinimumByLevel?.length ?? 0) > 0 ? (
            <CritByLevelEditor
              rows={entry.criticalHitMinimumByLevel ?? []}
              onChange={(rows) => updateEntry(idx, { ...entry, criticalHitMinimumByLevel: rows })}
            />
          ) : null}
          {mode === "attack" ? (
            <button
              type="button"
              onClick={() =>
                updateEntry(idx, {
                  ...entry,
                  criticalHitMinimumByLevel: [
                    ...(entry.criticalHitMinimumByLevel ?? []),
                    defaultCritByLevelEntry(
                      (entry.criticalHitMinimumByLevel?.at(-1)?.level ?? 1) + 4,
                      (entry.criticalHitMinimum ?? 19) - 1,
                    ),
                  ],
                })
              }
              className="text-xs text-primary hover:underline"
            >
              + Add crit range by level (this attack type)
            </button>
          ) : null}
          {mode === "damage" ? (
            <div className="space-y-2 border-t border-border/60 pt-2">
              <label className="flex items-center gap-2 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={Boolean(entry.grantAbilityModifierWhenMissing)}
                  onChange={(e) =>
                    updateEntry(idx, { ...entry, grantAbilityModifierWhenMissing: e.target.checked })
                  }
                />
                Add ability modifier to damage when weapon attack would not normally include it
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Extra dice when modifier already added</span>
                <input
                  type="text"
                  value={entry.bonusDiceWhenModifierIncluded ?? ""}
                  onChange={(e) =>
                    updateEntry(idx, {
                      ...entry,
                      bonusDiceWhenModifierIncluded: e.target.value || null,
                    })
                  }
                  className="w-24 px-2 py-1.5 bg-card border border-border rounded-lg text-sm"
                  placeholder="1d8"
                />
                <label className="flex items-center gap-1.5 text-xs text-foreground">
                  <input
                    type="checkbox"
                    checked={Boolean(entry.bonusDiceUsesWeaponDamageType)}
                    onChange={(e) =>
                      updateEntry(idx, {
                        ...entry,
                        bonusDiceUsesWeaponDamageType: e.target.checked,
                      })
                    }
                  />
                  Use weapon damage type
                </label>
              </div>
            </div>
          ) : null}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...entries, { bonus: 1, target: targets[0]?.value ?? "all" }])}
        className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-lg"
      >
        <Plus className="w-3 h-3" />
        Add modifier entry
      </button>
    </div>
  )
}

function SharedChoiceGroupEditor({
  groupId,
  groupCount,
  onChange,
  description,
}: {
  groupId?: string
  groupCount?: number
  onChange: (next: { sharedChoiceGroup?: string; sharedChoiceCount?: number; choiceCount?: number | null }) => void
  description: string
}) {
  const enabled = !!(groupId && (groupCount ?? 0) > 0)
  return (
    <div className="space-y-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            if (e.target.checked) {
              onChange({
                sharedChoiceGroup: groupId || "shared_picks",
                sharedChoiceCount: groupCount || 1,
                choiceCount: 0,
              })
            } else {
              onChange({ sharedChoiceGroup: undefined, sharedChoiceCount: undefined })
            }
          }}
          className="accent-primary"
        />
        <span className="text-muted-foreground">{description}</span>
      </label>
      {enabled && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Group id</span>
          <input
            type="text"
            value={groupId ?? ""}
            onChange={(e) =>
              onChange({
                sharedChoiceGroup: e.target.value.trim() || "shared_picks",
                sharedChoiceCount: groupCount ?? 1,
                choiceCount: 0,
              })
            }
            placeholder="skilled_proficiencies"
            className="flex-1 min-w-[160px] px-2 py-1 bg-background border border-border rounded text-sm"
          />
          <span className="text-muted-foreground">Total picks</span>
          <input
            type="number"
            min={1}
            max={18}
            value={groupCount ?? 1}
            onChange={(e) =>
              onChange({
                sharedChoiceGroup: groupId || "shared_picks",
                sharedChoiceCount: Math.max(1, parseInt(e.target.value, 10) || 1),
                choiceCount: 0,
              })
            }
            className="w-16 px-2 py-1 bg-background border border-border rounded text-center"
          />
        </div>
      )}
    </div>
  )
}

function SkillsEditor({
  mod,
  onChange,
}: {
  mod: SkillsCharacteristic
  onChange: (next: SkillsCharacteristic) => void
}) {
  const entries = mod.entries ?? []
  const usedSkills = new Set(entries.map((entry) => entry.skill))
  const choiceEnabled = (mod.choiceCount ?? 0) > 0
  const sharedEnabled = !!(mod.sharedChoiceGroup && (mod.sharedChoiceCount ?? 0) > 0)

  const addSkill = (skill: string) => {
    if (!skill || usedSkills.has(skill)) return
    onChange({ ...mod, entries: [...entries, { skill, expertise: false }] })
  }

  const updateEntry = (idx: number, next: SkillEntry) => {
    const copy = [...entries]
    copy[idx] = next
    onChange({ ...mod, entries: copy })
  }

  return (
    <div className="space-y-3">
      <SharedChoiceGroupEditor
        groupId={mod.sharedChoiceGroup}
        groupCount={mod.sharedChoiceCount}
        description="Share a pick pool with another modifier (e.g. mix skills and tools)"
        onChange={(patch) => onChange({ ...mod, ...patch })}
      />
      {!sharedEnabled && (
        <>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={!!mod.grantExpertise}
              onChange={(e) => onChange({ ...mod, grantExpertise: e.target.checked })}
              className="accent-primary"
            />
            <span className="text-muted-foreground">Grant Expertise (not just proficiency)</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={!!mod.allowAnySkill}
              onChange={(e) => onChange({ ...mod, allowAnySkill: e.target.checked })}
              className="accent-primary"
            />
            <span className="text-muted-foreground">Allow &quot;any skill&quot; (player picks at build time)</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={choiceEnabled}
              onChange={(e) =>
                onChange({
                  ...mod,
                  choiceCount: e.target.checked ? Math.max(1, mod.choiceCount ?? 1) : null,
                })
              }
              className="accent-primary"
            />
            <span className="text-muted-foreground">Choose number among listed skills</span>
          </label>
          {choiceEnabled && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Pick</span>
              <input
                type="number"
                min={1}
                max={18}
                value={mod.choiceCount ?? 1}
                onChange={(e) =>
                  onChange({ ...mod, choiceCount: Math.max(1, parseInt(e.target.value, 10) || 1) })
                }
                className="w-16 px-2 py-1 bg-background border border-border rounded text-center"
              />
              <span className="text-muted-foreground">skill(s)</span>
            </div>
          )}
        </>
      )}
      {!sharedEnabled && (
        <>
          {entries.map((entry, idx) => (
        <div
          key={`${entry.skill}-${idx}`}
          className="flex flex-wrap items-center gap-2 p-2 bg-background rounded-lg border border-border"
        >
          <span className="text-sm font-medium flex-1 min-w-[120px]">{entry.skill}</span>
          <label className="inline-flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              name={`skill-level-${idx}`}
              checked={!entry.expertise}
              onChange={() => updateEntry(idx, { ...entry, expertise: false })}
            />
            Proficiency
          </label>
          <label className="inline-flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              name={`skill-level-${idx}`}
              checked={entry.expertise}
              onChange={() => updateEntry(idx, { ...entry, expertise: true })}
            />
            Expertise
          </label>
          <button
            type="button"
            onClick={() => onChange({ ...mod, entries: entries.filter((_, i) => i !== idx) })}
            className="p-1 text-muted-foreground hover:text-destructive"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <select
        value=""
        onChange={(e) => addSkill(e.target.value)}
        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
      >
        <option value="">Add skill to pool...</option>
        {SKILL_NAMES.filter((skill) => !usedSkills.has(skill)).map((skill) => (
          <option key={skill} value={skill}>
            {skill}
          </option>
        ))}
      </select>
        </>
      )}
    </div>
  )
}

function ToolProficienciesEditor({
  mod,
  onChange,
}: {
  mod: ListCharacteristic
  onChange: (next: ListCharacteristic) => void
}) {
  const choiceEnabled = (mod.choiceCount ?? 0) > 0
  const sharedEnabled = !!(mod.sharedChoiceGroup && (mod.sharedChoiceCount ?? 0) > 0)

  return (
    <div className="space-y-3">
      <SharedChoiceGroupEditor
        groupId={mod.sharedChoiceGroup}
        groupCount={mod.sharedChoiceCount}
        description="Share a pick pool with another modifier (use the same group id on both)"
        onChange={(patch) => onChange({ ...mod, ...patch })}
      />
      {!sharedEnabled && (
      <>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={choiceEnabled}
          onChange={(e) =>
            onChange({
              ...mod,
              choiceCount: e.target.checked ? Math.max(1, mod.choiceCount ?? 1) : null,
            })
          }
          className="accent-primary"
        />
        <span className="text-muted-foreground">Player picks tools at build time</span>
      </label>
      {choiceEnabled && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Pick</span>
          <input
            type="number"
            min={1}
            max={18}
            value={mod.choiceCount ?? 1}
            onChange={(e) =>
              onChange({ ...mod, choiceCount: Math.max(1, parseInt(e.target.value, 10) || 1) })
            }
            className="w-16 px-2 py-1 bg-background border border-border rounded text-center"
          />
          <span className="text-muted-foreground">tool(s) from the standard list</span>
        </div>
      )}
      {!choiceEnabled && (
        <TagInput
          values={mod.values}
          onChange={(values) => onChange({ ...mod, values })}
          suggestions={[...SRD_TOOL_NAMES]}
          placeholder="Add tool proficiencies..."
        />
      )}
      </>
      )}
    </div>
  )
}

function LanguagesEditor({
  mod,
  onChange,
}: {
  mod: ListCharacteristic
  onChange: (next: ListCharacteristic) => void
}) {
  const choiceEnabled = (mod.choiceCount ?? 0) > 0
  const pool = mod.choicePool ?? "standard"

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Languages always known
        </label>
        <TagInput
          values={mod.values}
          onChange={(values) => onChange({ ...mod, values })}
          suggestions={SRD_LANGUAGES}
          placeholder="Add a language (e.g. Common)..."
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Pick from the SRD Standard &amp; Rare Languages tables, or type a custom language.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={choiceEnabled}
          onChange={(e) =>
            onChange({
              ...mod,
              choiceCount: e.target.checked ? Math.max(1, mod.choiceCount ?? 1) : null,
            })
          }
          className="accent-primary"
        />
        <span className="text-muted-foreground">Player also chooses languages at build time</span>
      </label>

      {choiceEnabled && (
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Choose</span>
            <input
              type="number"
              min={1}
              max={10}
              value={mod.choiceCount ?? 1}
              onChange={(e) =>
                onChange({ ...mod, choiceCount: Math.max(1, parseInt(e.target.value, 10) || 1) })
              }
              className="w-16 px-2 py-1 bg-background border border-border rounded text-center"
            />
            <span className="text-muted-foreground">language(s) from the</span>
            <select
              value={pool}
              onChange={(e) =>
                onChange({
                  ...mod,
                  choicePool: e.target.value as "standard" | "standard_and_rare",
                })
              }
              className="px-2 py-1 bg-background border border-border rounded"
            >
              <option value="standard">Standard Languages table</option>
              <option value="standard_and_rare">Standard &amp; Rare Languages</option>
            </select>
          </div>
          <p className="text-xs text-muted-foreground">
            Standard: {SRD_STANDARD_LANGUAGES.join(", ")}.
            {pool === "standard_and_rare" && ` Rare: ${SRD_RARE_LANGUAGES.join(", ")}.`} The player
            can also enter a custom language. Example: grant Common above, then let the player choose
            2 more from the Standard table (Dwarf).
          </p>
        </div>
      )}
    </div>
  )
}

function SpellsKnownEditor({
  mod,
  onChange,
  spellOptions,
}: {
  mod: SpellsKnownCharacteristic
  onChange: (next: SpellsKnownCharacteristic) => void
  spellOptions: SpellOption[]
}) {
  const choiceGrants = mod.choiceGrants ?? []
  const classOptions = mod.spellListClassOptions ?? []

  const updateGrant = (index: number, next: SpellsKnownChoiceGrant) => {
    const grants = [...choiceGrants]
    grants[index] = next
    onChange({ ...mod, choiceGrants: grants })
  }

  const toggleClassOption = (className: string) => {
    const next = classOptions.includes(className)
      ? classOptions.filter((entry) => entry !== className)
      : [...classOptions, className]
    onChange({ ...mod, spellListClassOptions: next })
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Grant fixed spells and/or let the player choose spells from a class list at build time.
      </p>
      <div>
        <label className="block text-sm font-semibold mb-1">Spellcasting ability</label>
        <select
          value={mod.castingAbility ?? ""}
          onChange={(e) =>
            onChange({
              ...mod,
              castingAbility: e.target.value
                ? (e.target.value as typeof mod.castingAbility)
                : undefined,
            })
          }
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
        >
          <option value="">Use class default</option>
          {ABILITY_SCORE_KEYS.map((ability) => (
            <option key={ability} value={ability}>
              {ability.charAt(0).toUpperCase() + ability.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/20">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={!!mod.alwaysPrepared}
            onChange={(e) => onChange({ ...mod, alwaysPrepared: e.target.checked })}
            className="accent-primary"
          />
          <span className="text-muted-foreground">Always prepared (domain / oath / patron spells)</span>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={!!mod.playerPicksSpellList}
            onChange={(e) => onChange({ ...mod, playerPicksSpellList: e.target.checked })}
            className="accent-primary"
          />
          <span className="text-muted-foreground">Player picks a class spell list first</span>
        </label>
        {mod.playerPicksSpellList && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {STANDARD_SPELL_CLASSES.map((className) => (
              <label key={className} className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={classOptions.includes(className)}
                  onChange={() => toggleClassOption(className)}
                  className="accent-primary"
                />
                {className}
              </label>
            ))}
          </div>
        )}
        {choiceGrants.map((grant, idx) => (
          <div
            key={idx}
            className="flex flex-wrap items-center gap-2 p-2 bg-background rounded-lg border border-border"
          >
            <span className="text-sm text-muted-foreground">Choose</span>
            <input
              type="number"
              min={1}
              max={20}
              value={grant.count}
              onChange={(e) =>
                updateGrant(idx, {
                  ...grant,
                  count: Math.max(1, parseInt(e.target.value, 10) || 1),
                })
              }
              className="w-14 px-2 py-1 bg-card border border-border rounded text-center text-sm"
            />
            <span className="text-sm text-muted-foreground">spell(s) at level</span>
            <input
              type="number"
              min={0}
              max={9}
              value={grant.level}
              onChange={(e) =>
                updateGrant(idx, {
                  ...grant,
                  level: Math.max(0, parseInt(e.target.value, 10) || 0),
                })
              }
              className="w-14 px-2 py-1 bg-card border border-border rounded text-center text-sm"
            />
            <label className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap">
              <input
                type="checkbox"
                checked={grant.alwaysPrepared ?? !!mod.alwaysPrepared}
                onChange={(e) => updateGrant(idx, { ...grant, alwaysPrepared: e.target.checked })}
              />
              Always prepared
            </label>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...mod,
                  choiceGrants: choiceGrants.filter((_, grantIndex) => grantIndex !== idx),
                })
              }
              className="p-1 text-muted-foreground hover:text-destructive"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            onChange({
              ...mod,
              choiceGrants: [...choiceGrants, { level: 0, count: 1 }],
            })
          }
          className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-lg"
        >
          <Plus className="w-3 h-3" />
          Add player spell choice
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">Fixed spells</p>
        {mod.spells.map((entry, idx) => (
          <div
            key={idx}
            className="flex flex-wrap items-center gap-2 p-2 bg-background rounded-lg border border-border"
          >
            <select
              value={entry.spellId}
              onChange={(e) => {
                const spells = [...mod.spells]
                spells[idx] = { ...entry, spellId: e.target.value }
                onChange({ ...mod, spells })
              }}
              className="flex-1 min-w-[160px] px-2 py-1.5 bg-card border border-border rounded-lg text-sm"
            >
              <option value="">Select spell...</option>
              {spellOptions.map((spell) => (
                <option key={spell.id} value={spell.id}>
                  {formatSpellOptionLabel(spell)}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap">
              <input
                type="checkbox"
                checked={entry.alwaysPrepared ?? entry.prepared !== false}
                onChange={(e) => {
                  const spells = [...mod.spells]
                  spells[idx] = { ...entry, alwaysPrepared: e.target.checked, prepared: true }
                  onChange({ ...mod, spells })
                }}
              />
              Always prepared
            </label>
            <label className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap">
              <input
                type="checkbox"
                checked={entry.prepared !== false}
                onChange={(e) => {
                  const spells = [...mod.spells]
                  spells[idx] = { ...entry, prepared: e.target.checked }
                  onChange({ ...mod, spells })
                }}
              />
              Prepared
            </label>
            <button
              type="button"
              onClick={() => onChange({ ...mod, spells: mod.spells.filter((_, i) => i !== idx) })}
              className="p-1 text-muted-foreground hover:text-destructive"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ ...mod, spells: [...mod.spells, { spellId: "", prepared: true }] })}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-lg"
        >
          <Plus className="w-3 h-3" />
          Add fixed spell
        </button>
      </div>
    </div>
  )
}

function ModifierFields({
  mod,
  onChange,
  otherAbilities,
  spellOptions,
  modifierCatalog = [],
  classResources = [],
}: {
  mod: CharacteristicModifier
  onChange: (next: CharacteristicModifier) => void
  otherAbilities: { id: string; name: string }[]
  spellOptions: SpellOption[]
  modifierCatalog?: ModifierCatalogEntry[]
  classResources?: ClassResource[]
}) {
  switch (mod.type) {
    case "ability_scores":
      return (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name={`ability-scores-mode-${mod.id}`}
                checked={mod.mode !== "asi_pool"}
                onChange={() =>
                  onChange({
                    ...mod,
                    mode: "fixed",
                    points: undefined,
                  })
                }
                className="accent-primary"
              />
              <span className="text-foreground">Fixed amounts</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name={`ability-scores-mode-${mod.id}`}
                checked={mod.mode === "asi_pool"}
                onChange={() =>
                  onChange({
                    ...mod,
                    mode: "asi_pool",
                    points: mod.points ?? 2,
                    bonuses: {},
                  })
                }
                className="accent-primary"
              />
              <span className="text-foreground">Player choice (ASI-style)</span>
            </label>
          </div>

          {mod.mode === "asi_pool" ? (
            <div className="space-y-2">
              <label className="block text-sm">
                <span className="block text-muted-foreground mb-1">Points to allocate</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={mod.points ?? 2}
                  onChange={(e) =>
                    onChange({
                      ...mod,
                      points: Math.max(1, parseInt(e.target.value, 10) || 2),
                    })
                  }
                  className="w-full max-w-[8rem] px-3 py-2 bg-background border border-border rounded-lg"
                />
              </label>
              <p className="text-xs text-muted-foreground">
                In the builder, the player spends these points like an Ability Score Improvement:
                +2 to one ability, or +1 to two abilities (for 2 points).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ABILITY_SCORE_KEYS.map((ability) => (
                <label key={ability} className="text-sm">
                  <span className="block text-muted-foreground capitalize mb-1">{ability}</span>
                  <input
                    type="number"
                    value={mod.bonuses[ability] ?? ""}
                    onChange={(e) =>
                      onChange({
                        ...mod,
                        bonuses: {
                          ...mod.bonuses,
                          [ability]: e.target.value ? parseInt(e.target.value, 10) : undefined,
                        },
                      })
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                    placeholder="+0"
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      )

    case "skills":
      return (
        <SkillsEditor
          mod={mod}
          onChange={onChange}
        />
      )

    case "saving_throws":
      return (
        <TagInput
          values={mod.values}
          onChange={(values) => onChange({ ...mod, values })}
          suggestions={SAVING_THROW_NAMES}
          placeholder="Add saving throw..."
        />
      )

    case "languages":
      return <LanguagesEditor mod={mod} onChange={onChange} />

    case "armor_proficiencies":
      return (
        <ArmorProficienciesEditor
          values={mod.values}
          onChange={(values) => onChange({ ...mod, values })}
        />
      )

    case "tool_proficiencies":
      return (
        <ToolProficienciesEditor mod={mod} onChange={onChange} />
      )

    case "weapon_proficiencies":
      return (
        <WeaponProficienciesEditor
          mod={mod}
          onChange={(next) => onChange(next)}
        />
      )

    case "ac":
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold mb-1">AC Modification</label>
            <select
              value={mod.mode}
              onChange={(e) =>
                onChange({
                  ...mod,
                  mode: e.target.value as typeof mod.mode,
                })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            >
              <option value="flat_bonus">Flat bonus (+N to AC)</option>
              <option value="set_fixed">Set to fixed AC</option>
              <option value="ability_modifiers">Base + ability modifiers (up to 2)</option>
              <option value="add_proficiency">Add proficiency bonus</option>
            </select>
          </div>
          {mod.mode === "flat_bonus" && (
            <input
              type="number"
              value={mod.flatBonus ?? 0}
              onChange={(e) => onChange({ ...mod, flatBonus: parseInt(e.target.value, 10) || 0 })}
              className="w-32 px-3 py-2 bg-background border border-border rounded-lg text-sm"
              placeholder="Bonus"
            />
          )}
          {mod.mode === "set_fixed" && (
            <input
              type="number"
              min={1}
              value={mod.fixedAc ?? 10}
              onChange={(e) => onChange({ ...mod, fixedAc: parseInt(e.target.value, 10) || 10 })}
              className="w-32 px-3 py-2 bg-background border border-border rounded-lg text-sm"
            />
          )}
          {mod.mode === "ability_modifiers" && (
            <div className="space-y-2">
              <input
                type="number"
                min={0}
                value={mod.base ?? 10}
                onChange={(e) => onChange({ ...mod, base: parseInt(e.target.value, 10) || 10 })}
                className="w-32 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                placeholder="Base AC"
              />
              <div className="flex flex-wrap gap-2">
                {ABILITY_MODIFIER_KEYS.map((key) => {
                  const selected = mod.abilities?.includes(key) ?? false
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!selected && (mod.abilities?.length ?? 0) >= 2}
                      onClick={() => {
                        const current = mod.abilities ?? []
                        const next = selected
                          ? current.filter((entry) => entry !== key)
                          : [...current, key].slice(0, 2)
                        onChange({ ...mod, abilities: next })
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-muted-foreground disabled:opacity-40"
                      }`}
                    >
                      {key}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">Select up to two ability modifiers</p>
            </div>
          )}
        </div>
      )

    case "hit_points":
      return (
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={mod.mode}
            onChange={(e) =>
              onChange({ ...mod, mode: e.target.value as typeof mod.mode })
            }
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            <option value="flat">Flat bonus to max HP</option>
            <option value="per_level">Per character level (e.g. Tough)</option>
          </select>
          <input
            type="number"
            value={mod.value}
            onChange={(e) => onChange({ ...mod, value: parseInt(e.target.value, 10) || 0 })}
            className="w-24 px-3 py-2 bg-background border border-border rounded-lg text-sm"
            placeholder="HP"
          />
          <span className="text-xs text-muted-foreground">
            {mod.mode === "per_level" ? "HP per level" : "Total HP bonus"}
          </span>
        </div>
      )

    case "initiative":
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold mb-1">Initiative Modification</label>
            <select
              value={mod.mode}
              onChange={(e) =>
                onChange({
                  ...mod,
                  mode: e.target.value as typeof mod.mode,
                })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            >
              <option value="flat_bonus">Flat bonus (+N to initiative)</option>
              <option value="add_proficiency">Add proficiency bonus</option>
              <option value="ability_modifier">Ability modifier + bonus</option>
            </select>
          </div>
          {mod.mode === "flat_bonus" && (
            <input
              type="number"
              value={mod.flatBonus ?? 0}
              onChange={(e) => onChange({ ...mod, flatBonus: parseInt(e.target.value, 10) || 0 })}
              className="w-32 px-3 py-2 bg-background border border-border rounded-lg text-sm"
              placeholder="Bonus"
            />
          )}
          {mod.mode === "ability_modifier" && (
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={mod.ability ?? "DEX"}
                onChange={(e) =>
                  onChange({
                    ...mod,
                    ability: e.target.value as typeof mod.ability,
                  })
                }
                className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
              >
                {ABILITY_MODIFIER_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={mod.bonus ?? 0}
                onChange={(e) => onChange({ ...mod, bonus: parseInt(e.target.value, 10) || 0 })}
                className="w-24 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                placeholder="Bonus"
              />
              <span className="text-xs text-muted-foreground">
                Uses selected ability mod + bonus instead of DEX
              </span>
            </div>
          )}
        </div>
      )

    case "vision":
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            value={mod.visionType}
            onChange={(e) =>
              onChange({
                ...mod,
                visionType: e.target.value as typeof mod.visionType,
              })
            }
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            {VISION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            value={mod.rangeFeet}
            onChange={(e) => onChange({ ...mod, rangeFeet: parseInt(e.target.value, 10) || 0 })}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
            placeholder="Range (ft)"
          />
          {mod.visionType === "custom" && (
            <input
              type="text"
              value={mod.customType ?? ""}
              onChange={(e) => onChange({ ...mod, customType: e.target.value })}
              className="md:col-span-2 px-3 py-2 bg-background border border-border rounded-lg text-sm"
              placeholder="Custom vision type"
            />
          )}
        </div>
      )

    case "speed":
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={mod.speedType}
            onChange={(e) =>
              onChange({
                ...mod,
                speedType: e.target.value as typeof mod.speedType,
              })
            }
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            {SPEED_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <select
            value={mod.mode}
            onChange={(e) =>
              onChange({
                ...mod,
                mode: e.target.value as SpeedCharacteristic["mode"],
              })
            }
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            <option value="add">Add to existing</option>
            <option value="set">Set to value</option>
            <option value="equal_to_walk">Equal to walk speed</option>
          </select>
          {mod.mode !== "equal_to_walk" ? (
            <input
              type="number"
              min={0}
              value={mod.value}
              onChange={(e) => onChange({ ...mod, value: parseInt(e.target.value, 10) || 0 })}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
              placeholder="Feet"
            />
          ) : (
            <span className="text-sm text-muted-foreground px-3 py-2">Matches walking speed</span>
          )}
          {mod.speedType === "custom" && (
            <input
              type="text"
              value={mod.customType ?? ""}
              onChange={(e) => onChange({ ...mod, customType: e.target.value })}
              className="md:col-span-3 px-3 py-2 bg-background border border-border rounded-lg text-sm"
              placeholder="Custom speed type"
            />
          )}
        </div>
      )

    case "attack_roll_modifiers":
      return (
        <div className="space-y-3">
          <RollModifiersEditor
            entries={mod.entries}
            targets={ATTACK_ROLL_TARGETS}
            onChange={(entries) => onChange({ ...mod, entries })}
            mode="attack"
          />
          <div className="rounded-lg border border-border bg-card/50 p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm text-muted-foreground">Default crit on d20 ≥</label>
              <input
                type="number"
                min={2}
                max={20}
                value={mod.criticalHitMinimum ?? ""}
                onChange={(e) =>
                  onChange({
                    ...mod,
                    criticalHitMinimum: e.target.value ? parseInt(e.target.value, 10) : null,
                  })
                }
                className="w-20 px-3 py-2 bg-background border border-border rounded-lg text-sm text-center"
                placeholder="20"
              />
              <span className="text-xs text-muted-foreground">(all attacks unless entry overrides)</span>
            </div>
            <CritByLevelEditor
              rows={mod.criticalHitMinimumByLevel ?? []}
              onChange={(rows) => onChange({ ...mod, criticalHitMinimumByLevel: rows })}
            />
          </div>
        </div>
      )

    case "damage_roll_modifiers":
      return (
        <RollModifiersEditor
          entries={mod.entries}
          targets={DAMAGE_ROLL_TARGETS}
          onChange={(entries) => onChange({ ...mod, entries })}
          mode="damage"
        />
      )

    case "unarmed_strike_damage":
      return (
        <UnarmedStrikeDamageEditor mod={mod} onChange={onChange} />
      )

    case "special_attack":
      return <SpecialAttackFieldsEditor mod={mod} onChange={onChange} />

    case "rest_replacement":
      return (
        <RestReplacementEditor mod={mod} onChange={onChange} />
      )

    case "magical_sleep_immunity":
      return (
        <p className="text-sm text-muted-foreground">
          The character cannot be put to sleep by magic.
        </p>
      )

    case "creature_size":
      return (
        <CreatureSizeEditor mod={mod} onChange={onChange} />
      )

    case "movement_effects":
      return (
        <MovementEffectsEditor mod={mod} onChange={onChange} />
      )

    case "damage_resistance":
    case "damage_immunity":
      return (
        <TagInput
          values={mod.damageTypes}
          onChange={(damageTypes) => onChange({ ...mod, damageTypes })}
          suggestions={DAMAGE_TYPES}
          placeholder={`Add ${mod.type === "damage_resistance" ? "resistance" : "immunity"}...`}
        />
      )

    case "condition_immunity":
      return (
        <TagInput
          values={mod.conditions}
          onChange={(conditions) => onChange({ ...mod, conditions })}
          suggestions={SRD_CONDITIONS.map((entry) => entry.name)}
          placeholder="Add condition immunity..."
        />
      )

    case "attunement_slots":
      return (
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-muted-foreground">Total attunement slots</label>
          <input
            type="number"
            min={0}
            max={10}
            value={mod.totalSlots ?? ""}
            onChange={(e) =>
              onChange({
                ...mod,
                totalSlots: e.target.value ? parseInt(e.target.value, 10) : null,
              })
            }
            className="w-20 px-2 py-1 bg-background border border-border rounded text-center text-sm"
            placeholder="3"
          />
          <span className="text-sm text-muted-foreground">or +</span>
          <input
            type="number"
            min={0}
            max={5}
            value={mod.bonusSlots ?? 0}
            onChange={(e) =>
              onChange({ ...mod, bonusSlots: parseInt(e.target.value, 10) || 0 })
            }
            className="w-16 px-2 py-1 bg-background border border-border rounded text-center text-sm"
          />
          <span className="text-sm text-muted-foreground">bonus slots</span>
        </div>
      )

    case "aura":
      return <AuraCharacteristicEditor mod={mod} onChange={onChange} />

    case "saving_throw_trigger":
      return (
        <SavingThrowTriggerEditor
          mod={mod}
          onChange={onChange}
          modifierCatalog={modifierCatalog}
          classResources={classResources}
        />
      )

    case "on_hit_trigger":
      return (
        <OnHitTriggerEditor
          mod={mod}
          onChange={onChange}
          modifierCatalog={modifierCatalog}
          classResources={classResources}
        />
      )

    case "failed_roll_trigger":
      return (
        <FailedRollTriggerEditor
          mod={mod}
          onChange={onChange}
          modifierCatalog={modifierCatalog}
          classResources={classResources}
        />
      )

    case "d20_test_reaction":
      return (
        <D20TestReactionEditor
          mod={mod}
          onChange={onChange}
          modifierCatalog={modifierCatalog}
          classResources={classResources}
        />
      )

    case "damage_halving_reaction":
      return <DamageHalvingReactionEditor mod={mod} onChange={onChange} />

    case "healing_dice_pool":
      return <HealingDicePoolEditor mod={mod} onChange={onChange} />

    case "on_creature_death_trigger":
      return (
        <OnCreatureDeathTriggerEditor
          mod={mod}
          onChange={onChange}
          modifierCatalog={modifierCatalog}
          classResources={classResources}
        />
      )

    case "turn_start_trigger":
      return (
        <TurnStartTriggerEditor
          mod={mod}
          onChange={onChange}
          modifierCatalog={modifierCatalog}
          classResources={classResources}
        />
      )

    case "telepathy":
      return <TelepathyEditor mod={mod} onChange={onChange} />

    case "on_cast_spell_trigger":
      return (
        <OnCastSpellTriggerEditor
          mod={mod}
          onChange={onChange}
          modifierCatalog={modifierCatalog}
          classResources={classResources}
        />
      )

    case "spell_healing_modifier":
      return <SpellHealingModifierEditor mod={mod} onChange={onChange} />

    case "resource_ability_menu":
      return (
        <ResourceAbilityMenuEditor
          mod={mod}
          onChange={onChange}
          modifierCatalog={modifierCatalog}
          classResources={classResources}
        />
      )

    case "extra_turn":
      return <ExtraTurnEditor mod={mod} onChange={onChange} />

    case "bonus_damage_riders":
      return <BonusDamageRidersCharacteristicEditor mod={mod} onChange={onChange} />

    case "damage_reduction":
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-muted-foreground">Reduce damage by</label>
            <input
              type="number"
              min={1}
              value={mod.amount}
              onChange={(e) => onChange({ ...mod, amount: parseInt(e.target.value, 10) || 0 })}
              className="w-24 px-3 py-2 bg-background border border-border rounded-lg text-sm"
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              Damage types (leave empty for all types)
            </p>
            <TagInput
              values={mod.damageTypes ?? []}
              onChange={(damageTypes) => onChange({ ...mod, damageTypes })}
              suggestions={DAMAGE_TYPES}
              placeholder="Add damage type..."
            />
          </div>
        </div>
      )

    case "spells":
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Modifies the spell slot table (extra slots per spell level).
          </p>
          {mod.grants.map((grant, idx) => (
            <div
              key={idx}
              className="flex flex-wrap items-center gap-2 p-2 bg-background rounded-lg border border-border"
            >
              <select
                value={grant.level}
                onChange={(e) => {
                  const grants = [...mod.grants]
                  grants[idx] = { ...grant, level: parseInt(e.target.value, 10) }
                  onChange({ ...mod, grants })
                }}
                className="px-2 py-1.5 bg-card border border-border rounded-lg text-sm"
              >
                <option value={0}>Cantrip</option>
                {Array.from({ length: 9 }, (_, i) => i + 1).map((lvl) => (
                  <option key={lvl} value={lvl}>
                    Level {lvl}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={grant.count}
                onChange={(e) => {
                  const grants = [...mod.grants]
                  grants[idx] = { ...grant, count: parseInt(e.target.value, 10) || 1 }
                  onChange({ ...mod, grants })
                }}
                className="w-20 px-2 py-1.5 bg-card border border-border rounded-lg text-sm text-center"
              />
              <span className="text-sm text-muted-foreground">slot(s)</span>
              <button
                type="button"
                onClick={() => onChange({ ...mod, grants: mod.grants.filter((_, i) => i !== idx) })}
                className="p-1 text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...mod, grants: [...mod.grants, { level: 1, count: 1 }] })}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-lg"
          >
            <Plus className="w-3 h-3" />
            Add spell slot grant
          </button>
        </div>
      )

    case "spells_known":
      return (
        <SpellsKnownEditor mod={mod} onChange={onChange} spellOptions={spellOptions} />
      )

    case "spell_list_access":
      return (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Grants access to another class&apos;s full spell list (e.g. Divine Soul Sorcerer → Cleric list).
          </p>
          <div className="flex flex-wrap gap-2">
            {STANDARD_SPELL_CLASSES.map((className) => {
              const selected = mod.classNames.includes(className)
              return (
                <label
                  key={className}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-card text-xs cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(e) => {
                      const classNames = e.target.checked
                        ? [...mod.classNames, className]
                        : mod.classNames.filter((entry) => entry !== className)
                      onChange({ ...mod, classNames })
                    }}
                    className="accent-primary"
                  />
                  {className}
                </label>
              )
            })}
          </div>
        </div>
      )

    case "spellcasting_ability":
      return (
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-muted-foreground">Use ability modifier</label>
          <select
            value={mod.ability}
            onChange={(e) =>
              onChange({ ...mod, ability: e.target.value as typeof mod.ability })
            }
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            {ABILITY_SCORE_KEYS.map((ability) => (
              <option key={ability} value={ability}>
                {ability.charAt(0).toUpperCase() + ability.slice(1)}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            Overrides spellcasting ability for feat-granted spells
          </span>
        </div>
      )

    case "uses":
      return (
        <UsesConfigEditor
          value={mod.uses}
          onChange={(uses) => onChange({ ...mod, uses })}
          otherAbilities={otherAbilities}
        />
      )

    case "grant_feat":
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Feat categories</label>
            <div className="flex flex-wrap gap-2">
              {FEAT_PICK_CATEGORIES.map((category) => {
                const selected = mod.featCategories?.includes(category) ?? false
                return (
                  <label
                    key={category}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-card text-xs cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(e) => {
                        const current = mod.featCategories ?? []
                        const next = e.target.checked
                          ? [...current, category]
                          : current.filter((entry) => entry !== category)
                        onChange({
                          ...mod,
                          featCategories: next.length ? next : ["General"],
                        })
                      }}
                      className="accent-primary"
                    />
                    {category}
                  </label>
                )
              })}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Number of feats</label>
            <input
              type="number"
              min={1}
              max={10}
              value={mod.count ?? 1}
              onChange={(e) =>
                onChange({ ...mod, count: Math.max(1, parseInt(e.target.value, 10) || 1) })
              }
              className="w-full max-w-[8rem] px-3 py-2 bg-background border border-border rounded-lg text-sm"
            />
          </div>
        </div>
      )
  }
}

export function CharacteristicModifiersEditor({
  value,
  onChange,
  otherAbilities = [],
  spellOptions = [],
  modifierCatalog = [],
  classResources = [],
  configureOnly = false,
  templatePreview = false,
}: CharacteristicModifiersEditorProps) {
  const addModifier = (type: CharacteristicModifierType) => {
    onChange([...value, createCharacteristicModifier(type)])
  }

  const showPageHeader = !configureOnly && !templatePreview
  const outerClass = configureOnly
    ? "space-y-3"
    : templatePreview
      ? "space-y-4"
      : "bg-card-lighter border-2 border-primary/30 rounded-xl p-4 space-y-4"
  const modCardClass = configureOnly
    ? "space-y-3"
    : templatePreview
      ? "p-4 bg-background/70 border border-dashed border-secondary/40 rounded-xl space-y-3"
      : "p-4 bg-background border border-border rounded-xl space-y-3"

  return (
    <div className={outerClass}>
      {showPageHeader && (
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-foreground">Characteristic Modifiers</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Mechanical effects from feats and features — ability scores, proficiencies, combat stats,
              spell grants, and limited-use resources.
            </p>
          </div>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) addModifier(e.target.value as CharacteristicModifierType)
            }}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm font-medium"
          >
            <option value="">Add modifier...</option>
            {CHARACTERISTIC_MODIFIER_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {templatePreview && (
        <div className="flex justify-end">
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) addModifier(e.target.value as CharacteristicModifierType)
            }}
            className="px-3 py-2 bg-background border border-dashed border-secondary/40 rounded-lg text-sm font-medium"
          >
            <option value="">Add modifier type…</option>
            {CHARACTERISTIC_MODIFIER_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {value.length === 0 ? (
        configureOnly ? null : (
          <p
            className={
              templatePreview
                ? "text-sm text-muted-foreground italic py-4 text-center border border-dashed border-secondary/40 rounded-lg"
                : "text-sm text-muted-foreground italic py-4 text-center border border-dashed border-border rounded-lg"
            }
          >
            {templatePreview
              ? "No template modifier types yet. Add types to define what can be configured when this entry is linked."
              : "No characteristic modifiers yet. Add one to define mechanical benefits."}
          </p>
        )
      ) : (
        <div className="space-y-3">
          {value.map((mod) => {
            const typeLabel =
              CHARACTERISTIC_MODIFIER_TYPE_OPTIONS.find((option) => option.value === mod.type)?.label ??
              mod.type
            return (
              <div key={mod.id} className={modCardClass}>
                {!configureOnly && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-primary">{typeLabel}</span>
                      <input
                        type="text"
                        value={mod.label ?? ""}
                        onChange={(e) => onChange(updateModifier(value, mod.id, { ...mod, label: e.target.value }))}
                        placeholder="Optional label"
                        className="px-2 py-1 bg-card border border-border rounded text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onChange(value.filter((entry) => entry.id !== mod.id))}
                      className="p-1 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <ModifierFields
                  mod={mod}
                  onChange={(next) => onChange(updateModifier(value, mod.id, next))}
                  otherAbilities={otherAbilities}
                  spellOptions={spellOptions}
                  modifierCatalog={modifierCatalog}
                  classResources={classResources}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function WeaponPropertiesChecklist({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (properties: string[]) => void
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {WEAPON_PROPERTIES.map((prop) => (
        <label key={prop} className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={selected.includes(prop)}
            onChange={(e) => {
              onChange(
                e.target.checked ? [...selected, prop] : selected.filter((entry) => entry !== prop),
              )
            }}
            className="accent-primary"
          />
          <span className="text-muted-foreground">{prop}</span>
        </label>
      ))}
    </div>
  )
}

function SpecialAttackDamageByLevelEditor({
  rows,
  onChange,
}: {
  rows: BonusByLevelEntry[]
  onChange: (rows: BonusByLevelEntry[]) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground">Damage by character level</label>
        <button
          type="button"
          onClick={() => onChange([...rows, { level: 1, mode: "dice", dieCount: 1, dieType: "d6" }])}
          className="text-xs text-primary hover:underline"
        >
          + Add row
        </button>
      </div>
      {rows.map((row, idx) => (
        <div key={idx} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/50 p-2">
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
            className="w-16 px-2 py-1.5 bg-background border border-border rounded text-sm text-center"
          />
          <span className="text-xs text-muted-foreground">Dice</span>
          <input
            type="number"
            min={1}
            value={row.dieCount ?? 1}
            onChange={(e) => {
              const next = [...rows]
              next[idx] = { ...row, mode: "dice", dieCount: parseInt(e.target.value, 10) || 1 }
              onChange(next)
            }}
            className="w-16 px-2 py-1.5 bg-background border border-border rounded text-sm text-center"
          />
          <select
            value={row.dieType ?? "d6"}
            onChange={(e) => {
              const next = [...rows]
              next[idx] = {
                ...row,
                mode: "dice",
                dieType: e.target.value as BonusByLevelEntry["dieType"],
              }
              onChange(next)
            }}
            className="px-2 py-1.5 bg-background border border-border rounded text-sm"
          >
            {SPECIAL_ATTACK_DIE_TYPES.map((die) => (
              <option key={die} value={die}>
                {die}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onChange(rows.filter((_, rowIdx) => rowIdx !== idx))}
            className="p-1 text-muted-foreground hover:text-destructive"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

function RestReplacementEditor({
  mod,
  onChange,
}: {
  mod: RestReplacementCharacteristic
  onChange: (next: RestReplacementCharacteristic) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-muted-foreground">Rest duration (hours)</label>
        <input
          type="number"
          min={1}
          max={24}
          value={mod.restHours}
          onChange={(e) => onChange({ ...mod, restHours: parseInt(e.target.value, 10) || 4 })}
          className="w-24 px-3 py-2 bg-background border border-border rounded-lg text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={mod.replacesLongRest ?? true}
          onChange={(e) => onChange({ ...mod, replacesLongRest: e.target.checked })}
          className="accent-primary"
        />
        <span className="text-muted-foreground">Counts as a long rest</span>
      </label>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Description / notes</label>
        <textarea
          value={mod.description ?? ""}
          onChange={(e) => onChange({ ...mod, description: e.target.value })}
          placeholder="e.g. Trance meditation — retain consciousness during rest"
          rows={3}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm resize-y min-h-[4rem]"
        />
      </div>
    </div>
  )
}

function CreatureSizeEditor({
  mod,
  onChange,
}: {
  mod: CreatureSizeCharacteristic
  onChange: (next: CreatureSizeCharacteristic) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-muted-foreground">Size</label>
        <select
          value={mod.size}
          onChange={(e) =>
            onChange({ ...mod, size: e.target.value as CreatureSizeCharacteristic["size"] })
          }
          className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
        >
          {SPECIES_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-muted-foreground">Mode</label>
        <select
          value={mod.mode}
          onChange={(e) =>
            onChange({ ...mod, mode: e.target.value as CreatureSizeCharacteristic["mode"] })
          }
          className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
        >
          <option value="passive">Always this size</option>
          <option value="activatable">Can assume this size temporarily</option>
        </select>
      </div>
      {mod.mode === "activatable" && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-muted-foreground">Duration (minutes)</label>
          <input
            type="number"
            min={1}
            value={mod.durationMinutes ?? 10}
            onChange={(e) =>
              onChange({ ...mod, durationMinutes: parseInt(e.target.value, 10) || 10 })
            }
            className="w-24 px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
        </div>
      )}
    </div>
  )
}

function MovementEffectsEditor({
  mod,
  onChange,
}: {
  mod: MovementEffectsCharacteristic
  onChange: (next: MovementEffectsCharacteristic) => void
}) {
  return (
    <div className="space-y-3">
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
              checked={!!mod[key]}
              onChange={(e) => onChange({ ...mod, [key]: e.target.checked })}
              className="accent-primary"
            />
            <span className="text-muted-foreground">{label}</span>
          </label>
        ))}
      </div>
      <MovementTypesCheckboxGroup
        value={mod.movementTypes ?? []}
        onChange={(movementTypes) => onChange({ ...mod, movementTypes })}
      />
    </div>
  )
}

function MovementTypesCheckboxGroup({
  value,
  onChange,
}: {
  value: import("@/lib/types").MovementType[]
  onChange: (types: import("@/lib/types").MovementType[]) => void
}) {
  const options = [
    { value: "walk", label: "Walk" },
    { value: "fly", label: "Fly" },
    { value: "swim", label: "Swim" },
    { value: "climb", label: "Climb" },
    { value: "burrow", label: "Burrow" },
    { value: "jump", label: "Jump" },
  ] as const

  const toggle = (type: import("@/lib/types").MovementType) => {
    if (value.includes(type)) onChange(value.filter((entry) => entry !== type))
    else onChange([...value, type])
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-foreground mb-1">Movement types</label>
      <p className="text-xs text-muted-foreground mb-2">Leave all unchecked for any movement type.</p>
      <div className="flex flex-wrap gap-3 text-sm">
        {options.map(({ value: type, label }) => (
          <label key={type} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value.includes(type)}
              onChange={() => toggle(type)}
              className="accent-primary"
            />
            <span className="text-muted-foreground">{label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function UnarmedStrikeDamageEditor({
  mod,
  onChange,
}: {
  mod: import("@/lib/compendium/characteristic-modifiers").UnarmedStrikeDamageCharacteristic
  onChange: (next: import("@/lib/compendium/characteristic-modifiers").UnarmedStrikeDamageCharacteristic) => void
}) {
  const dieByLevel = mod.dieByLevel ?? []
  const useLevelTable = dieByLevel.length > 0

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={useLevelTable}
          onChange={(e) =>
            onChange({
              ...mod,
              dieByLevel: e.target.checked
                ? [{ level: 1, mode: "dice", dieCount: 1, dieType: "d6" }]
                : [],
            })
          }
          className="accent-primary"
        />
        <span className="text-muted-foreground">Scale die by character level (Martial Arts table)</span>
      </label>

      {useLevelTable ? (
        <div className="space-y-2">
          {dieByLevel.map((row, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">At level</span>
              <input
                type="number"
                min={1}
                max={20}
                value={row.level}
                onChange={(e) => {
                  const next = [...dieByLevel]
                  next[idx] = { ...row, level: parseInt(e.target.value, 10) || 1 }
                  onChange({ ...mod, dieByLevel: next })
                }}
                className="w-16 px-2 py-1.5 bg-background border border-border rounded-lg text-sm"
              />
              <span className="text-xs text-muted-foreground">die</span>
              <select
                value={row.dieType ?? "d6"}
                onChange={(e) => {
                  const next = [...dieByLevel]
                  next[idx] = {
                    ...row,
                    mode: "dice",
                    dieCount: 1,
                    dieType: e.target.value as typeof row.dieType,
                  }
                  onChange({ ...mod, dieByLevel: next })
                }}
                className="px-2 py-1.5 bg-background border border-border rounded-lg text-sm"
              >
                {["d4", "d6", "d8", "d10", "d12"].map((die) => (
                  <option key={die} value={die}>
                    1{die}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  onChange({ ...mod, dieByLevel: dieByLevel.filter((_, i) => i !== idx) })
                }
                className="text-xs text-destructive hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange({
                ...mod,
                dieByLevel: [
                  ...dieByLevel,
                  {
                    level: dieByLevel.length ? Math.min(20, Math.max(...dieByLevel.map((r) => r.level)) + 1) : 1,
                    mode: "dice",
                    dieCount: 1,
                    dieType: "d8",
                  },
                ],
              })
            }
            className="text-xs text-primary hover:underline"
          >
            Add level tier
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-muted-foreground">Fixed damage die</label>
          <select
            value={mod.die ?? "1d6"}
            onChange={(e) => onChange({ ...mod, die: e.target.value as typeof mod.die })}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            {UNARMED_STRIKE_DICE.map((die) => (
              <option key={die} value={die}>
                {die === "1" ? "1 (flat damage)" : die}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

function AuraCharacteristicEditor({
  mod,
  onChange,
}: {
  mod: AuraCharacteristic
  onChange: (next: AuraCharacteristic) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-muted-foreground">Radius (ft.)</label>
        <input
          type="number"
          min={5}
          value={mod.radiusFeet}
          onChange={(e) => onChange({ ...mod, radiusFeet: parseInt(e.target.value, 10) || 10 })}
          className="w-24 px-3 py-2 bg-background border border-border rounded-lg text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={mod.affectsSelf !== false}
          onChange={(e) => onChange({ ...mod, affectsSelf: e.target.checked })}
          className="accent-primary"
        />
        <span className="text-muted-foreground">Affects you</span>
      </label>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={mod.affectsAllies !== false}
          onChange={(e) => onChange({ ...mod, affectsAllies: e.target.checked })}
          className="accent-primary"
        />
        <span className="text-muted-foreground">Affects allies</span>
      </label>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={!!mod.halfCover}
          onChange={(e) => onChange({ ...mod, halfCover: e.target.checked })}
          className="accent-primary"
        />
        <span className="text-muted-foreground">Grants half cover</span>
      </label>
      <div>
        <p className="text-xs text-muted-foreground mb-2">Save bonus (e.g. Aura of Protection)</p>
        <select
          value={mod.saveBonusConfig?.ability ?? ""}
          onChange={(e) =>
            onChange({
              ...mod,
              saveBonusConfig: e.target.value
                ? { mode: "ability_modifier", ability: e.target.value as "CHA" }
                : null,
            })
          }
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
        >
          <option value="">None</option>
          {ABILITY_MODIFIER_KEYS.map((key) => (
            <option key={key} value={key}>
              {key} modifier
            </option>
          ))}
        </select>
      </div>
      <TagInput
        values={mod.conditionImmunities ?? []}
        onChange={(conditionImmunities) => onChange({ ...mod, conditionImmunities })}
        suggestions={SRD_CONDITIONS.map((entry) => entry.name)}
        placeholder="Condition immunities in aura..."
      />
    </div>
  )
}

function BonusDamageRidersCharacteristicEditor({
  mod,
  onChange,
}: {
  mod: BonusDamageRidersCharacteristic
  onChange: (next: BonusDamageRidersCharacteristic) => void
}) {
  const riders = mod.riders ?? []

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Trigger</label>
          <select
            value={mod.triggerOn ?? "on_hit"}
            onChange={(e) =>
              onChange({
                ...mod,
                triggerOn: e.target.value as BonusDamageRidersCharacteristic["triggerOn"],
              })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            <option value="on_hit">On hit (optional riders)</option>
            <option value="on_crit">On critical hit</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Applies to</label>
          <input
            type="text"
            value={mod.appliesTo ?? ""}
            onChange={(e) => onChange({ ...mod, appliesTo: e.target.value || null })}
            placeholder="e.g. weapon attacks, Sneak Attack"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card/50 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-foreground">Automatic bonus</span>
          {mod.automaticBonus ? (
            <span className="text-xs text-muted-foreground">
              {formatRollBonusSummary(mod.automaticBonus)}
            </span>
          ) : null}
        </div>
        <RollBonusEditor
          value={mod.automaticBonus ?? defaultRollBonusConfig("fixed")}
          onChange={(automaticBonus) => onChange({ ...mod, automaticBonus })}
          label="Bonus on trigger (leave fixed 0 to disable)"
        />
        <button
          type="button"
          onClick={() => onChange({ ...mod, automaticBonus: null })}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Clear automatic bonus
        </button>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Max optional riders per use</span>
        <input
          type="number"
          min={1}
          max={5}
          value={mod.maxRidersPerUse ?? 1}
          onChange={(e) =>
            onChange({ ...mod, maxRidersPerUse: parseInt(e.target.value, 10) || 1 })
          }
          className="w-16 px-2 py-1 bg-background border border-border rounded text-center"
        />
      </div>
      {riders.map((rider, idx) => (
        <div key={`${rider.name}-${idx}`} className="space-y-2 p-2 bg-background rounded-lg border border-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={rider.name}
              onChange={(e) => {
                const next = [...riders]
                next[idx] = { ...rider, name: e.target.value }
                onChange({ ...mod, riders: next })
              }}
              placeholder="Rider name"
              className="flex-1 px-2 py-1.5 bg-card border border-border rounded text-sm"
            />
            <input
              type="text"
              value={rider.costDice ?? ""}
              onChange={(e) => {
                const next = [...riders]
                next[idx] = { ...rider, costDice: e.target.value || null }
                onChange({ ...mod, riders: next })
              }}
              placeholder="1d6"
              className="w-20 px-2 py-1.5 bg-card border border-border rounded text-sm"
            />
            <button
              type="button"
              onClick={() => onChange({ ...mod, riders: riders.filter((_, i) => i !== idx) })}
              className="p-1 text-muted-foreground hover:text-destructive"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            value={rider.description ?? ""}
            onChange={(e) => {
              const next = [...riders]
              next[idx] = { ...rider, description: e.target.value || null }
              onChange({ ...mod, riders: next })
            }}
            placeholder="Description"
            className="w-full px-2 py-1.5 bg-card border border-border rounded text-sm"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange({
            ...mod,
            riders: [...riders, { name: "", costDice: null, description: null }],
          })
        }
        className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-lg"
      >
        <Plus className="w-3 h-3" />
        Add rider
      </button>
    </div>
  )
}
