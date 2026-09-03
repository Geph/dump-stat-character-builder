"use client"

import { useEffect, useMemo, useState } from "react"
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
import {
  appendBonusDamageDice,
  preferredWeaponDamageDiceId,
  swapDamageDice,
  type WeaponDamageBonusOption,
  type WeaponDamageDiceOption,
  type WeaponSpellBuffMenuOption,
} from "@/lib/compendium/weapon-damage-roll"
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
  /** Optional flat bonuses (Fierce Start +CHA, etc.). */
  bonusOptions?: WeaponDamageBonusOption[]
  /** Magic Weapon / Elemental Weapon-style buffs bound to this weapon. */
  spellBuffOptions?: WeaponSpellBuffMenuOption[]
  onSpellBuffToggle?: (buffId: string, checked: boolean) => void
  showNoModToggle?: boolean
  defaultIncludeAbilityModifier?: boolean
  /** Ability mod used for this weapon; enables precise no-mod toggling. */
  abilityModifier?: number
  layout?: "inline" | "panel"
  tone?: "default" | "damage"
  caption?: string
  className?: string
  /** Fired after a damage roll resolves (e.g. to mark Rampage Die damage dealt). */
  onRoll?: () => void
}

function abilityModInExpression(
  abilityModifier: number,
  includeAbilityModifier: boolean,
): number {
  if (includeAbilityModifier) return abilityModifier
  return abilityModifier < 0 ? abilityModifier : 0
}

function resolveRollParsed(
  expression: string,
  diceOptions: WeaponDamageDiceOption[],
  selectedDiceId: string,
  showNoModToggle: boolean,
  includeAbilityModifier: boolean,
  defaultIncludeAbilityModifier: boolean,
  abilityModifier: number | undefined,
  extraFlatBonus: number,
  extraDice: Array<{ dice: string; type?: string | null }>,
): ParsedDamageRoll | null {
  const selected =
    diceOptions.length > 0
      ? (diceOptions.find((option) => option.id === selectedDiceId) ?? diceOptions[0])
      : null
  let diceExpression = selected ? swapDamageDice(expression, selected.dice) : expression
  for (const part of extraDice) {
    diceExpression = appendBonusDamageDice(diceExpression, part.dice, part.type)
  }
  const parsed = parseDamageRoll(diceExpression)
  if (!parsed) return null

  let modifier = parsed.modifier
  if (showNoModToggle && abilityModifier != null) {
    const bakedAbility = abilityModInExpression(abilityModifier, defaultIncludeAbilityModifier)
    const desiredAbility = abilityModInExpression(abilityModifier, includeAbilityModifier)
    modifier += desiredAbility - bakedAbility
  }
  if (extraFlatBonus !== 0) modifier += extraFlatBonus

  if (modifier === parsed.modifier) return parsed
  return { ...parsed, modifier }
}

