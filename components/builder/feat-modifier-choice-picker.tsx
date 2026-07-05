"use client"

import { MultiSelectChoices } from "@/components/builder/multi-select-choices"
import type { FeatSelectionEntry } from "@/lib/builder/feat-choices"
import type { Feat } from "@/lib/types"

type FeatModifierChoicePickerProps = {
  entry: FeatSelectionEntry
  feat: Feat
  selected: string[]
  onChange: (selected: string[]) => void
  accentClass?: string
  layout?: "default" | "compact"
}

export function FeatModifierChoicePicker({
  entry,
  feat,
  selected,
  onChange,
  accentClass = "border-primary bg-primary/10",
  layout = "default",
}: FeatModifierChoicePickerProps) {
  if (!feat.choices?.options?.length) return null

  return (
    <MultiSelectChoices
      title={`${feat.name}: ${feat.choices.category || "Choose a benefit"}`}
      hint={`Choose ${feat.choices.count}`}
      options={feat.choices.options.map((option) => ({
        name: option.name,
        description: option.description,
      }))}
      maxCount={feat.choices.count}
      selected={selected}
      onChange={onChange}
      accentClass={accentClass}
      layout={layout}
    />
  )
}
