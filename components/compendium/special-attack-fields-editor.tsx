"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import {
  DAMAGE_TYPES,
  SPECIAL_ATTACK_AREA_SHAPES,
  SPECIAL_ATTACK_DIE_TYPES,
  SPECIAL_ATTACK_PROFILES,
  type SpecialAttackCharacteristic,
} from "@/lib/compendium/characteristic-modifiers"
import { WEAPON_PROPERTIES } from "@/lib/compendium/equipment-properties"
import {
  normalizeBonusByLevel,
  type BonusByLevelEntry,
} from "@/lib/compendium/bonus-by-level"

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
  const [draft, setDraft] = useState("")
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-1 px-2 py-1 bg-secondary/20 border border-border rounded text-xs"
          >
            {value}
            <button type="button" onClick={() => onChange(values.filter((v) => v !== value))}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={draft}
        list={suggestions ? "tag-suggestions" : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft.trim()) {
            e.preventDefault()
            if (!values.includes(draft.trim())) onChange([...values, draft.trim()])
            setDraft("")
          }
        }}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
      />
      {suggestions && (
        <datalist id="tag-suggestions">
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </div>
  )
}

function WeaponPropertiesChecklist({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (values: string[]) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {WEAPON_PROPERTIES.map((prop) => (
        <label key={prop} className="flex items-center gap-1.5 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={selected.includes(prop)}
            onChange={(e) =>
              onChange(e.target.checked ? [...selected, prop] : selected.filter((p) => p !== prop))
            }
            className="accent-primary"
          />
          <span className="text-muted-foreground">{prop}</span>
        </label>
      ))}
    </div>
  )
}

function DamageByLevelEditor({
  rows,
  onChange,
}: {
  rows: BonusByLevelEntry[]
  onChange: (rows: BonusByLevelEntry[]) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Scaling damage dice by character level (optional).</p>
      {rows.map((row, idx) => (
        <div key={idx} className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Level</span>
          <input
            type="number"
            min={1}
            value={row.level}
            onChange={(e) => {
              const next = [...rows]
              next[idx] = { ...row, level: parseInt(e.target.value, 10) || 1 }
              onChange(next)
            }}
            className="w-16 px-2 py-1 bg-background border border-border rounded text-sm"
          />
          <input
            type="number"
            min={1}
            value={row.dieCount ?? 1}
            onChange={(e) => {
              const next = [...rows]
              next[idx] = { ...row, dieCount: parseInt(e.target.value, 10) || 1 }
              onChange(next)
            }}
            className="w-16 px-2 py-1 bg-background border border-border rounded text-sm"
          />
          <select
            value={row.dieType ?? "d6"}
            onChange={(e) => {
              const next = [...rows]
              next[idx] = { ...row, dieType: e.target.value as BonusByLevelEntry["dieType"] }
              onChange(next)
            }}
            className="px-2 py-1 bg-background border border-border rounded text-sm"
          >
            {SPECIAL_ATTACK_DIE_TYPES.map((die) => (
              <option key={die} value={die}>
                {die}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => onChange(rows.filter((_, i) => i !== idx))}>
            <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([
            ...rows,
            { level: rows.length ? (rows[rows.length - 1].level ?? 1) + 4 : 1, mode: "dice", dieCount: 1, dieType: "d6" },
          ])
        }
        className="flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <Plus className="h-3 w-3" />
        Add level row
      </button>
    </div>
  )
}

export function SpecialAttackFieldsEditor({
  mod,
  onChange,
}: {
  mod: SpecialAttackCharacteristic
  onChange: (next: SpecialAttackCharacteristic) => void
}) {
  const damageByLevel = normalizeBonusByLevel(mod.damageByLevel)

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Attack name</label>
          <input
            type="text"
            value={mod.attackName ?? ""}
            onChange={(e) => onChange({ ...mod, attackName: e.target.value })}
            placeholder="Breath Weapon, Bite, Claws…"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Attack type</label>
          <select
            value={mod.attackProfile ?? "melee"}
            onChange={(e) =>
              onChange({
                ...mod,
                attackProfile: e.target.value as SpecialAttackCharacteristic["attackProfile"],
              })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            {SPECIAL_ATTACK_PROFILES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-2">Weapon properties</label>
        <WeaponPropertiesChecklist
          selected={mod.properties ?? []}
          onChange={(properties) => onChange({ ...mod, properties })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Base dice count</label>
          <input
            type="number"
            min={1}
            value={mod.damageDiceCount}
            onChange={(e) => onChange({ ...mod, damageDiceCount: parseInt(e.target.value, 10) || 1 })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Damage die</label>
          <select
            value={mod.damageDieType}
            onChange={(e) =>
              onChange({ ...mod, damageDieType: e.target.value as SpecialAttackCharacteristic["damageDieType"] })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            {SPECIAL_ATTACK_DIE_TYPES.map((die) => (
              <option key={die} value={die}>
                {die}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Range (feet)</label>
          <input
            type="number"
            min={0}
            value={mod.rangeFeet ?? ""}
            onChange={(e) =>
              onChange({ ...mod, rangeFeet: e.target.value ? parseInt(e.target.value, 10) : null })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-muted-foreground mb-1">Damage types</label>
        <TagInput
          values={mod.damageTypes ?? []}
          onChange={(damageTypes) => onChange({ ...mod, damageTypes })}
          suggestions={DAMAGE_TYPES}
          placeholder="Add damage type…"
        />
      </div>

      <DamageByLevelEditor rows={damageByLevel} onChange={(rows) => onChange({ ...mod, damageByLevel: rows })} />

      {(mod.attackProfile === "force_save" || mod.attackProfile === "emanation") && (
        <div className="grid gap-3 sm:grid-cols-2 rounded-lg border border-border bg-card/50 p-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Area shape</label>
            <select
              value={mod.areaShape ?? ""}
              onChange={(e) =>
                onChange({
                  ...mod,
                  areaShape: (e.target.value || null) as SpecialAttackCharacteristic["areaShape"],
                })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            >
              <option value="">None</option>
              {SPECIAL_ATTACK_AREA_SHAPES.map((shape) => (
                <option key={shape.value} value={shape.value}>
                  {shape.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Area length (ft)</label>
            <input
              type="number"
              min={0}
              value={mod.areaLengthFeet ?? ""}
              onChange={(e) =>
                onChange({ ...mod, areaLengthFeet: e.target.value ? parseInt(e.target.value, 10) : null })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            />
          </div>
          {mod.areaShape === "cone_or_line" && (
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Line length (ft)</label>
              <input
                type="number"
                min={0}
                value={mod.alternateAreaLengthFeet ?? ""}
                onChange={(e) =>
                  onChange({
                    ...mod,
                    alternateAreaLengthFeet: e.target.value ? parseInt(e.target.value, 10) : null,
                  })
                }
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
              />
            </div>
          )}
          {mod.attackProfile === "force_save" && (
            <>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Save ability</label>
                <input
                  type="text"
                  value={mod.saveAbility ?? ""}
                  onChange={(e) => onChange({ ...mod, saveAbility: e.target.value || null })}
                  placeholder="Dexterity"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Save DC base</label>
                <input
                  type="number"
                  min={0}
                  value={mod.saveDCBase ?? 8}
                  onChange={(e) => onChange({ ...mod, saveDCBase: parseInt(e.target.value, 10) || 8 })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
