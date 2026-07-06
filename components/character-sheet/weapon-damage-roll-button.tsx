"use client"

import { useMemo, useState } from "react"
import { Dices } from "lucide-react"
import { useSheetRollHistory } from "@/components/character-sheet/sheet-roll-history-context"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { WeaponDamageDiceOption } from "@/lib/compendium/weapon-damage-roll"
import type { DamageRollMode, ParsedDamageRoll } from "@/lib/dice/damage-roll"
import {
  formatDamageRollResult,
  parseDamageRoll,
  rollDamageWithMode,
} from "@/lib/dice/damage-roll"

type WeaponDamageRollButtonProps = {
  expression: string
  label?: string
  diceOptions?: WeaponDamageDiceOption[]
  defaultDiceId?: string
  showNoModToggle?: boolean
  defaultIncludeAbilityModifier?: boolean
  /** Ability mod used for this weapon; enables precise no-mod toggling. */
  abilityModifier?: number
}

function abilityModInExpression(
  abilityModifier: number,
  includeAbilityModifier: boolean,
): number {
  if (includeAbilityModifier) return abilityModifier
  return abilityModifier < 0 ? abilityModifier : 0
}

function swapDamageDice(expression: string, dice: string): string {
  const withoutType = expression.replace(/\s+[a-z][a-z\s]*$/i, "").trim()
  const modPart = withoutType.replace(/^[\dd+\s]+/i, "").trim()
  const typePart = expression.match(/\s+([a-z][a-z\s]*)$/i)?.[1] ?? ""
  return `${dice}${modPart ? ` ${modPart}` : ""}${typePart ? ` ${typePart}` : ""}`.trim()
}

function resolveRollParsed(
  expression: string,
  diceOptions: WeaponDamageDiceOption[],
  selectedDiceId: string,
  showNoModToggle: boolean,
  includeAbilityModifier: boolean,
  defaultIncludeAbilityModifier: boolean,
  abilityModifier: number | undefined,
): ParsedDamageRoll | null {
  const selected =
    diceOptions.length > 0
      ? (diceOptions.find((option) => option.id === selectedDiceId) ?? diceOptions[0])
      : null
  const diceExpression = selected ? swapDamageDice(expression, selected.dice) : expression
  const parsed = parseDamageRoll(diceExpression)
  if (!parsed) return null

  if (!showNoModToggle || abilityModifier == null) return parsed

  const bakedAbility = abilityModInExpression(abilityModifier, defaultIncludeAbilityModifier)
  const desiredAbility = abilityModInExpression(abilityModifier, includeAbilityModifier)
  const modifierDelta = desiredAbility - bakedAbility
  if (modifierDelta === 0) return parsed

  return { ...parsed, modifier: parsed.modifier + modifierDelta }
}

