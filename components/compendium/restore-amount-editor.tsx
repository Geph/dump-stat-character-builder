"use client"

import {
  ABILITY_MODIFIER_KEYS,
  type AbilityModifierKey,
} from "@/lib/compendium/characteristic-modifiers"
import type { RestoreAmountConfig, RestoreAmountMode } from "@/lib/compendium/restore-amount-config"

type RestoreAmountEditorProps = {
  value: RestoreAmountConfig | "full"
  onChange: (value: RestoreAmountConfig | "full") => void
  label?: string
  allowFull?: boolean
}

export function RestoreAmountEditor({
  value,
  onChange,
  label = "Uses restored",
  allowFull = true,
}: RestoreAmountEditorProps) {
  const mode: RestoreAmountMode = value === "full" ? "full" : value.mode
  const config: RestoreAmountConfig =
    value === "full" ? { mode: "fixed", amount: 1 } : value

  const setMode = (next: RestoreAmountMode) => {
    if (next === "full") {
      onChange("full")
      return
    }
    if (next === "fixed") {
      onChange({ mode: "fixed", amount: config.amount && config.amount > 0 ? config.amount : 1 })
      return
    }
    if (next === "proficiency") {
      onChange({
        mode: "proficiency",
        amount: config.mode === "fixed" ? null : config.amount,
        minimum: config.minimum ?? null,
      })
      return
    }
    onChange({
      mode: "ability_modifier",
      ability: config.ability ?? "INT",
      amount: config.mode === "fixed" ? null : config.amount,
      minimum: config.minimum ?? 1,
    })
  }

  const patch = (partial: Partial<RestoreAmountConfig>) => {
    if (value === "full") return
    onChange({ ...value, ...partial })
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-foreground">{label}</label>
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value as RestoreAmountMode)}
        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
      >
        {allowFull ? <option value="full">Full pool</option> : null}
        <option value="fixed">Fixed number</option>
        <option value="proficiency">Proficiency bonus</option>
        <option value="ability_modifier">Ability modifier</option>
      </select>

      {mode === "fixed" && (
        <input
          type="number"
          min={1}
          max={99}
          value={config.amount ?? 1}
          onChange={(e) =>
            patch({ amount: e.target.value ? parseInt(e.target.value, 10) : 1 })
          }
          className="w-full max-w-[8rem] px-3 py-2 bg-background border border-border rounded-lg text-sm"
        />
      )}

      {mode === "ability_modifier" && (
        <select
          value={config.ability ?? "INT"}
          onChange={(e) =>
            patch({ ability: (e.target.value || "INT") as AbilityModifierKey })
          }
          className="w-full max-w-xs px-3 py-2 bg-background border border-border rounded-lg text-sm"
        >
          {ABILITY_MODIFIER_KEYS.map((key) => (
            <option key={key} value={key}>
              {key} modifier
            </option>
          ))}
        </select>
      )}

      {(mode === "proficiency" || mode === "ability_modifier") && (
        <div className="grid grid-cols-2 gap-2 max-w-sm">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">± bonus</label>
            <input
              type="number"
              value={config.amount ?? 0}
              onChange={(e) =>
                patch({
                  amount: e.target.value === "" || e.target.value === "0"
                    ? null
                    : parseInt(e.target.value, 10),
                })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Minimum</label>
            <input
              type="number"
              min={0}
              value={config.minimum ?? ""}
              onChange={(e) =>
                patch({
                  minimum: e.target.value === "" ? null : parseInt(e.target.value, 10),
                })
              }
              placeholder="None"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            />
          </div>
        </div>
      )}
    </div>
  )
}
