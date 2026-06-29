"use client"

import {
  ABILITY_MODIFIER_KEYS,
  type AbilityModifierKey,
} from "@/lib/compendium/characteristic-modifiers"
import {
  defaultRollBonusConfig,
  ROLL_BONUS_MODE_LABELS,
  type RollBonusConfig,
  type RollBonusMode,
} from "@/lib/compendium/roll-bonus-config"
import type { ClassResource } from "@/lib/types"

const DIE_TYPES = ["d4", "d6", "d8", "d10", "d12", "d20"] as const

type RollBonusEditorProps = {
  value: RollBonusConfig | null | undefined
  onChange: (value: RollBonusConfig | null) => void
  classResources?: ClassResource[]
  label?: string
  allowDie?: boolean
}

export function RollBonusEditor({
  value,
  onChange,
  classResources = [],
  label = "Bonus amount",
  allowDie = true,
}: RollBonusEditorProps) {
  const config = value ?? defaultRollBonusConfig("fixed")
  const mode = config.mode

  const setMode = (nextMode: RollBonusMode) => {
    onChange(defaultRollBonusConfig(nextMode))
  }

  const patch = (partial: Partial<RollBonusConfig>) => {
    onChange({ ...config, ...partial })
  }

  const modes = (
    Object.entries(ROLL_BONUS_MODE_LABELS) as [RollBonusMode, string][]
  ).filter(([key]) => allowDie || key !== "die")

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/50 p-3">
      <label className="block text-xs font-semibold text-foreground">{label}</label>
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value as RollBonusMode)}
        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
      >
        {modes.map(([key, modeLabel]) => (
          <option key={key} value={key}>
            {modeLabel}
          </option>
        ))}
      </select>

      {mode === "fixed" && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Amount</label>
          <input
            type="number"
            value={config.fixed ?? ""}
            onChange={(e) =>
              patch({ fixed: e.target.value === "" ? null : parseInt(e.target.value, 10) })
            }
            className="w-full max-w-[8rem] px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
        </div>
      )}

      {mode === "multiplier" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Multiplier</label>
            <input
              type="number"
              step="0.1"
              min={0}
              value={config.multiplier ?? 1}
              onChange={(e) =>
                patch({ multiplier: e.target.value === "" ? null : parseFloat(e.target.value) })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">Fractions round down (e.g. 0.5 × prof).</p>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Based on</label>
            <select
              value={config.ability ? "ability" : "proficiency"}
              onChange={(e) =>
                patch({
                  ability:
                    e.target.value === "ability"
                      ? (config.ability ?? "CHA")
                      : null,
                })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            >
              <option value="proficiency">Proficiency bonus</option>
              <option value="ability">Ability modifier</option>
            </select>
          </div>
          {config.ability && (
            <div className="sm:col-span-2">
              <label className="block text-xs text-muted-foreground mb-1">Ability</label>
              <select
                value={config.ability ?? ""}
                onChange={(e) =>
                  patch({ ability: (e.target.value || null) as AbilityModifierKey | null })
                }
                className="w-full max-w-xs px-3 py-2 bg-background border border-border rounded-lg text-sm"
              >
                {ABILITY_MODIFIER_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {mode === "ability_modifier" && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Ability</label>
          <select
            value={config.ability ?? ""}
            onChange={(e) =>
              patch({ ability: (e.target.value || null) as AbilityModifierKey | null })
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
        <p className="text-xs text-muted-foreground">Bonus equals the character&apos;s proficiency bonus.</p>
      )}

      {mode === "character_level" && (
        <p className="text-xs text-muted-foreground">Bonus equals the character&apos;s level.</p>
      )}

      {mode === "spell_attack" && (
        <p className="text-xs text-muted-foreground">
          Bonus equals the character&apos;s spell attack modifier (ability + proficiency).
        </p>
      )}

      {mode === "die" && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Die source</label>
            <select
              value={config.dieScaling ?? "fixed"}
              onChange={(e) =>
                patch({
                  dieScaling: e.target.value as RollBonusConfig["dieScaling"],
                  classResourceKey: e.target.value === "class_resource" ? config.classResourceKey : null,
                })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            >
              <option value="fixed">Fixed die (d4–d12)</option>
              <option value="by_level">Die scales by character level</option>
              <option value="class_resource">Class resource die (e.g. Bardic Inspiration)</option>
            </select>
          </div>
          {config.dieScaling === "class_resource" ? (
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Class resource</label>
              {classResources.length > 0 ? (
                <select
                  value={config.classResourceKey ?? ""}
                  onChange={(e) => patch({ classResourceKey: e.target.value || null })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
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
                  value={config.classResourceKey ?? ""}
                  onChange={(e) =>
                    patch({
                      classResourceKey:
                        e.target.value.trim().replace(/\s+/g, "_").toLowerCase() || null,
                    })
                  }
                  placeholder="bardic_inspiration"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono"
                />
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Dice count</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={config.dieCount ?? 1}
                  onChange={(e) =>
                    patch({ dieCount: e.target.value ? parseInt(e.target.value, 10) : 1 })
                  }
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Die type</label>
                <select
                  value={config.dieType ?? "d6"}
                  onChange={(e) =>
                    patch({ dieType: (e.target.value || null) as RollBonusConfig["dieType"] })
                  }
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                >
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
      )}

      <ResultFloorEditor config={config} onPatch={patch} />
    </div>
  )
}

function ResultFloorEditor({
  config,
  onPatch,
}: {
  config: RollBonusConfig
  onPatch: (partial: Partial<RollBonusConfig>) => void
}) {
  const floor = config.resultFloor ?? { mode: "none" as const }
  // "Min +1" is a quick preset of the fixed floor (result can't drop below 1).
  const selectValue =
    floor.mode === "fixed" && floor.fixed === 1 ? "min_one" : floor.mode

  return (
    <div className="pt-2 border-t border-border space-y-2">
      <label className="block text-xs font-semibold text-foreground">Minimum result</label>
      <select
        value={selectValue}
        onChange={(e) => {
          const value = e.target.value
          onPatch({
            resultFloor:
              value === "none"
                ? { mode: "none" }
                : value === "min_one"
                  ? { mode: "fixed", fixed: 1 }
                  : value === "fixed"
                    ? { mode: "fixed", fixed: 10 }
                    : { mode: "ability", ability: "INT" },
          })
        }}
        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
      >
        <option value="none">No minimum</option>
        <option value="min_one">Min +1 (result at least 1)</option>
        <option value="fixed">Cannot be less than a number</option>
        <option value="ability">Cannot be less than ability score</option>
      </select>
      {selectValue === "fixed" && (
        <input
          type="number"
          min={1}
          value={floor.fixed ?? 10}
          onChange={(e) =>
            onPatch({
              resultFloor: {
                mode: "fixed",
                fixed: e.target.value ? parseInt(e.target.value, 10) : null,
              },
            })
          }
          className="w-full max-w-[8rem] px-3 py-2 bg-background border border-border rounded-lg text-sm"
        />
      )}
      {floor.mode === "ability" && (
        <select
          value={floor.ability ?? "INT"}
          onChange={(e) =>
            onPatch({
              resultFloor: {
                mode: "ability",
                ability: (e.target.value || "INT") as AbilityModifierKey,
              },
            })
          }
          className="w-full max-w-xs px-3 py-2 bg-background border border-border rounded-lg text-sm"
        >
          {ABILITY_MODIFIER_KEYS.map((key) => (
            <option key={key} value={key}>
              {key} score
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
