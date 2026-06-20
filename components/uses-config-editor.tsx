"use client"

import { Plus, X } from "lucide-react"
import type { ClassResource, RestType, UsesConfig } from "@/lib/types"
import { ABILITY_MODIFIER_KEYS } from "@/lib/compendium/characteristic-modifiers"
import {
  getRechargeAmount,
  isRestRechargeEnabled,
  setRestRecharge,
  updateRestRechargeAmount,
} from "@/lib/compendium/normalize-uses-config"

const DIE_TYPES = ["d4", "d6", "d8", "d10", "d12", "d20"] as const
const LEVELS = Array.from({ length: 20 }, (_, i) => i + 1)
const REST_TYPES: { rest: RestType; label: string }[] = [
  { rest: "short_rest", label: "Short Rest" },
  { rest: "long_rest", label: "Long Rest" },
]

type UsesConfigEditorProps = {
  value: UsesConfig
  onChange: (value: UsesConfig) => void
  otherAbilities?: { id: string; name: string }[]
  classResources?: ClassResource[]
}

function RechargeRulesEditor({
  value,
  onChange,
}: {
  value: UsesConfig
  onChange: (value: UsesConfig) => void
}) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-foreground">Recharges On</label>
      {REST_TYPES.map(({ rest, label }) => {
        const enabled = isRestRechargeEnabled(value, rest)
        const amount = getRechargeAmount(value, rest)

        return (
          <div key={rest} className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer min-w-[8rem]">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => onChange(setRestRecharge(value, rest, e.target.checked))}
                className="accent-primary"
              />
              {label}
            </label>
            {enabled && (
              <>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={amount ?? ""}
                  onChange={(e) =>
                    onChange(
                      updateRestRechargeAmount(
                        value,
                        rest,
                        e.target.value ? parseInt(e.target.value, 10) : null,
                      ),
                    )
                  }
                  placeholder="All uses"
                  className="w-28 px-3 py-2 bg-background border-2 border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary"
                />
                <span className="text-xs text-muted-foreground">uses restored (empty = full pool)</span>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function UsesConfigEditor({
  value,
  onChange,
  otherAbilities = [],
  classResources = [],
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
                classResourceKey: undefined,
                classResourceAmount: undefined,
                specialDescription: undefined,
                atLevelTable: undefined,
                atLevelMode: undefined,
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
            <option value="special">Special (custom description)</option>
          </select>
        </div>

        {value.type === "special" && (
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-foreground mb-2">Uses description</label>
            <textarea
              value={value.specialDescription ?? ""}
              onChange={(e) => onChange({ ...value, specialDescription: e.target.value || undefined })}
              rows={3}
              placeholder="e.g. Once per 7 days when using Divine Intervention, cast any Cleric spell of 6th level or lower without a slot"
              className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              For abilities whose uses don&apos;t fit fixed counts or class resources (Greater Divine Intervention, percentile rolls, etc.).
            </p>
          </div>
        )}

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

        {value.type === "class_resource" && (
          <>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Class resource</label>
              {classResources.length > 0 ? (
                <select
                  value={value.classResourceKey || ""}
                  onChange={(e) => onChange({ ...value, classResourceKey: e.target.value || undefined })}
                  className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">Select resource...</option>
                  {classResources.map((resource) => (
                    <option key={resource.id} value={resource.id}>
                      {resource.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-muted-foreground italic px-1">
                  No class resources defined yet — add them in the Class Resources section of the class editor.
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                This feature spends uses from the selected pool (e.g. Second Wind uses no separate pool; Rage uses the Rage pool).
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Uses spent per activation</label>
              <input
                type="number"
                min={1}
                max={99}
                value={value.classResourceAmount ?? 1}
                onChange={(e) =>
                  onChange({
                    ...value,
                    classResourceAmount: e.target.value ? parseInt(e.target.value, 10) : 1,
                  })
                }
                className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </>
        )}
      </div>

      {value.type === "at_level" && (
        <div className="mb-4">
          <label className="block text-sm font-semibold text-foreground mb-2">Level scaling</label>
          <select
            value={value.atLevelMode ?? "tier"}
            onChange={(e) =>
              onChange({
                ...value,
                atLevelMode: e.target.value as UsesConfig["atLevelMode"],
              })
            }
            className="w-full max-w-md px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
          >
            <option value="tier">Tier table (uses count at each breakpoint)</option>
            <option value="multiply_level">Character level × multiplier</option>
          </select>
          {value.atLevelMode === "multiply_level" && (
            <p className="text-xs text-muted-foreground mt-1">
              Uses = character level × the count value (e.g. Monk Focus = level × 1, Lay on Hands = level × 5).
            </p>
          )}
        </div>
      )}

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
              <p className="text-sm text-muted-foreground italic">
                {value.atLevelMode === "multiply_level"
                  ? "Add one row with the per-level multiplier (e.g. count 5 for Lay on Hands)."
                  : "Add rows to define uses at each level tier."}
              </p>
            )}
          </div>
        </div>
      )}

      {value.type !== "unlimited" && value.type !== "class_resource" && value.type !== "special" && (
        <div className="space-y-4 pt-2 border-t border-border">
          <RechargeRulesEditor value={value} onChange={onChange} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Resource Die Count</label>
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
              <label className="block text-sm font-semibold text-foreground mb-2">Resource Die Type</label>
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
        </div>
      )}
    </div>
  )
}

