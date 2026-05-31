"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import { UsesConfigEditor } from "@/components/uses-config-editor"
import {
  ABILITY_SCORE_KEYS,
  ABILITY_MODIFIER_KEYS,
  CHARACTERISTIC_MODIFIER_TYPE_OPTIONS,
  DAMAGE_TYPES,
  SKILL_NAMES,
  SAVING_THROW_NAMES,
  SPEED_TYPES,
  VISION_TYPES,
  createCharacteristicModifier,
  type CharacteristicModifier,
  type CharacteristicModifierType,
} from "@/lib/compendium/characteristic-modifiers"

type CharacteristicModifiersEditorProps = {
  value: CharacteristicModifier[]
  onChange: (value: CharacteristicModifier[]) => void
  otherAbilities?: { id: string; name: string }[]
  spellOptions?: { id: string; name: string }[]
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

function ModifierFields({
  mod,
  onChange,
  otherAbilities,
  spellOptions,
}: {
  mod: CharacteristicModifier
  onChange: (next: CharacteristicModifier) => void
  otherAbilities: { id: string; name: string }[]
  spellOptions: { id: string; name: string }[]
}) {
  switch (mod.type) {
    case "ability_scores":
      return (
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
      )

    case "skills":
      return (
        <TagInput
          values={mod.values}
          onChange={(values) => onChange({ ...mod, values })}
          suggestions={SKILL_NAMES}
          placeholder="Add skill..."
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
    case "armor_proficiencies":
    case "weapon_proficiencies":
    case "tool_proficiencies":
      return (
        <TagInput
          values={mod.values}
          onChange={(values) => onChange({ ...mod, values })}
          placeholder={`Add ${mod.type.replace(/_/g, " ")}...`}
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
              <span className="text-xs text-muted-foreground">Uses selected ability mod + bonus instead of DEX</span>
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
            onChange={(e) => onChange({ ...mod, mode: e.target.value as "set" | "add" })}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            <option value="add">Add to existing</option>
            <option value="set">Set to value</option>
          </select>
          <input
            type="number"
            min={0}
            value={mod.value}
            onChange={(e) => onChange({ ...mod, value: parseInt(e.target.value, 10) || 0 })}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
            placeholder="Feet"
          />
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

    case "spells":
      return (
        <div className="space-y-2">
          {mod.grants.map((grant, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2 p-2 bg-background rounded-lg border border-border">
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
              <span className="text-sm text-muted-foreground">spell(s)</span>
              {spellOptions.length > 0 && (
                <select
                  value={grant.spellIds?.[0] ?? ""}
                  onChange={(e) => {
                    const grants = [...mod.grants]
                    grants[idx] = {
                      ...grant,
                      spellIds: e.target.value ? [e.target.value] : undefined,
                    }
                    onChange({ ...mod, grants })
                  }}
                  className="flex-1 min-w-[140px] px-2 py-1.5 bg-card border border-border rounded-lg text-sm"
                >
                  <option value="">Any spell (count only)</option>
                  {spellOptions.map((spell) => (
                    <option key={spell.id} value={spell.id}>
                      {spell.name}
                    </option>
                  ))}
                </select>
              )}
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
            Add spell grant
          </button>
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
  }
}

export function CharacteristicModifiersEditor({
  value,
  onChange,
  otherAbilities = [],
  spellOptions = [],
}: CharacteristicModifiersEditorProps) {
  const addModifier = (type: CharacteristicModifierType) => {
    onChange([...value, createCharacteristicModifier(type)])
  }

  return (
    <div className="bg-card-lighter border-2 border-primary/30 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-foreground">Characteristic Modifiers</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Mechanical effects — ability scores, proficiencies, AC, initiative, vision, speed, resistances, spells, and uses.
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

      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-4 text-center border border-dashed border-border rounded-lg">
          No characteristic modifiers yet. Add one to define mechanical benefits.
        </p>
      ) : (
        <div className="space-y-3">
          {value.map((mod) => {
            const typeLabel =
              CHARACTERISTIC_MODIFIER_TYPE_OPTIONS.find((option) => option.value === mod.type)?.label ??
              mod.type
            return (
              <div key={mod.id} className="p-4 bg-background border border-border rounded-xl space-y-3">
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
                <ModifierFields
                  mod={mod}
                  onChange={(next) => onChange(updateModifier(value, mod.id, next))}
                  otherAbilities={otherAbilities}
                  spellOptions={spellOptions}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
