"use client"

import { useState } from "react"
import { X } from "lucide-react"
import {
  BACKGROUND_ARMOR_OPTIONS,
  BACKGROUND_WEAPON_CATEGORY_OPTIONS,
  mergeProficiencyLists,
  type BackgroundProficiencies,
  emptyBackgroundProficiencies,
} from "@/lib/compendium/background-proficiencies"
import { SRD_TOOL_NAMES } from "@/lib/compendium/srd-tool-names"

type WeaponOption = { id: string; name: string; subcategory: string | null }

type Props = {
  value: BackgroundProficiencies
  onChange: (value: BackgroundProficiencies) => void
  weaponOptions: WeaponOption[]
}

function TagList({
  items,
  onRemove,
}: {
  items: string[]
  onRemove: (item: string) => void
}) {
  if (!items.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm"
        >
          {item}
          <button
            type="button"
            onClick={() => onRemove(item)}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
    </div>
  )
}

const TOOL_OTHER_VALUE = "__other__"

export function BackgroundProficienciesEditor({ value, onChange, weaponOptions }: Props) {
  const prof = value ?? emptyBackgroundProficiencies()
  const toolsAndVehicles = mergeProficiencyLists(prof.tools, prof.vehicles)
  const [languageInput, setLanguageInput] = useState("")
  const [customWeaponInput, setCustomWeaponInput] = useState("")
  const [toolPick, setToolPick] = useState("")
  const [otherToolInput, setOtherToolInput] = useState("")
  const [weaponPick, setWeaponPick] = useState("")

  const addTo = <K extends keyof BackgroundProficiencies>(key: K, item: string) => {
    const trimmed = item.trim()
    if (!trimmed || prof[key].includes(trimmed)) return
    onChange({ ...prof, [key]: [...prof[key], trimmed] })
  }

  const removeFrom = <K extends keyof BackgroundProficiencies>(key: K, item: string) => {
    onChange({ ...prof, [key]: prof[key].filter((v) => v !== item) })
  }

  const addToolOrVehicle = (item: string) => {
    const trimmed = item.trim()
    if (!trimmed || toolsAndVehicles.includes(trimmed)) return
    onChange({
      ...prof,
      tools: [...toolsAndVehicles, trimmed],
      vehicles: [],
    })
  }

  const removeToolOrVehicle = (item: string) => {
    onChange({
      ...prof,
      tools: prof.tools.filter((t) => t !== item),
      vehicles: prof.vehicles.filter((v) => v !== item),
    })
  }

  const toggleArmor = (armor: string) => {
    if (prof.armor.includes(armor)) removeFrom("armor", armor)
    else onChange({ ...prof, armor: [...prof.armor, armor] })
  }

  const weaponNamesInCompendium = weaponOptions
    .map((w) => w.name)
    .filter((name) => !prof.weapons.includes(name))

  return (
    <div className="bg-card border-2 border-border rounded-xl p-4 space-y-5">
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1">Proficiencies</label>
        <p className="text-xs text-muted-foreground">
          Tools, vehicles, weapons, armor, and languages this background grants.
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-foreground mb-2">Tools and Vehicles</label>
        <select
          value={toolPick}
          onChange={(e) => {
            const v = e.target.value
            setToolPick(v)
            if (v && v !== TOOL_OTHER_VALUE) {
              addToolOrVehicle(v)
              setToolPick("")
            }
          }}
          className="w-full px-4 py-2 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary mb-2"
        >
          <option value="">Add tool from SRD...</option>
          {SRD_TOOL_NAMES.filter((t) => !toolsAndVehicles.includes(t)).map((tool) => (
            <option key={tool} value={tool}>
              {tool}
            </option>
          ))}
          <option value={TOOL_OTHER_VALUE}>Other...</option>
        </select>
        {toolPick === TOOL_OTHER_VALUE && (
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={otherToolInput}
              onChange={(e) => setOtherToolInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addToolOrVehicle(otherToolInput)
                  setOtherToolInput("")
                  setToolPick("")
                }
              }}
              placeholder="e.g. Water vehicles"
              className="flex-1 px-4 py-2 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                addToolOrVehicle(otherToolInput)
                setOtherToolInput("")
                setToolPick("")
              }}
              className="px-4 py-2 bg-primary/10 text-primary rounded-xl font-semibold hover:bg-primary/20"
            >
              Add
            </button>
          </div>
        )}
        <TagList items={toolsAndVehicles} onRemove={removeToolOrVehicle} />
      </div>

      <div>
        <label className="block text-sm font-semibold text-foreground mb-2">Weapons</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) addTo("weapons", e.target.value)
            }}
            className="px-4 py-2 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
          >
            <option value="">Weapon category...</option>
            {BACKGROUND_WEAPON_CATEGORY_OPTIONS.filter((w) => !prof.weapons.includes(w)).map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
          <select
            value={weaponPick}
            onChange={(e) => {
              const v = e.target.value
              if (v) {
                addTo("weapons", v)
                setWeaponPick("")
              }
            }}
            className="px-4 py-2 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
          >
            <option value="">Specific weapon...</option>
            {weaponNamesInCompendium.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={customWeaponInput}
            onChange={(e) => setCustomWeaponInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addTo("weapons", customWeaponInput)
                setCustomWeaponInput("")
              }
            }}
            placeholder="Custom weapon proficiency"
            className="flex-1 px-4 py-2 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => {
              addTo("weapons", customWeaponInput)
              setCustomWeaponInput("")
            }}
            className="px-4 py-2 bg-primary/10 text-primary rounded-xl font-semibold hover:bg-primary/20"
          >
            Add
          </button>
        </div>
        <TagList items={prof.weapons} onRemove={(w) => removeFrom("weapons", w)} />
      </div>

      <div>
        <label className="block text-sm font-semibold text-foreground mb-2">Armor</label>
        <div className="grid grid-cols-2 gap-2">
          {BACKGROUND_ARMOR_OPTIONS.map((armor) => (
            <label key={armor} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={prof.armor.includes(armor)}
                onChange={() => toggleArmor(armor)}
                className="w-4 h-4 rounded border-border accent-primary"
              />
              <span className="text-foreground">{armor}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-foreground mb-2">Languages</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={languageInput}
            onChange={(e) => setLanguageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addTo("languages", languageInput)
                setLanguageInput("")
              }
            }}
            placeholder="e.g. Elvish"
            className="flex-1 px-4 py-2 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => {
              addTo("languages", languageInput)
              setLanguageInput("")
            }}
            className="px-4 py-2 bg-primary/10 text-primary rounded-xl font-semibold hover:bg-primary/20"
          >
            Add
          </button>
        </div>
        <TagList items={prof.languages} onRemove={(l) => removeFrom("languages", l)} />
      </div>
    </div>
  )
}
