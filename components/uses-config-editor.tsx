"use client"

import { Plus, X } from "lucide-react"
import type { UsesConfig } from "@/lib/types"
import { ABILITY_MODIFIER_KEYS } from "@/lib/compendium/characteristic-modifiers"

const DIE_TYPES = ["d4", "d6", "d8", "d10", "d12", "d20"] as const
const LEVELS = Array.from({ length: 20 }, (_, i) => i + 1)

type UsesConfigEditorProps = {
  value: UsesConfig
  onChange: (value: UsesConfig) => void
  otherAbilities?: { id: string; name: string }[]
}

export function UsesConfigEditor({
  value,
  onChange,
  otherAbilities = [],
}: UsesConfigEditorProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Uses Type</label>
          <select
            value={value.type}
            onChange={(e) =>
              onChange({
                ...value,
                type: e.target.value as UsesConfig["type"],
                fixedAmount: undefined,
                abilityModifier: undefined,
                customAbilityId: undefined,
                atLevelTable: undefined,
              })
            }
            className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
          >
            <option value="unlimited">Unlimited (At Will)</option>
            <option value="fixed">Fixed Number</option>
            <option value="proficiency">Proficiency Modifier</option>
            <option value="ability_modifier">Ability Modifier</option>
            <option value="custom_ability">Same as Another Ability</option>
            <option value="at_level">Based on Level</option>
            <option value="class_resource">Class resource</option>
          </select>
        </div>

        {value.type === "fixed" && (
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Number of Uses</label>
            <input
              type="number"
              min={1}
              max={99}
              value={value.fixedAmount ?? 1}
              onChange={(e) => onChange({ ...value, fixedAmount: parseInt(e.target.value, 10) || 1 })}
              className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
            />
          </div>
        )}

        {value.type === "ability_modifier" && (
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Ability Score</label>
            <select
              value={value.abilityModifier || ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  abilityModifier: e.target.value as UsesConfig["abilityModifier"],
                })
              }
              className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">Select ability...</option>
              {ABILITY_MODIFIER_KEYS.map((mod) => (
                <option key={mod} value={mod}>
                  {mod} Modifier
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">Uses = selected ability modifier (min 1)</p>
          </div>
        )}

        {value.type === "custom_ability" && (
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Copy Uses From</label>
            <select
              value={value.customAbilityId || ""}
              onChange={(e) => onChange({ ...value, customAbilityId: e.target.value })}
              className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">Select ability...</option>
              {otherAbilities.map((ability) => (
                <option key={ability.id} value={ability.id}>
                  {ability.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {value.type === "at_level" && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-foreground">Uses by Level</label>
            <button
              type="button"
              onClick={() => {
                const table = value.atLevelTable || []
                const nextLevel = table.length > 0 ? Math.max(...table.map((t) => t.level)) + 1 : 1
                onChange({
                  ...value,
                  atLevelTable: [...table, { level: Math.min(nextLevel, 20), count: 1 }],
                })
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20"
            >
              <Plus className="w-3 h-3" />
              Add Row
            </button>
          </div>
          <div className="space-y-2">
            {(value.atLevelTable || []).map((row, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-16">At level</span>
                <select
                  value={row.level}
                  onChange={(e) => {
                    const table = [...(value.atLevelTable || [])]
                    table[idx] = { ...row, level: parseInt(e.target.value, 10) }
                    onChange({ ...value, atLevelTable: table })
                  }}
                  className="w-20 px-2 py-1.5 bg-background border border-border rounded-lg text-sm"
                >
                  {LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-muted-foreground">uses:</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={row.count}
                  onChange={(e) => {
                    const table = [...(value.atLevelTable || [])]
                    table[idx] = { ...row, count: parseInt(e.target.value, 10) || 1 }
                    onChange({ ...value, atLevelTable: table })
                  }}
                  className="w-16 px-2 py-1.5 bg-background border border-border rounded-lg text-sm text-center"
                />
                <button
                  type="button"
                  onClick={() => {
                    const table = (value.atLevelTable || []).filter((_, i) => i !== idx)
                    onChange({ ...value, atLevelTable: table })
                  }}
                  className="p-1 text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {(value.atLevelTable?.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground italic">Add rows to define uses at each level</p>
            )}
          </div>
        </div>
      )}

      {value.type !== "unlimited" && value.type !== "class_resource" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Recharges On</label>
            <select
              value={value.recharge || ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  recharge: (e.target.value as UsesConfig["recharge"]) || null,
                })
              }
              className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">No recharge</option>
              <option value="short_rest">Short Rest</option>
              <option value="long_rest">Long Rest</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Die Count</label>
            <input
              type="number"
              min={0}
              max={20}
              value={value.dieCount ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  dieCount: e.target.value ? parseInt(e.target.value, 10) : undefined,
                })
              }
              className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
              placeholder="e.g. 2"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Die Type</label>
            <select
              value={value.dieType || ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  dieType: (e.target.value as UsesConfig["dieType"]) || null,
                })
              }
              className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">None</option>
              {DIE_TYPES.map((die) => (
                <option key={die} value={die}>
                  {die}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
