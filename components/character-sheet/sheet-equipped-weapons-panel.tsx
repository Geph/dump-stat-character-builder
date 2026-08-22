"use client"

import { D20RollButton } from "@/components/character-sheet/d20-roll-button"
import { ConditionInfoTip } from "@/components/character-sheet/condition-info-tip"
import { WeaponDamageRollButton } from "@/components/character-sheet/weapon-damage-roll-button"
import { GameIcon } from "@/components/game-icon-picker"
import type { CharacterBuildInputs } from "@/lib/character/types"
import {
  getWeaponDamageText,
  getWeaponMastery,
  getWeaponPropertyTags,
  getWeaponRangeText,
  isThrownWeapon,
} from "@/lib/compendium/combat-stats"
import { describeWeaponMastery } from "@/lib/compendium/weapon-mastery"
import {
  describeWeaponProperty,
  describeWeaponRange,
} from "@/lib/compendium/weapon-property-reference"
import { buildWeaponSheetContext } from "@/lib/compendium/weapon-sheet-context"
import { weaponDamageDiceOptions } from "@/lib/compendium/weapon-damage-roll"
import { weaponModifierBadgeClass } from "@/lib/character/sheet-status-colors"
import type { WeaponAttackDerived } from "@/lib/character/types"
import type { Equipment } from "@/lib/types"
import { cn } from "@/lib/utils"

type EquippedWeaponCard = {
  weapon: Equipment
  attack: WeaponAttackDerived
  hand: "main" | "off"
  defaultIncludeAbilityModifier: boolean
  abilityModifier: number
  /** Optional play-state note (e.g. Weapon Morph ammo). */
  note?: string
  /** When set, spend this much HP when the attack roll button is used. */
  ammoHpCost?: number
  onSpendAmmoHp?: () => void
  /** Owned copies — thrown weapons track this like remaining ammo. */
  quantity?: number
}

export type ExtraWeaponMasteryControl = {
  slotCount: number
  picks: string[]
  options: { name: string; description?: string }[]
}

type SheetEquippedWeaponsPanelProps = {
  weapons: EquippedWeaponCard[]
  buildInputs: CharacterBuildInputs | null
  weaponProficiencies: string[]
  extraMasteryByWeaponId?: Record<string, ExtraWeaponMasteryControl>
  onExtraMasteryChange?: (equipmentId: string, names: string[]) => void
  /** Weapon attack rolls spend the Attack action. */
  onAttackRoll?: () => void
  /** Weapon damage rolls signal that damage was dealt this turn (Rampage Die). */
  onDamageRoll?: () => void
}