function formatExpressionWithModifier(diceExpression: string, modifier: number): string {
  const withoutType = diceExpression.replace(/\s+[a-z][a-z\s]*$/i, "").trim()
  const dicePart = withoutType.match(/^[\dd+\s]+/i)?.[0]?.trim() ?? ""
  const typePart = diceExpression.match(/\s+([a-z][a-z\s]*)$/i)?.[1] ?? ""
  const modSuffix =
    modifier === 0 ? "" : modifier > 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`
  return `${dicePart}${modSuffix}${typePart ? ` ${typePart}` : ""}`.trim()
}

function resolvePreferredDiceId(
  diceOptions: WeaponDamageDiceOption[],
  defaultDiceId?: string,
): string {
  return (
    preferredWeaponDamageDiceId(diceOptions) ??
    defaultDiceId ??
    diceOptions[0]?.id ??
    "default"
  )
}

export function WeaponDamageRollButton({
  expression,
  label,
  diceOptions = [],
  defaultDiceId,
  bonusOptions = [],
  spellBuffOptions = [],
  onSpellBuffToggle,
  showNoModToggle = false,
  defaultIncludeAbilityModifier = true,
  abilityModifier,
  layout = "inline",
  tone = "default",
  caption,
  className,
  onRoll,
}: WeaponDamageRollButtonProps) {
  const history = useSheetRollHistory()
  const [total, setTotal] = useState<number | null>(null)
  const [rollMode, setRollMode] = useState<DamageRollMode>("normal")
  const preferredDiceId = useMemo(
    () => resolvePreferredDiceId(diceOptions, defaultDiceId),
    [diceOptions, defaultDiceId],
  )
  const [selectedDiceId, setSelectedDiceId] = useState(preferredDiceId)
  const [includeAbilityModifier, setIncludeAbilityModifier] = useState(defaultIncludeAbilityModifier)
  const [selectedBonusIds, setSelectedBonusIds] = useState<string[]>(() =>
    bonusOptions.filter((option) => option.defaultSelected !== false).map((option) => option.id),
  )

  useEffect(() => {
    setSelectedDiceId(preferredDiceId)
  }, [preferredDiceId])

  const bonusIdsKey = bonusOptions
    .map((option) => `${option.id}:${option.defaultSelected === false ? "0" : "1"}`)
    .join("|")
  useEffect(() => {
    setSelectedBonusIds(
      bonusOptions.filter((option) => option.defaultSelected !== false).map((option) => option.id),
    )
  }, [bonusIdsKey])

  const availableBonusIds = useMemo(
    () => new Set(bonusOptions.map((option) => option.id)),
    [bonusOptions],
  )
  const activeBonusIds = selectedBonusIds.filter((id) => availableBonusIds.has(id))
  const activeBonuses = bonusOptions.filter((option) => activeBonusIds.includes(option.id))
  const extraFlatBonus = activeBonuses.reduce((sum, option) => sum + option.bonus, 0)
  const extraDice = activeBonuses
    .map((option) => {
      const dice = option.bonusDice?.trim()
      if (!dice) return null
      return { dice, type: option.bonusDiceType?.trim() || null }
    })
    .filter((part): part is { dice: string; type: string | null } => Boolean(part))
  const extraDiceKey = JSON.stringify(extraDice)

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
        extraFlatBonus,
        JSON.parse(extraDiceKey) as { dice: string; type: string | null }[],
      ),
    [
      expression,
      diceOptions,
      selectedDiceId,
      showNoModToggle,
      includeAbilityModifier,
      defaultIncludeAbilityModifier,
      abilityModifier,
      extraFlatBonus,
      extraDiceKey,
    ],
  )

  const activeExpression = useMemo(() => {
    const selected =
      diceOptions.length > 0
        ? (diceOptions.find((option) => option.id === selectedDiceId) ?? diceOptions[0])
        : null
    let diceExpression = selected ? swapDamageDice(expression, selected.dice) : expression
    for (const part of extraDice) {
      diceExpression = appendBonusDamageDice(diceExpression, part.dice, part.type)
    }
    if (!rollParsed) return diceExpression
    if (rollParsed.modifier === parseDamageRoll(diceExpression)?.modifier) {
      return diceExpression
    }
    return formatExpressionWithModifier(diceExpression, rollParsed.modifier)
  }, [diceOptions, expression, extraDice, rollParsed, selectedDiceId])

  if (!rollParsed) return null

  const modeBadge =
    rollMode === "advantage" ? "Adv" : rollMode === "disadvantage" ? "Dis" : null

  const handleRoll = () => {
    const result = rollDamageWithMode(rollParsed, rollMode)
    setTotal(result.total)
    const modeSuffix =
      result.mode === "advantage" ? " (adv)" : result.mode === "disadvantage" ? " (dis)" : ""
    const noModSuffix = showNoModToggle && !includeAbilityModifier ? " (no mod)" : ""
    const bonusSuffix =
      activeBonusIds.length > 0
        ? ` (${bonusOptions
            .filter((option) => activeBonusIds.includes(option.id))
            .map((option) => option.label)
            .join(", ")})`
        : ""
    history?.logRoll({
      kind: "damage",
      label: label ?? `Damage (${activeExpression})`,
      summary: `${formatDamageRollResult(result.rolls, result.modifier, result.total)}${modeSuffix}${noModSuffix}${bonusSuffix}`,
    })
    onRoll?.()
  }

  const filled = tone === "damage" || layout === "panel"
  const optionsActive =
    Boolean(modeBadge) ||
    (showNoModToggle && !includeAbilityModifier) ||
    selectedDiceId !== preferredDiceId ||
    activeBonusIds.length !==
      bonusOptions.filter((option) => option.defaultSelected !== false).length
  const modeToggleClass = filled
    ? optionsActive
      ? "border-white/55 bg-black/15 text-white"
      : "border-white/25 bg-black/10 text-white/80 hover:border-white/45"
    : optionsActive
      ? "border-primary/40 text-primary"
      : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"

  const rollButtonClass =
    layout === "panel"
      ? "sheet-fill-tile sheet-fill-hp h-auto min-h-[2.75rem] w-full rounded-lg px-2 py-1.5 pr-9 text-sm"
      : filled
        ? "sheet-fill-tile sheet-fill-hp h-6 min-w-[2.25rem] rounded px-1.5 text-xs"
        : "h-6 min-w-[2.25rem] px-1.5 rounded border border-border bg-muted/80 text-xs hover:bg-muted"

  const toggleBonus = (id: string, checked: boolean) => {
    setSelectedBonusIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id]
      return prev.filter((entry) => entry !== id)
    })
  }

  const optionsTrigger = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(event) => event.stopPropagation()}
          className={`inline-flex min-h-6 min-w-6 items-center justify-center rounded border px-1.5 py-1 text-[10px] font-bold uppercase leading-none ${modeToggleClass}`}
          title="Damage roll options"
          aria-label="Damage roll options"
        >
          {modeBadge ?? "···"}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
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
        {bonusOptions.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
              Damage modifiers
            </DropdownMenuLabel>
            {bonusOptions.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.id}
                checked={activeBonusIds.includes(option.id)}
                onCheckedChange={(checked) => toggleBonus(option.id, Boolean(checked))}
                onSelect={(event) => event.preventDefault()}
                title={option.title}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </>
        ) : null}
        {spellBuffOptions.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
              Spell buffs
            </DropdownMenuLabel>
            {spellBuffOptions.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.id}
                checked={option.checked}
                onCheckedChange={(checked) => onSpellBuffToggle?.(option.id, Boolean(checked))}
                onSelect={(event) => event.preventDefault()}
                title={option.title}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
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
              No modifier
            </DropdownMenuCheckboxItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const rollButton = (
    <button
      type="button"
      onClick={handleRoll}
      className={`inline-flex items-center justify-center gap-1 font-bold tabular-nums shrink-0 ${rollButtonClass} ${className ?? ""}`}
      title={activeExpression ? `Roll damage (${activeExpression})` : "Roll damage"}
      aria-label={activeExpression ? `Roll damage (${activeExpression})` : "Roll damage"}
    >
      {caption ? (
        <span className="flex flex-col items-center gap-0.5 leading-none">
          <span className={`text-[9px] font-bold uppercase tracking-wide ${filled ? "text-white/85" : "text-muted-foreground"}`}>
            {caption}
          </span>
          <span className="inline-flex items-center gap-1">
            <Dices className={`w-3.5 h-3.5 shrink-0 ${filled ? "text-white/90" : "text-muted-foreground"}`} aria-hidden />
            {total != null ? (
              <span className={`font-black ${filled ? "text-white" : "text-primary"}`}>{total}</span>
            ) : null}
          </span>
        </span>
      ) : (
        <>
          <Dices className={`w-3 h-3 shrink-0 ${filled ? "text-white/90" : "text-muted-foreground"}`} aria-hidden />
          {total != null ? (
            <span className={`font-black ${filled ? "text-white" : "text-primary"}`}>{total}</span>
          ) : null}
        </>
      )}
    </button>
  )

  if (layout === "panel") {
    return (
      <span className="relative block w-full">
        <span className="pointer-events-auto absolute right-2 top-1.5 z-10">{optionsTrigger}</span>
        {rollButton}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 shrink-0">
      {optionsTrigger}
      {rollButton}
    </span>
  )
}
