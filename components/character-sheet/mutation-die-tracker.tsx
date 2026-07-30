"use client"

import {
  createMutationDieGrant,
  spendMutationDie,
  stepMutationDie,
  type MutationDieGrant,
} from "@/lib/character/mutation-die"

type MutationDieTrackerProps = {
  grant: MutationDieGrant | null
  allyBenefitCounts: Record<string, number>
  onGrantChange: (next: MutationDieGrant | null) => void
  onAllyBenefitCountsChange: (next: Record<string, number>) => void
  constitutionMod?: number
}

export function MutationDieTracker({
  grant,
  allyBenefitCounts,
  onGrantChange,
  onAllyBenefitCountsChange,
  constitutionMod = 0,
}: MutationDieTrackerProps) {
  const allyCap = Math.max(1, constitutionMod)
  const allyEntries = Object.entries(allyBenefitCounts).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">Mutation Die</p>
          <p className="text-[10px] text-muted-foreground">Flesh Warp — until start of your next turn</p>
        </div>
        {grant ? (
          <button
            type="button"
            onClick={() => onGrantChange(null)}
            className="rounded-md border border-border px-2 py-1 text-[10px] font-semibold"
          >
            Clear
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onGrantChange(createMutationDieGrant())}
            className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-800 dark:text-emerald-200"
          >
            Grant d4
          </button>
        )}
      </div>

      {grant ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-2xl font-black tabular-nums text-foreground">d{grant.sides}</p>
              <p className="text-[10px] text-muted-foreground">
                Target: {grant.targetLabel}
                {grant.remaining > 0 ? " · available" : " · spent"}
                {grant.autoApplyStrength ? " · Muscular (auto STR)" : ""}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-1.5">
              <button
                type="button"
                onClick={() => onGrantChange(stepMutationDie(grant, -1))}
                className="rounded-md border border-border px-2 py-1 text-xs font-semibold"
              >
                Step down
              </button>
              <button
                type="button"
                disabled={grant.remaining <= 0}
                onClick={() => onGrantChange(spendMutationDie(grant))}
                className="rounded-md border border-border px-2 py-1 text-xs font-semibold disabled:opacity-40"
              >
                Spend
              </button>
              <button
                type="button"
                onClick={() => onGrantChange(stepMutationDie(grant, 1))}
                className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-200"
              >
                Step up
              </button>
            </div>
          </div>
          <label className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <input
              type="checkbox"
              checked={grant.autoApplyStrength}
              onChange={(event) =>
                onGrantChange({ ...grant, autoApplyStrength: event.target.checked })
              }
            />
            Muscular: auto-apply to Strength without expending
          </label>
          <label className="block text-[10px] text-muted-foreground">
            Target label
            <input
              type="text"
              value={grant.targetLabel}
              onChange={(event) =>
                onGrantChange({ ...grant, targetLabel: event.target.value || "Self" })
              }
              className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
            />
          </label>
        </>
      ) : null}

      <div className="border-t border-border/60 pt-2 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Ally benefits (cap {allyCap} / long rest → Exhaustion)
          </p>
          <button
            type="button"
            onClick={() => {
              const label = window.prompt("Ally name")
              if (!label?.trim()) return
              const key = label.trim()
              onAllyBenefitCountsChange({
                ...allyBenefitCounts,
                [key]: (allyBenefitCounts[key] ?? 0) + 1,
              })
            }}
            className="rounded-md border border-border px-2 py-0.5 text-[10px] font-semibold"
          >
            + Ally use
          </button>
        </div>
        {allyEntries.length === 0 ? (
          <p className="text-[10px] text-muted-foreground italic">No ally benefits tracked yet.</p>
        ) : (
          <ul className="space-y-1">
            {allyEntries.map(([label, count]) => {
              const over = count > allyCap
              return (
                <li key={label} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className={over ? "font-semibold text-amber-700 dark:text-amber-300" : ""}>
                    {label}
                    {over ? " · Exhaustion risk" : ""}
                  </span>
                  <span className="flex items-center gap-1 tabular-nums">
                    {count}/{allyCap}
                    <button
                      type="button"
                      onClick={() => {
                        const next = { ...allyBenefitCounts }
                        const value = (next[label] ?? 0) - 1
                        if (value <= 0) delete next[label]
                        else next[label] = value
                        onAllyBenefitCountsChange(next)
                      }}
                      className="rounded border border-border px-1 text-[10px]"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onAllyBenefitCountsChange({
                          ...allyBenefitCounts,
                          [label]: count + 1,
                        })
                      }
                      className="rounded border border-border px-1 text-[10px]"
                    >
                      +
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
