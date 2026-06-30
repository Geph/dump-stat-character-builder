"use client"

import { useEffect, useRef, useState } from "react"

type ClassLevelInputProps = {
  value: number
  /** Minimum allowed level (defaults to 1). */
  min?: number
  /** Maximum allowed level (e.g. 20 minus other classes' levels). */
  max: number
  /** Called with the clamped level when the user commits (Enter or blur). */
  onCommit: (level: number) => void
  className?: string
  "aria-label"?: string
}

/**
 * Inline, directly-editable level field for a class row. The player can type a
 * number and press Enter (or blur) to set the level. Typing is free-form while
 * focused; the committed value is always clamped to [min, max].
 */
export function ClassLevelInput({
  value,
  min = 1,
  max,
  onCommit,
  className,
  "aria-label": ariaLabel,
}: ClassLevelInputProps) {
  const [draft, setDraft] = useState(String(value))
  const focusedRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep the field in sync with external changes (e.g. the +/- buttons) while
  // the user isn't actively editing it.
  useEffect(() => {
    if (!focusedRef.current) setDraft(String(value))
  }, [value])

  const commit = () => {
    const parsed = Number.parseInt(draft, 10)
    if (Number.isNaN(parsed)) {
      setDraft(String(value))
      return
    }
    const clamped = Math.max(min, Math.min(max, parsed))
    setDraft(String(clamped))
    if (clamped !== value) onCommit(clamped)
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      aria-label={ariaLabel}
      value={draft}
      onFocus={(e) => {
        focusedRef.current = true
        e.currentTarget.select()
      }}
      onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          commit()
          inputRef.current?.blur()
        } else if (e.key === "Escape") {
          e.preventDefault()
          setDraft(String(value))
          inputRef.current?.blur()
        }
      }}
      onBlur={() => {
        focusedRef.current = false
        commit()
      }}
      className={className}
    />
  )
}
