"use client"

import { D20RollButton } from "@/components/character-sheet/d20-roll-button"
import { ConditionInfoTip } from "@/components/character-sheet/condition-info-tip"
import { WeaponDamageRollButton } from "@/components/character-sheet/weapon-damage-roll-button"
import { GameIcon } from "@/components/game-icon-picker"
import type { CharacterBuildInputs } from "@/lib/character/types"
import {
  getEffectiveWeaponPropertyTags,
  getWeaponDamageText,
  getWeaponMastery,
  getWeaponRangeText,
  isThrownWeapon,
} from "@/lib/compendium/combat-stats"
import { describeWeaponMastery } from "@/lib/compendium/weapon-mastery"
import {
  describeWeaponProperty,
  describeWeaponRange,
} from "@/lib/compendium/weapon-property-reference"
import { buildWeaponSheetContext } from "@/lib/compendium/weapon-sheet-context"
import type { AbilityMods } from "@/lib/compendium/combat-stats"
import {
  optionalWeaponDamageBonuses,
  optionalWeaponDamageReplacements,
  weaponDamageDiceOptions,
} from "@/lib/compendium/weapon-damage-roll"
import type {
  PowerRiderCharacteristic,
  WeaponAbilityOverrideCharacteristic,
} from "@/lib/compendium/characteristic-modifiers"
import { weaponModifierBadgeClass } from "@/lib/character/sheet-status-colors"
import { canMountWeapon, isWeaponMounted } from "@/lib/character/mounted-weapon"
import { isWeaponSpellBuffActiveOnWeapon } from "@/lib/character/weapon-spell-buff"
import { Switch } from "@/components/ui/switch"
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
  /** Weapon attack rolls spend the Attack or off-hand Bonus Action. */
  onAttackRoll?: (kind: "action" | "bonus") => void
  attackPips?: { used: number; total: number }
  /** Weapon damage rolls signal that damage was dealt this turn (Rampage Die). */
  onDamageRoll?: () => void
  hideHeading?: boolean
  activeSheetToggleIds?: readonly string[]
  sheetToggleWeaponIds?: Record<string, string>
  /** Weapon-bound spell buffs the character can place on a wielded weapon. */
  availableWeaponSpellBuffs?: readonly { toggleId: string; label: string }[]
  onToggleMounted?: (weaponId: string) => void
  onToggleWeaponSpellBuff?: (toggleId: string, weaponId: string) => void
  powerRiders?: readonly PowerRiderCharacteristic[]
  weaponAbilityOverrides?: readonly WeaponAbilityOverrideCharacteristic[]
  abilityMods?: AbilityMods | null
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
  attackPips,
  onDamageRoll,
  activeSheetToggleIds,
  sheetToggleWeaponIds,
  availableWeaponSpellBuffs,
  onToggleMounted,
  onToggleWeaponSpellBuff,
  powerRiders,
  weaponAbilityOverrides,
  abilityMods,
}: EquippedWeaponCard & {
  buildInputs: CharacterBuildInputs | null
  weaponProficiencies: string[]
  extraMastery?: ExtraWeaponMasteryControl
  onExtraMasteryChange?: (equipmentId: string, names: string[]) => void
  onAttackRoll?: (kind: "action" | "bonus") => void
  attackPips?: { used: number; total: number }
  onDamageRoll?: () => void
  activeSheetToggleIds?: readonly string[]
  sheetToggleWeaponIds?: Record<string, string>
  availableWeaponSpellBuffs?: readonly { toggleId: string; label: string }[]
  onToggleMounted?: (weaponId: string) => void
  onToggleWeaponSpellBuff?: (toggleId: string, weaponId: string) => void
  powerRiders?: readonly PowerRiderCharacteristic[]
  weaponAbilityOverrides?: readonly WeaponAbilityOverrideCharacteristic[]
  abilityMods?: AbilityMods | null
}) {
  const range = getWeaponRangeText(weapon)
  const mastery = getWeaponMastery(weapon)
  const properties = getEffectiveWeaponPropertyTags(weapon, weaponAbilityOverrides)
  const isBasicMeleeRange =
    (weapon.subcategory ?? "").toLowerCase().includes("melee") &&
    !properties.some((property) => /^reach(?:\s|\(|$)/i.test(property)) &&
    (range === "Melee reach" || /^5\s*ft\.?$/i.test(range ?? ""))
  const baseDamage = getWeaponDamageText(weapon)
  const damageExpression = attack.damageDisplay || baseDamage
  const canMount = buildInputs
    ? canMountWeapon(weapon, buildInputs, weaponProficiencies)
    : false
  const mounted = canMount && isWeaponMounted(activeSheetToggleIds, weapon.id)
  const diceOptions = [
    ...weaponDamageDiceOptions(weapon, { stepDice: mounted }),
    ...optionalWeaponDamageReplacements(weapon, powerRiders),
  ]
  const bonusOptions = optionalWeaponDamageBonuses(weapon, powerRiders, abilityMods, {
    investigatorLevel: buildInputs
      ? buildInputs.classLevels
          .filter((row) => {
            const cls = buildInputs.classes.find((entry) => entry.id === row.classId)
            return /investigator/i.test(cls?.name ?? "")
          })
          .reduce((sum, row) => sum + (row.level ?? 0), 0) || null
      : null,
    activeSheetToggleIds,
  })
  const spellBuffOptions = (availableWeaponSpellBuffs ?? []).map((buff) => ({
    id: buff.toggleId,
    label: buff.label,
    checked: isWeaponSpellBuffActiveOnWeapon({
      toggleId: buff.toggleId,
      weaponId: weapon.id,
      activeToggleIds: activeSheetToggleIds,
      bindings: sheetToggleWeaponIds,
    }),
    title: `${buff.label} on ${weapon.name}`,
  }))
  const sheetContext = buildInputs
    ? buildWeaponSheetContext(weapon, buildInputs, weaponProficiencies)
    : null
  const masteryDescription =
    sheetContext?.masteryDescription ??
    (mastery ? describeWeaponMastery(mastery) : null) ??
    (mastery ? "Homebrew mastery — see item details." : null)
  const masteryActive = sheetContext?.masteryActive ?? false
  const appliedModifiers = sheetContext?.appliedModifiers ?? []
  const handleAttackRoll = () => {
    if (ammoHpCost && ammoHpCost > 0 && onSpendAmmoHp) onSpendAmmoHp()
    onAttackRoll?.(hand === "off" ? "bonus" : "action")
  }

  return (
    <div className="min-w-0 rounded border border-primary/40 bg-primary/5 px-2.5 py-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0 space-y-1">
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
            {mounted ? (
              <span className="rounded-full border border-primary bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                Mounted
              </span>
            ) : null}
            {spellBuffOptions
              .filter((option) => option.checked)
              .map((option) => (
                <span
                  key={option.id}
                  className="rounded-full border border-violet-500/40 bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-800 dark:text-violet-200"
                >
                  {option.label}
                </span>
              ))}
          </div>

          {range || damageExpression ? (
            <p className="text-[10px] text-foreground">
              {damageExpression ? (
                <span className="font-medium">{damageExpression}</span>
              ) : null}
              {range ? (
                <span className="inline-flex items-center gap-0.5">
                  {damageExpression ? <span className="text-muted-foreground mx-1">·</span> : null}
                  {range}
                  {isBasicMeleeRange ? null : (
                    <ConditionInfoTip
                      description={describeWeaponRange(range) ?? range}
                      ariaLabel="Range rules"
                    />
                  )}
                </span>
              ) : null}
            </p>
          ) : null}

          {mastery ||
          properties.length > 0 ||
          appliedModifiers.length > 0 ||
          sheetContext?.extraMasteries.length ? (
            <div className="flex min-w-0 flex-wrap items-center gap-1">
              {mastery ? (
                <span
                  className={cn(
                    "inline-flex max-w-full items-center gap-0.5 rounded-full px-2 py-0.5 text-left text-[10px] font-semibold border",
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
                  className="inline-flex max-w-full items-center gap-0.5 rounded-full border border-primary bg-primary/15 px-2 py-0.5 text-left text-[10px] font-semibold text-primary"
                >
                  {entry.name}
                  <ConditionInfoTip
                    description={entry.description ?? entry.name}
                    ariaLabel={`${entry.name} mastery`}
                  />
                </span>
              ))}
              {properties.map((property) => (
                <span
                  key={property}
                  className={cn(
                    "inline-flex max-w-full items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-left text-[10px] font-medium",
                    weaponModifierBadgeClass(undefined),
                  )}
                >
                  {property}
                  <ConditionInfoTip
                    description={describeWeaponProperty(property) ?? property}
                    ariaLabel={`${property} property`}
                  />
                </span>
              ))}
              {appliedModifiers.map((modifier, index) => (
                <span
                  key={`${modifier.name}-${modifier.sourceLabel ?? index}`}
                  className={cn(
                    "inline-flex max-w-full items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-left text-[10px] font-medium",
                    weaponModifierBadgeClass("feature"),
                  )}
                >
                  {modifier.name}
                  <ConditionInfoTip
                    description={modifier.description}
                    details={
                      modifier.sourceLabel
                        ? [{ label: modifier.name, description: modifier.description, source: modifier.sourceLabel }]
                        : undefined
                    }
                    ariaLabel={`${modifier.name} on ${weapon.name}`}
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
          {canMount && onToggleMounted ? (
            <label className="flex items-center gap-2 pt-0.5 text-[11px]">
              <Switch
                checked={mounted}
                onCheckedChange={() => onToggleMounted(weapon.id)}
                aria-label={`Mount ${weapon.name}`}
              />
              <span className="min-w-0 leading-snug text-muted-foreground">
                Mount (Bonus Action)
              </span>
            </label>
          ) : null}
          {note ? (
            <p className="text-[10px] leading-snug text-amber-800 dark:text-amber-200">{note}</p>
          ) : null}
        </div>

        {/* Stay top-right; wrap To Hit / Dmg into a stack only if this column is too narrow. */}
        <div className="flex w-max max-w-full min-w-0 flex-row flex-wrap justify-end justify-self-end gap-1">
          <div className="w-[6.328125rem] max-w-full">
            <D20RollButton
              modifier={attack.attackBonus}
              title={`${weapon.name} attack`}
              breakdown={attack.attackBreakdown}
              rollContext={{ kind: "attack" }}
              onRoll={handleAttackRoll}
              layout="panel"
              tone={hand === "off" ? "bonus" : "action"}
              caption="To Hit"
              attackPips={hand === "main" ? attackPips : undefined}
            />
          </div>
          {damageExpression ? (
            <div className="w-[6.328125rem] max-w-full">
              <WeaponDamageRollButton
                expression={damageExpression}
                label={`${weapon.name} damage`}
                diceOptions={diceOptions}
                bonusOptions={bonusOptions}
                spellBuffOptions={spellBuffOptions}
                onSpellBuffToggle={(buffId, checked) => {
                  if (!checked && !spellBuffOptions.some((option) => option.id === buffId && option.checked)) {
                    return
                  }
                  onToggleWeaponSpellBuff?.(buffId, weapon.id)
                }}
                showNoModToggle={hand === "off"}
                defaultIncludeAbilityModifier={defaultIncludeAbilityModifier}
                abilityModifier={abilityModifier}
                layout="panel"
                tone="damage"
                caption="Dmg"
                onRoll={onDamageRoll}
              />
            </div>
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
  attackPips,
  onDamageRoll,
  hideHeading = false,
  activeSheetToggleIds,
  sheetToggleWeaponIds,
  availableWeaponSpellBuffs,
  onToggleMounted,
  onToggleWeaponSpellBuff,
  powerRiders,
  weaponAbilityOverrides,
  abilityMods,
}: SheetEquippedWeaponsPanelProps) {
  if (!weapons.length) return null

  return (
    <div>
      {hideHeading ? null : (
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
          Weapon Attacks
        </p>
      )}
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
            attackPips={attackPips}
            onDamageRoll={onDamageRoll}
            activeSheetToggleIds={activeSheetToggleIds}
            sheetToggleWeaponIds={sheetToggleWeaponIds}
            availableWeaponSpellBuffs={availableWeaponSpellBuffs}
            onToggleMounted={onToggleMounted}
            onToggleWeaponSpellBuff={onToggleWeaponSpellBuff}
            powerRiders={powerRiders}
            abilityMods={abilityMods}
            weaponAbilityOverrides={weaponAbilityOverrides}
          />
        ))}
      </div>
    </div>
  )
}
