"use client"

import { useEffect, useState } from "react"
import {
  listCompendiumSubclassMatchOptions,
  type CompendiumSubclassMatchOption,
} from "@/lib/compendium/list-compendium-subclasses"
import { Loader2 } from "lucide-react"

export type ImportSubclassMatchValue = {
  id: string
  name: string
  className: string
}

type ImportSubclassMatchSelectProps = {
  value: ImportSubclassMatchValue | null
  onChange: (value: ImportSubclassMatchValue | null) => void
  focusRingClassName?: string
  /** When false, options are not loaded and the control is hidden by the parent. */
  enabled?: boolean
}

export function ImportSubclassMatchSelect({
  value,
  onChange,
  focusRingClassName = "focus:ring-primary",
  enabled = true,
}: ImportSubclassMatchSelectProps) {
  const [options, setOptions] = useState<CompendiumSubclassMatchOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setOptions([])
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    void listCompendiumSubclassMatchOptions()
      .then((next) => {
        if (!cancelled) setOptions(next)
      })
      .catch((err) => {
        if (cancelled) return
        setOptions([])
        setError(err instanceof Error ? err.message : "Could not load subclasses.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [enabled])

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2 items-center">
        <label
          htmlFor="import-subclass-match"
          className="text-sm font-medium text-muted-foreground"
        >
          Match subclass (optional):
        </label>
        <select
          id="import-subclass-match"
          value={value?.id ?? ""}
          onChange={(event) => {
            const id = event.target.value
            if (!id) {
              onChange(null)
              return
            }
            const option = options.find((entry) => entry.id === id)
            onChange(
              option ? { id: option.id, name: option.name, className: option.className } : null,
            )
          }}
          disabled={loading}
          className={`px-3 py-1.5 bg-muted rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 ${focusRingClassName} max-w-[min(100%,22rem)]`}
        >
          <option value="">None — detect from source</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name} ({option.className})
            </option>
          ))}
        </select>
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden />
        ) : null}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