export function WeaponDamageRollButton({
  expression,
  label,
  diceOptions = [],
  defaultDiceId,
  showNoModToggle = false,
  defaultIncludeAbilityModifier = true,
  abilityModifier,
}: WeaponDamageRollButtonProps) {
  const history = useSheetRollHistory()
  const [total, setTotal] = useState<number | null>(null)
  const [rollMode, setRollMode] = useState<DamageRollMode>("normal")
  const [selectedDiceId, setSelectedDiceId] = useState(
    defaultDiceId ?? diceOptions[0]?.id ?? "default",
  )
  const [includeAbilityModifier, setIncludeAbilityModifier] = useState(defaultIncludeAbilityModifier)

  const rollParsed = useMemo(
    () =>
      resolveRollParsed(
        expression,
        diceOptions,
        selectedDiceId,
        showNoModToggle,
        includeAbilityModifier,
        defaultIncludeAbilityModifier,
        abilityModifier,
      ),
    [
      expression,
      diceOptions,
      selectedDiceId,
      showNoModToggle,
      includeAbilityModifier,
      defaultIncludeAbilityModifier,
      abilityModifier,
    ],
  )

  const activeExpression = useMemo(() => {
    const selected =
      diceOptions.length > 0
        ? (diceOptions.find((option) => option.id === selectedDiceId) ?? diceOptions[0])
        : null
    const diceExpression = selected ? swapDamageDice(expression, selected.dice) : expression
    if (!rollParsed || rollParsed.modifier === parseDamageRoll(diceExpression)?.modifier) {
      return diceExpression
    }
    const withoutType = diceExpression.replace(/\s+[a-z][a-z\s]*$/i, "").trim()
    const dicePart = withoutType.match(/^[\dd+\s]+/i)?.[0]?.trim() ?? ""
    const typePart = diceExpression.match(/\s+([a-z][a-z\s]*)$/i)?.[1] ?? ""
    const modSuffix =
      rollParsed.modifier === 0
        ? ""
        : rollParsed.modifier > 0
          ? ` + ${rollParsed.modifier}`
          : ` - ${Math.abs(rollParsed.modifier)}`
    return `${dicePart}${modSuffix}${typePart ? ` ${typePart}` : ""}`.trim()
  }, [diceOptions, expression, rollParsed, selectedDiceId])

  if (!rollParsed) return null

  const modeBadge =
    rollMode === "advantage" ? "Adv" : rollMode === "disadvantage" ? "Dis" : null

  const handleRoll = () => {
    const result = rollDamageWithMode(rollParsed, rollMode)
    setTotal(result.total)
    const modeSuffix =
      result.mode === "advantage" ? " (adv)" : result.mode === "disadvantage" ? " (dis)" : ""
    const noModSuffix = showNoModToggle && !includeAbilityModifier ? " (no mod)" : ""
    history?.logRoll({
      kind: "damage",
      label: label ?? `Damage (${activeExpression})`,
      summary: `${formatDamageRollResult(result.rolls, result.modifier, result.total)}${modeSuffix}${noModSuffix}`,
    })
  }

  return (
    <span className="inline-flex items-center gap-1 shrink-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`rounded border px-1 py-0.5 text-[9px] font-bold uppercase ${
              modeBadge || !includeAbilityModifier || selectedDiceId !== (defaultDiceId ?? diceOptions[0]?.id)
                ? "border-primary/40 text-primary"
                : "border-transparent text-muted-foreground/50 hover:text-muted-foreground hover:border-border"
            }`}
            title="Damage roll options"
            aria-label="Damage roll options"
          >
            {modeBadge ?? (!includeAbilityModifier && showNoModToggle ? "No mod" : "···")}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
            Roll options
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={rollMode}
            onValueChange={(value) => setRollMode(value as DamageRollMode)}
          >
            <DropdownMenuRadioItem value="normal">Normal</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="advantage">Advantage</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="disadvantage">Disadvantage</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          {diceOptions.length > 1 ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
                Damage dice
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={selectedDiceId}
                onValueChange={setSelectedDiceId}
              >
                {diceOptions.map((option) => (
                  <DropdownMenuRadioItem key={option.id} value={option.id}>
                    {option.label} ({option.dice})
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </>
          ) : null}
          {showNoModToggle ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={!includeAbilityModifier}
                onCheckedChange={(checked) => setIncludeAbilityModifier(!checked)}
                onSelect={(event) => event.preventDefault()}
              >
                No ability mod
              </DropdownMenuCheckboxItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <button
        type="button"
        onClick={handleRoll}
        className="inline-flex items-center justify-center gap-1 h-6 min-w-[2.25rem] px-1.5 rounded border border-border bg-muted/80 text-xs font-bold tabular-nums hover:bg-muted shrink-0"
        title={activeExpression ? `Roll damage (${activeExpression})` : "Roll damage"}
        aria-label={activeExpression ? `Roll damage (${activeExpression})` : "Roll damage"}
      >
        <Dices className="w-3 h-3 text-muted-foreground shrink-0" aria-hidden />
        {total != null ? <span className="font-black text-primary">{total}</span> : null}
      </button>
    </span>
  )
}
