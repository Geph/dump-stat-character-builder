"use client"

import { D20RollButton } from "@/components/character-sheet/d20-roll-button"
import {
  createIllusionToken,
  damageIllusionToken,
  dismissIllusionToken,
  type IllusionTokenKind,
  type IllusionTokenState,
} from "@/lib/character/illusion-tokens"

type IllusionTokensPanelProps = {
  tokens: IllusionTokenState[]
  onChange: (next: IllusionTokenState[]) => void
  spellAttackModifier?: number | null
  intelligenceMod?: number
}

export function IllusionTokensPanel({
  tokens,
  onChange,
  spellAttackModifier = null,
  intelligenceMod = 0,
}: IllusionTokensPanelProps) {
  const spawn = (kind: IllusionTokenKind) => {
    const next = createIllusionToken({ kind })
    // One Projected Self at a time; Imaginary Ally can stack within use limits.
    if (kind === "projected_self") {
      onChange([...tokens.filter((token) => token.kind !== "projected_self"), next])
      return
    }
    onChange([...tokens, next])
  }

  return (
    <div className="mt-3 rounded-lg border border-sky-500/30 bg-sky-500/5 p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-sky-800 dark:text-sky-200">Illusion tokens</p>
          <p className="text-[10px] text-muted-foreground">
            Projected Self / Imaginary Ally — HP 1 each
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          <button
            type="button"
            onClick={() => spawn("projected_self")}
            className="rounded-md border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-[10px] font-semibold text-sky-800 dark:text-sky-200"
          >
            + Projected Self
          </button>
          <button
            type="button"
            onClick={() => spawn("imaginary_ally")}
            className="rounded-md border border-border px-2 py-1 text-[10px] font-semibold"
          >
            + Imaginary Ally
          </button>
        </div>
      </div>

      {tokens.length === 0 ? (
        <p className="text-[10px] text-muted-foreground italic">No active illusion tokens.</p>
      ) : (
        <ul className="space-y-2">
          {tokens.map((token) => (
            <li
              key={token.id}
              className="rounded-md border border-border/70 bg-background/60 px-2 py-1.5 space-y-1"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">{token.label}</p>
                  <p className="text-[10px] tabular-nums text-muted-foreground">
                    HP {token.currentHp}/{token.maxHp}
                    {token.ac != null ? ` · AC ${token.ac}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  {token.kind === "imaginary_ally" && spellAttackModifier != null ? (
                    <D20RollButton
                      modifier={spellAttackModifier}
                      title="Imaginary Ally attack"
                      size="sm"
                      rollContext={{ kind: "attack", ability: "intelligence" }}
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onChange(damageIllusionToken(tokens, token.id))}
                    className="rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold"
                  >
                    Hit (0 HP)
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(dismissIllusionToken(tokens, token.id))}
                    className="rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
              {token.kind === "imaginary_ally" ? (
                <p className="text-[10px] text-muted-foreground">
                  Bonus Action attack: 1d8+{intelligenceMod} psychic (spell attack +
                  {spellAttackModifier != null
                    ? spellAttackModifier >= 0
                      ? `+${spellAttackModifier}`
                      : String(spellAttackModifier)
                    : "?"}).
                </p>
              ) : null}
              {token.notes ? (
                <p className="text-[10px] leading-snug text-muted-foreground">{token.notes}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
