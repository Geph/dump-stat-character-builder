"use client"

import { useEffect, useRef, useState } from "react"
import { Heart, Pencil, X } from "lucide-react"
import { SRD_CONDITIONS } from "@/lib/srd/condition-descriptions"

export type CompanionHpPool = {
  key: string
  label: string
  /** True when `label` is a player rename rather than the default "Skeleton 2". */
  renamed: boolean
  currentHp: number
  maxHp: number
  tempHp: number
  activeConditions: string[]
  onHpChange: (hp: number) => void
  onConditionsChange?: (conditions: string[]) => void
  onNameChange?: (name: string | null) => void
}

const POOL_CONDITIONS = SRD_CONDITIONS.slice(0, 8).map((condition) => condition.name)

function PoolRow({ pool }: { pool: CompanionHpPool }) {
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(pool.label)
  const inputRef = useRef<HTMLInputElement>(null)
  const skipBlur = useRef(false)
  const down = pool.currentHp <= 0

  useEffect(() => {
    if (renaming) inputRef.current?.focus()
  }, [renaming])

  const commit = () => {
    if (skipBlur.current) {
      skipBlur.current = false
      return
    }
    pool.onNameChange?.(draft.trim() || null)
    setRenaming(false)
  }

  const addCondition = (condition: string) => {
    if (!condition || pool.activeConditions.includes(condition)) return
    pool.onConditionsChange?.([...pool.activeConditions, condition])
  }

  const removeCondition = (condition: string) => {
    pool.onConditionsChange?.(pool.activeConditions.filter((entry) => entry !== condition))
  }

  return (
    <li
      className={`rounded-lg border px-2 py-1 ${
        down ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/40"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <div className="flex min-w-0 items-center gap-1">
          {renaming ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  commit()
                }
                if (event.key === "Escape") {
                  event.preventDefault()
                  skipBlur.current = true
                  setDraft(pool.label)
                  setRenaming(false)
                }
              }}
              aria-label="Hit point pool name"
              className="min-w-0 w-full bg-background border border-border rounded px-1.5 py-0.5 text-xs font-bold"
            />
          ) : (
            <p className={`truncate text-xs font-bold ${down ? "text-destructive line-through" : "text-foreground"}`}>
              {pool.label}
            </p>
          )}
          {pool.onNameChange && !renaming ? (
            <button
              type="button"
              onClick={() => {
                skipBlur.current = false
                setDraft(pool.label)
                setRenaming(true)
              }}
              title="Rename"
              aria-label={`Rename ${pool.label}`}
              className="shrink-0 p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <Pencil className="w-3 h-3" />
            </button>
          ) : null}
        </div>
        {pool.onConditionsChange ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            {pool.activeConditions.map((condition) => (
              <button
                key={condition}
                type="button"
                onClick={() => removeCondition(condition)}
                aria-label={`Remove ${condition} from ${pool.label}`}
                className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold border border-destructive/50 bg-destructive/15 text-destructive"
              >
                {condition}
                <X className="w-2.5 h-2.5" />
              </button>
            ))}
            <select
              value=""
              onChange={(event) => addCondition(event.target.value)}
              aria-label={`Add condition to ${pool.label}`}
              className="rounded border border-border bg-background px-1 py-0.5 text-[9px] text-muted-foreground"
            >
              <option value="">+ Condition</option>
              {POOL_CONDITIONS.filter((condition) => !pool.activeConditions.includes(condition)).map(
                (condition) => (
                  <option key={condition} value={condition}>
                    {condition}
                  </option>
                ),
              )}
            </select>
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Heart className={`w-3 h-3 ${down ? "text-muted-foreground" : "text-red-500"}`} />
          <input
            type="number"
            min={0}
            max={pool.maxHp}
            value={pool.currentHp}
            onChange={(event) => pool.onHpChange(parseInt(event.target.value, 10) || 0)}
            aria-label={`${pool.label} hit points`}
            className="w-11 text-center bg-background border border-border rounded px-1 py-0.5 text-sm font-bold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="text-[10px] text-muted-foreground tabular-nums">/ {pool.maxHp}</span>
          {pool.tempHp > 0 ? (
            <span className="text-[9px] font-semibold text-primary tabular-nums">+{pool.tempHp}</span>
          ) : null}
        </div>
      </div>
    </li>
  )
}

/** One hit point pool per copy of a shared stat block (e.g. each animated Skeleton). */
export function CompanionHpPools({ pools }: { pools: CompanionHpPool[] }) {
  const standing = pools.filter((pool) => pool.currentHp > 0).length
  return (
    <div className="px-3 py-2 border-b border-border space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase font-bold text-muted-foreground">Hit point pools</p>
        <p className="text-[10px] font-semibold text-muted-foreground tabular-nums">
          {standing} of {pools.length} standing
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-1.5">
        {pools.map((pool) => (
          <PoolRow key={pool.key} pool={pool} />
        ))}
      </ul>
    </div>
  )
}
