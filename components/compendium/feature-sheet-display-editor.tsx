"use client"

import type { Feature, FeatureSheetDisplay } from "@/lib/types"
import { resolveFeatureSheetDisplay } from "@/lib/compendium/feature-sheet-display"

const SHEET_DISPLAY_OPTIONS: {
  key: keyof FeatureSheetDisplay
  label: string
  hint: string
}[] = [
  {
    key: "abilitiesActions",
    label: "Abilities tab actions",
    hint: "Quick-use card on Abilities & Skills",
  },
  {
    key: "combatActions",
    label: "Combat tab actions",
    hint: "Quick-use card on Combat",
  },
  {
    key: "featuresTab",
    label: "Features tab",
    hint: "Reference card on Features",
  },
]

type FeatureSheetDisplayEditorProps = {
  feature: Feature
  onChange: (sheetDisplay: FeatureSheetDisplay) => void
}

export function FeatureSheetDisplayEditor({ feature, onChange }: FeatureSheetDisplayEditorProps) {
  const display = resolveFeatureSheetDisplay(feature)

  const setFlag = (key: keyof FeatureSheetDisplay, checked: boolean) => {
    onChange({
      ...display,
      [key]: checked,
    })
  }

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Show on character sheet
        </p>
        <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
          Any combination can be enabled or left off.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3">
        {SHEET_DISPLAY_OPTIONS.map(({ key, label, hint }) => (
          <label key={key} className="flex items-start gap-2 cursor-pointer text-sm min-w-0">
            <input
              type="checkbox"
              checked={display[key]}
              onChange={(e) => setFlag(key, e.target.checked)}
              className="mt-0.5 w-4 h-4 shrink-0 rounded border-border accent-primary"
            />
            <span>
              <span className="text-muted-foreground leading-snug">{label}</span>
              <span className="block text-[11px] text-muted-foreground/80 leading-snug">{hint}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
