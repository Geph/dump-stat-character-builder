"use client"

import { useState } from "react"
import { Dices } from "lucide-react"
import { useSheetRollHistory } from "@/components/character-sheet/sheet-roll-history-context"
import {
  markRampageDamageDealt,
  markRampageDieUsed,
  RAMPAGE_D12_ROUNDS_FOR_EXHAUSTION,
  rampageDieGrantsUncontrollableMind,
  resetRampageDie,
  stepRampageDieState,
  type RampageDieState,
} from "@/lib/character/rampage-die"
import { rollUnstoppableRampage } from "@/lib/character/unleashed-mind"
import { rollDie } from "@/lib/dice/roll-die"

export type UnstoppableRampageContext = {
  conModifier: number
  /** Psi points available for the optional second die. */
  psiAvailable: number
  /** Spend psi for the second die; returns false when unaffordable. */
  onSpendPsi: (amount: number) => boolean
  /** Called when the roll beats the excess damage — drop to 1 HP instead of 0. */
  onSurvive: () => void
}

type RampageDieTrackerProps = {
  state: RampageDieState
  onStateChange: (next: RampageDieState) => void
  knowsTantrum?: boolean
  knowsUncontrollableMind?: boolean
  unstoppable?: UnstoppableRampageContext | null
}

const SECOND_DIE_PSI_COST = 2

function UnstoppableRampageBox({
  sides,
  context,
}: {
  sides: number
  context: UnstoppableRampageContext
}) {
  const [excessInput, setExcessInput] = useState("")
  const [useSecondDie, setUseSecondDie] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const history = useSheetRollHistory()

  const excessDamage = Math.max(0, Number.parseInt(excessInput, 10) || 0)
  const canAffordSecondDie = context.psiAvailable >= SECOND_DIE_PSI_COST

  const handleRoll = () => {
    const extraDie = useSecondDie && canAffordSecondDie
    if (extraDie && !context.onSpendPsi(SECOND_DIE_PSI_COST)) {
      setResult("Not enough psi points for a second die.")
      return
    }
    const rolled = rollUnstoppableRampage({
      sides,
      conModifier: context.conModifier,
      excessDamage,
      extraDie,
    })
    const conPart =
      rolled.conModifier >= 0 ? `+ ${rolled.conModifier}` : `- ${Math.abs(rolled.conModifier)}`
    const summary = `${rolled.dieRolls.join(" + ")} ${conPart} = ${rolled.total} vs ${excessDamage} excess — ${
      rolled.success ? "you drop to 1 HP" : "you fall unconscious"
    }`
    setResult(summary)
    history?.logRoll({ kind: "damage", label: "Unstoppable Rampage", summary })
    if (rolled.success) context.onSurvive()
  }

  return (
    <div className="mt-2 space-y-1.5 border-t border-border/60 pt-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        Unstoppable Rampage
      </p>
      <div className="flex flex-wrap items-end gap-1.5">
        <label className="text-[10px] text-muted-foreground">
          Excess damage
          <input
            type="number"
            min={0}
            value={excessInput}
            onChange={(event) => setExcessInput(event.target.value)}
            className="mt-0.5 block w-20 rounded-md border border-border bg-background px-2 py-1 text-xs tabular-nums text-foreground"
          />
        </label>
        <button
          type="button"
          onClick={handleRoll}
          className="inline-flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-800 dark:text-rose-200"
        >
          <Dices className="h-3.5 w-3.5" />
          Roll d{sides} + CON
        </button>
      </div>
      <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <input
          type="checkbox"
          checked={useSecondDie}
          disabled={!canAffordSecondDie}
          onChange={(event) => setUseSecondDie(event.target.checked)}
        />
        Second die ({SECOND_DIE_PSI_COST} psi)
        {canAffordSecondDie ? "" : " — not enough psi"}
      </label>
      {result ? <p className="text-[11px] font-medium text-foreground">{result}</p> : null}
    </div>
  )
}

export function RampageDieTracker({
  state,
  onStateChange,
  knowsTantrum = false,
  knowsUncontrollableMind = false,
  unstoppable = null,
}: RampageDieTrackerProps) {
  const history = useSheetRollHistory()
  const [lastDieRoll, setLastDieRoll] = useState<string | null>(null)
  const d8Plus = rampageDieGrantsUncontrollableMind(state.sides)

  const handleAddDie = () => {
    const rolled = rollDie(state.sides)
    const summary = `d${state.sides} → ${rolled} added to damage`
    setLastDieRoll(summary)
    history?.logRoll({ kind: "damage", label: "Rampage Die", summary })
    onStateChange(markRampageDieUsed(state))
  }

  return (
    <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/5 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-rose-800 dark:text-rose-200">Rampage Die</p>
          <p className="text-2xl font-black tabular-nums text-foreground">d{state.sides}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onStateChange(stepRampageDieState(state, -1))}
            className="rounded-md border border-border px-2 py-1 text-xs font-semibold"
          >
            Step down
          </button>
          <button
            type="button"
            onClick={() => onStateChange(resetRampageDie(state))}
            className="rounded-md border border-border px-2 py-1 text-xs font-semibold"
          >
            Reset d4
          </button>
          <button
            type="button"
            onClick={() => onStateChange(stepRampageDieState(state, 1))}
            className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-800 dark:text-rose-200"
          >
            Step up
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          aria-pressed={state.dealtDamageThisTurn}
          onClick={() =>
            onStateChange(
              state.dealtDamageThisTurn
                ? { ...state, dealtDamageThisTurn: false }
                : markRampageDamageDealt(state),
            )
          }
          className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${
            state.dealtDamageThisTurn
              ? "border-rose-500/50 bg-rose-500/15 text-rose-800 dark:text-rose-200"
              : "border-border text-muted-foreground"
          }`}
        >
          {state.dealtDamageThisTurn ? "Dealt damage this turn" : "No damage this turn"}
        </button>
        <button
          type="button"
          disabled={state.usedDieThisTurn}
          onClick={handleAddDie}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-semibold disabled:opacity-40"
        >
          <Dices className="h-3 w-3" />
          {state.usedDieThisTurn ? "Die used this turn" : "Add Rampage Die"}
        </button>
        {state.sides === 12 ? (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-200">
            d12 {state.d12RoundsHeld}/{RAMPAGE_D12_ROUNDS_FOR_EXHAUSTION} rounds
          </span>
        ) : null}
        {knowsUncontrollableMind && d8Plus ? (
          <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-800 dark:text-violet-200">
            Charmed / Frightened immunity
          </span>
        ) : null}
      </div>

      {lastDieRoll ? (
        <p className="mt-1 text-[11px] font-medium text-foreground">{lastDieRoll}</p>
      ) : null}

      <p className="mt-2 text-[10px] text-muted-foreground">
        Once per turn, add this die to one damage roll. Turn Start steps the die up when you dealt
        damage, and resets it to d4 after a turn without damage or while Incapacitated.
      </p>
      {knowsTantrum ? (
        <p className="mt-1 text-[10px] font-medium text-rose-800 dark:text-rose-200">
          Tantrum: rolling initiative steps the die up, and taking damage steps it up while it is
          d6 or lower.
        </p>
      ) : null}

      {unstoppable ? <UnstoppableRampageBox sides={state.sides} context={unstoppable} /> : null}
    </div>
  )
}
