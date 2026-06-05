"use client"

import { useEffect, useState } from "react"
import { compendiumFieldClass } from "@/lib/compendium/editor-field-styles"

export const DROPDOWN_OTHER_VALUE = "__other__"

type Option = { value: string; label: string }

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  options: Option[]
  otherPlaceholder?: string
}

function matchOption(value: string, options: Option[]): Option | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return options.find((o) => o.value.toLowerCase() === trimmed.toLowerCase())
}

function pickFromValue(value: string, options: Option[]): string {
  const matched = matchOption(value, options)
  if (matched) return matched.value
  if (value.trim()) return DROPDOWN_OTHER_VALUE
  return ""
}

export function DropdownOrOtherField({
  label,
  value,
  onChange,
  options,
  otherPlaceholder = "Custom value",
}: Props) {
  const [pick, setPick] = useState(() => pickFromValue(value, options))

  useEffect(() => {
    setPick(pickFromValue(value, options))
  }, [value, options])

  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-2">{label}</label>
      <select
        value={pick}
        onChange={(e) => {
          const next = e.target.value
          setPick(next)
          if (next === DROPDOWN_OTHER_VALUE) {
            onChange(matchOption(value, options) ? "" : value)
          } else if (next) {
            onChange(next)
          } else {
            onChange("")
          }
        }}
        className={`${compendiumFieldClass} mb-2`}
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        <option value={DROPDOWN_OTHER_VALUE}>Other...</option>
      </select>
      {pick === DROPDOWN_OTHER_VALUE && (
        <input
          type="text"
          value={matchOption(value, options) ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={otherPlaceholder}
          className={compendiumFieldClass}
        />
      )}
    </div>
  )
}
