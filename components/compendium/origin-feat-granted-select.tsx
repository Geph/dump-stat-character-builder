"use client"

import {
  backgroundOriginFeatSelectOptions,
} from "@/lib/compendium/background-origin-feat"

type OriginFeatGrantedSelectProps = {
  value: string
  onChange: (value: string) => void
  originFeats: { id: string; name: string }[]
  className?: string
}

export function OriginFeatGrantedSelect({
  value,
  onChange,
  originFeats,
  className,
}: OriginFeatGrantedSelectProps) {
  const options = backgroundOriginFeatSelectOptions(originFeats)
  const hasCurrentValue = !value || options.some((option) => option.value === value)

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={
        className ??
        "w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
      }
    >
      <option value="">None / Custom</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
      {!hasCurrentValue && value ? (
        <option value={value}>{value}</option>
      ) : null}
    </select>
  )
}