function WeaponAttackCard({
  weapon,
  attack,
  hand,
  defaultIncludeAbilityModifier,
  abilityModifier,
  note,
  ammoHpCost,
  onSpendAmmoHp,
  quantity,
  buildInputs,
  weaponProficiencies,
  extraMastery,
  onExtraMasteryChange,
  onAttackRoll,
  onDamageRoll,
}: EquippedWeaponCard & {
  buildInputs: CharacterBuildInputs | null
  weaponProficiencies: string[]
  extraMastery?: ExtraWeaponMasteryControl
  onExtraMasteryChange?: (equipmentId: string, names: string[]) => void
  onAttackRoll?: () => void
  onDamageRoll?: () => void
}) {
  const range = getWeaponRangeText(weapon)
  const mastery = getWeaponMastery(weapon)
  const properties = getWeaponPropertyTags(weapon)
  const baseDamage = getWeaponDamageText(weapon)
  const damageExpression = attack.damageDisplay || baseDamage
  const diceOptions = weaponDamageDiceOptions(weapon)
  const sheetContext = buildInputs
    ? buildWeaponSheetContext(weapon, buildInputs, weaponProficiencies)
    : null
  const masteryDescription =
    sheetContext?.masteryDescription ??
    (mastery ? describeWeaponMastery(mastery) : null) ??
    (mastery ? "Homebrew mastery — see item details." : null)
  const masteryActive = sheetContext?.masteryActive ?? false
  const handleAttackRoll = () => {
    if (ammoHpCost && ammoHpCost > 0 && onSpendAmmoHp) onSpendAmmoHp()
    onAttackRoll?.()
  }

  return (
    <div className="rounded border border-primary/40 bg-primary/5 px-2.5 py-2 min-w-0">
      <div className="flex items-stretch justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-1.5">
            {weapon.icon?.trim() ? (
              <GameIcon name={weapon.icon.trim()} className="h-5 w-5 shrink-0 text-primary" />
            ) : null}
            <p className="text-xs font-semibold text-foreground">{weapon.name}</p>
            {quantity != null && quantity > 0 && (quantity > 1 || isThrownWeapon(weapon)) ? (
              <span className="text-[10px] font-bold tabular-nums text-muted-foreground">
                ×{quantity}
                {isThrownWeapon(weapon) ? " left" : ""}
              </span>
            ) : null}
            {hand === "off" ? (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                Off-hand
              </span>
            ) : null}
          </div>

          {range || baseDamage ? (
            <p className="text-[10px] text-foreground">
              {baseDamage ? (
                <span className="font-medium">
                  {baseDamage}
                  {weapon.damage_type ? ` ${weapon.damage_type}` : ""}
                </span>
              ) : null}
              {range ? (
                <span className="inline-flex items-center gap-0.5">
                  {baseDamage ? <span className="text-muted-foreground mx-1">·</span> : null}
                  {range}
                  <ConditionInfoTip
                    description={describeWeaponRange(range) ?? range}
                    ariaLabel="Range rules"
                  />
                </span>
              ) : null}
            </p>
          ) : null}

          {mastery ||
          properties.length > 0 ||
          sheetContext?.appliedModifiers.length ||
          sheetContext?.extraMasteries.length ? (
            <div className="flex flex-wrap gap-1">
              {mastery ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                    masteryActive
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-muted/60 text-muted-foreground",
                  )}
                >
                  {mastery}
                  <ConditionInfoTip
                    description={masteryDescription ?? mastery}
                    ariaLabel={`${mastery} mastery`}
                  />
                </span>
              ) : null}
              {(sheetContext?.extraMasteries ?? []).map((entry) => (
                <span
                  key={`extra-${entry.name}`}
                  className="inline-flex items-center gap-0.5 rounded-full border border-primary bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary"
                >
                  {entry.name}
                  <ConditionInfoTip
                    description={entry.description ?? entry.name}
                    ariaLabel={`${entry.name} mastery`}
                  />
                </span>
              ))}
              {properties.map((property) => {
                const description = describeWeaponProperty(property)
                return (
                  <span
                    key={property}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-medium text-foreground"
                  >
                    {property}
                    {description ? (
                      <ConditionInfoTip
                        description={description}
                        ariaLabel={`${property} property`}
                      />
                    ) : null}
                  </span>
                )
              })}
              {(sheetContext?.appliedModifiers ?? []).map((modifier) => (
                <span
                  key={`${modifier.name}-${modifier.description}`}
                  className={cn(
                    "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[10px] font-medium",
                    weaponModifierBadgeClass(modifier.sourceType),
                  )}
                >
                  {modifier.name}
                  <ConditionInfoTip
                    description={modifier.description}
                    ariaLabel={`${modifier.name} modifier`}
                  />
                </span>
              ))}
            </div>
          ) : null}

          {extraMastery && extraMastery.slotCount > 0 && onExtraMasteryChange ? (
            <div className="space-y-1 pt-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Extra mastery {extraMastery.slotCount === 1 ? "property" : "properties"}
              </p>
              {Array.from({ length: extraMastery.slotCount }).map((_, index) => (
                <select
                  key={`${weapon.id}-extra-${index}`}
                  value={extraMastery.picks[index] ?? ""}
                  onChange={(event) => {
                    const next = [...extraMastery.picks]
                    if (event.target.value) next[index] = event.target.value
                    else next.splice(index, 1)
                    onExtraMasteryChange(weapon.id, next.filter(Boolean))
                  }}
                  className="w-full rounded-md border border-border bg-card px-2 py-1 text-[11px]"
                >
                  <option value="">Choose…</option>
                  {extraMastery.options.map((option) => (
                    <option key={option.name} value={option.name}>
                      {option.name}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          ) : null}
          {note ? (
            <p className="text-[10px] leading-snug text-amber-800 dark:text-amber-200">{note}</p>
          ) : null}
        </div>

        <div className="flex w-[8.4375rem] shrink-0 flex-col gap-1 self-start">
          <D20RollButton
            modifier={attack.attackBonus}
            title={`${weapon.name} attack`}
            breakdown={attack.attackBreakdown}
            rollContext={{ kind: "attack" }}
            onRoll={handleAttackRoll}
            layout="panel"
            tone={hand === "off" ? "bonus" : "action"}
            caption="To Hit"
          />
          {damageExpression ? (
            <WeaponDamageRollButton
              expression={damageExpression}
              label={`${weapon.name} damage`}
              diceOptions={diceOptions}
              showNoModToggle={hand === "off"}
              defaultIncludeAbilityModifier={defaultIncludeAbilityModifier}
              abilityModifier={abilityModifier}
              layout="panel"
              tone="damage"
              caption="Dmg"
              onRoll={onDamageRoll}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function SheetEquippedWeaponsPanel({
  weapons,
  buildInputs,
  weaponProficiencies,
  extraMasteryByWeaponId,
  onExtraMasteryChange,
  onAttackRoll,
  onDamageRoll,
}: SheetEquippedWeaponsPanelProps) {
  if (!weapons.length) return null

  return (
    <div className="mb-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
        Weapon Attacks
      </p>
      <div className="grid grid-cols-1 gap-2">
        {weapons.map((entry) => (
          <WeaponAttackCard
            key={`${entry.hand}-${entry.weapon.id}`}
            {...entry}
            buildInputs={buildInputs}
            weaponProficiencies={weaponProficiencies}
            extraMastery={extraMasteryByWeaponId?.[entry.weapon.id]}
            onExtraMasteryChange={onExtraMasteryChange}
            onAttackRoll={onAttackRoll}
            onDamageRoll={onDamageRoll}
          />
        ))}
      </div>
    </div>
  )
}
