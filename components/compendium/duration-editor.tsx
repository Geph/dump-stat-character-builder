"use client"

import { FEATURE_DURATION_OPTIONS } from "@/lib/compendium/feature-duration"
import type { FeatureDurationKey } from "@/lib/types"

type DurationEditorProps = {
  value: FeatureDurationKey | null | undefined
  onChange: (value: FeatureDurationKey | null) => void
}

export function DurationEditor({ value, onChange }: DurationEditorProps) {
  const enabled = Boolean(value)

  return (
    <div className="pt-2 border-t border-border space-y-3">
      <label className="flex items-center gap-2 cursor-pointer text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) =>
            onChange(e.target.checked ? (value ?? "1_round") : null)
          }
          className="w-4 h-4 rounded border-border accent-primary"
        />
        <span className="font-semibold text-foreground">Has duration</span>
      </label>
      {enabled && (
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Duration</label>
          <select
            value={value ?? "1_round"}
            onChange={(e) => onChange(e.target.value as FeatureDurationKey)}
            className="w-full max-w-md px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            {FEATURE_DURATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
