"use client"

import { motion } from "framer-motion"
import { Flame, Moon, Sun, X } from "lucide-react"
import { ShortRestHitDiceBox } from "@/components/character-sheet/short-rest-hit-dice-box"
import type { HitDicePoolEntry } from "@/lib/character/hit-dice"
import type { RestHitDiceRestoreActivity } from "@/lib/character/sheet-rest"
import type { Feature, RestType } from "@/lib/types"

export type LongRestWeaponMasteryChoice = {
  key: string
  className: string
  feature: Feature
  classLevel: number
  picks: string[]
  count: number
}

type SheetRestOverlayProps = {
  rest: RestType
  summary: string[]
  onClose: () => void
  /** Short rest only — spend Hit Dice after the rest (SRD). */
  hitDicePool?: HitDicePoolEntry[]
  conMod?: number
  currentHp?: number
  maxHp?: number
  onHeal?: (amount: number) => void
  onSpendDice?: (classId: string, count: number) => void
  /** Short/long rest choice features that restore expended Hit Point Dice. */
  hitDiceRestoreActivities?: RestHitDiceRestoreActivity[]
  expendedHitDice?: number
  onUseHitDiceRestore?: (activity: RestHitDiceRestoreActivity) => void
  /** Long rest — swap known Weapon Mastery weapon types. */
  weaponMasteryChoices?: LongRestWeaponMasteryChoice[]
  onWeaponMasteryChange?: (key: string, next: string[]) => void
  extraWeaponMasteryChoices?: {
    equipmentId: string
    weaponName: string
    slotCount: number
    picks: string[]
    options: { name: string }[]
  }[]
  onExtraWeaponMasteryChange?: (equipmentId: string, next: string[]) => void
}

export function SheetRestOverlay({
  rest,
  summary,
  onClose,
  hitDicePool = [],
  conMod = 0,
  currentHp = 0,
  maxHp = 0,
  onHeal,
  onSpendDice,
  hitDiceRestoreActivities = [],
  expendedHitDice = 0,
  onUseHitDiceRestore,
  weaponMasteryChoices = [],
  onWeaponMasteryChange,
  extraWeaponMasteryChoices = [],
  onExtraWeaponMasteryChange,
}: SheetRestOverlayProps) {
  const isShort = rest === "short_rest"
  const title = isShort ? "Short Rest" : "Long Rest"
  const showHitDice =
    isShort && hitDicePool.length > 0 && onHeal && onSpendDice && currentHp < maxHp
  const showWeaponMastery =
    !isShort && weaponMasteryChoices.length > 0 && onWeaponMasteryChange
  const showExtraWeaponMastery =
    !isShort && extraWeaponMasteryChoices.length > 0 && onExtraWeaponMasteryChange

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheet-rest-title"
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-xl border-2 border-primary/40 bg-card p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-3 flex items-center gap-2 pr-8">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
            {isShort ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </span>
          <div>
            <p id="sheet-rest-title" className="text-base font-black text-foreground">
              {title} complete
            </p>
            <p className="text-xs text-muted-foreground">
              {isShort
                ? "Short-rest resources and pact slots recharge."
                : "HP, spell slots, and long-rest resources restore."}
            </p>
          </div>
        </div>

        {summary.length > 0 ? (
          <ul className="mb-4 space-y-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            {summary.map((line, index) => (
              <li key={`${index}-${line}`} className="text-sm text-foreground">
                {line}
              </li>
            ))}
          </ul>
        ) : null}

        {hitDiceRestoreActivities.length > 0 && onUseHitDiceRestore ? (
          <div className="mb-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              Restore Hit Dice
            </p>
            {hitDiceRestoreActivities.map((activity) => {
              const exhausted = activity.max != null && activity.used >= activity.max
              const noExpended = expendedHitDice <= 0
              const disabled = exhausted || noExpended
              const remaining =
                activity.max != null ? Math.max(0, activity.max - activity.used) : null
              return (
                <div
                  key={activity.actionId}
                  className="space-y-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{activity.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Regain up to {activity.amount} expended Hit Point Dice
                      {remaining != null ? ` · ${remaining} / ${activity.max} remaining` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onUseHitDiceRestore(activity)}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {exhausted
                      ? "Already used"
                      : noExpended
                        ? "No expended Hit Dice"
                        : `Use ${activity.name}`}
                  </button>
                </div>
              )
            })}
          </div>
        ) : null}

        {showHitDice ? (
          <div className="mb-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
              Spend Hit Dice
            </p>
            <p className="text-[11px] text-muted-foreground">
              At the end of a Short Rest you may spend Hit Dice to regain hit points (roll the die +
              your Constitution modifier per die).
            </p>
            <ShortRestHitDiceBox
              pool={hitDicePool}
              conMod={conMod}
              currentHp={currentHp}
              maxHp={maxHp}
              onHeal={onHeal}
              onSpendDice={onSpendDice}
            />
          </div>
        ) : null}

        {showWeaponMastery ? (
          <div className="mb-4 space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                Weapon Mastery
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                When you finish a Long Rest, you can change your known weapon types.
              </p>
            </div>
            {weaponMasteryChoices.map((entry) => {
              const options = entry.feature.choices?.options ?? []
              const setSlot = (index: number, value: string) => {
                const next = [...entry.picks]
                if (value) next[index] = value
                else next.splice(index, 1)
                onWeaponMasteryChange(entry.key, next.filter(Boolean))
              }
              return (
                <div key={entry.key} className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-foreground">
                    {entry.className}
                    <span className="ml-1 font-normal text-muted-foreground">
                      · {entry.count} known
                    </span>
                  </p>
                  {Array.from({ length: entry.count }).map((_, index) => (
                    <select
                      key={`${entry.key}-${index}`}
                      value={entry.picks[index] ?? ""}
                      onChange={(event) => setSlot(index, event.target.value)}
                      className="w-full rounded-md border border-border bg-card px-2.5 py-2 text-xs"
                    >
                      <option value="">Choose…</option>
                      {options.map((option) => (
                        <option key={option.name} value={option.name}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  ))}
                </div>
              )
            })}
          </div>
        ) : null}

        {showExtraWeaponMastery ? (
          <div className="mb-4 space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                Masterwork mastery properties
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                After a Long Rest you can change extra mastery properties on each Masterwork weapon.
                The weapon must meet the property&apos;s prerequisites.
              </p>
            </div>
            {extraWeaponMasteryChoices.map((entry) => (
              <div key={entry.equipmentId} className="space-y-1.5">
                <p className="text-[11px] font-semibold text-foreground">{entry.weaponName}</p>
                {Array.from({ length: entry.slotCount }).map((_, index) => (
                  <select
                    key={`${entry.equipmentId}-${index}`}
                    value={entry.picks[index] ?? ""}
                    onChange={(event) => {
                      const next = [...entry.picks]
                      if (event.target.value) next[index] = event.target.value
                      else next.splice(index, 1)
                      onExtraWeaponMasteryChange(entry.equipmentId, next.filter(Boolean))
                    }}
                    className="w-full rounded-md border border-border bg-card px-2.5 py-2 text-xs"
                  >
                    <option value="">Choose…</option>
                    {entry.options.map((option) => (
                      <option key={option.name} value={option.name}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
        >
          <Flame className="h-4 w-4" />
          Done
        </button>
      </motion.div>
    </motion.div>
  )
}
