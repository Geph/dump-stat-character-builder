"use client"

import { DamageRollButton } from "@/components/character-sheet/damage-roll-button"
import { D20RollButton } from "@/components/character-sheet/d20-roll-button"
import { ConditionInfoTip } from "@/components/character-sheet/condition-info-tip"
import type { CharacterBuildInputs } from "@/lib/character/types"
import {
  getWeaponDamageText,
  getWeaponMastery,
  getWeaponPropertyTags,
  getWeaponRangeText,
} from "@/lib/compendium/combat-stats"
import { describeWeaponMastery } from "@/lib/compendium/weapon-mastery"
import {
  describeWeaponProperty,
  describeWeaponRange,
} from "@/lib/compendium/weapon-property-reference"
import { buildWeaponSheetContext } from "@/lib/compendium/weapon-sheet-context"
import type { WeaponAttackDerived } from "@/lib/character/types"
import type { Equipment } from "@/lib/types"
import { cn } from "@/lib/utils"

type SheetEquippedWeaponsPanelProps = {
  weapon: Equipment | null
  attack: WeaponAttackDerived | null
  buildInputs: CharacterBuildInputs | null
  weaponProficiencies: string[]
}

function WeaponAttackCard({
  weapon,
  attack,
  buildInputs,
  weaponProficiencies,
}: {
  weapon: Equipment
  attack: WeaponAttackDerived
  buildInputs: CharacterBuildInputs | null
  weaponProficiencies: string[]
}) {
  const range = getWeaponRangeText(weapon)
  const mastery = getWeaponMastery(weapon)
  const properties = getWeaponPropertyTags(weapon)
  const baseDamage = getWeaponDamageText(weapon)
  const damageExpression = attack.damageDisplay || baseDamage
  const sheetContext = buildInputs
    ? buildWeaponSheetContext(weapon, buildInputs, weaponProficiencies)
    : null
  const masteryDescription =
    sheetContext?.masteryDescription ??
    (mastery ? describeWeaponMastery(mastery) : null) ??
    (mastery ? "Homebrew mastery — see item details." : null)
  const masteryActive = sheetContext?.masteryActive ?? false

  return (
    <div className="rounded border border-primary/40 bg-primary/5 px-2.5 py-2 space-y-2 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">{weapon.name}</p>
          {weapon.subcategory ? (
            <p className="text-[10px] text-muted-foreground">{weapon.subcategory}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase">To Hit</span>
            <D20RollButton modifier={attack.attackBonus} title={`${weapon.name} attack`} />
          </div>
          {damageExpression ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground uppercase">Dmg</span>
              <DamageRollButton expression={damageExpression} label={`${weapon.name} damage`} />
            </div>
          ) : null}
        </div>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[10px]">
        {range ? (
          <>
            <dt className="text-muted-foreground font-semibold">Range</dt>
            <dd className="text-foreground">
              <span className="inline-flex items-center gap-0.5">
                {range}
                <ConditionInfoTip
                  description={describeWeaponRange(range) ?? range}
                  ariaLabel="Range rules"
                />
              </span>
            </dd>
          </>
        ) : null}
        {baseDamage ? (
          <>
            <dt className="text-muted-foreground font-semibold">Damage</dt>
            <dd className="text-foreground">
              {baseDamage}
              {weapon.damage_type ? ` ${weapon.damage_type}` : ""}
            </dd>
          </>
        ) : null}
        {mastery ? (
          <>
            <dt className="text-muted-foreground font-semibold">Mastery</dt>
            <dd>
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
            </dd>
          </>
        ) : null}
      </dl>

      {properties.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {properties.map((property) => {
            const description = describeWeaponProperty(property)
            return (
              <span
                key={property}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-medium text-foreground"
              >
                {property}
                {description ? (
                  <ConditionInfoTip description={description} ariaLabel={`${property} property`} />
                ) : null}
              </span>
            )
          })}
        </div>
      ) : null}

      {sheetContext?.appliedModifiers.length ? (
        <div className="space-y-1 pt-0.5 border-t border-border/60">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Common modifiers
          </p>
          <div className="flex flex-wrap gap-1">
            {sheetContext.appliedModifiers.map((modifier) => (
              <span
                key={`${modifier.name}-${modifier.description}`}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-[10px] font-medium text-foreground"
              >
                {modifier.name}
                <ConditionInfoTip
                  description={modifier.description}
                  ariaLabel={`${modifier.name} modifier`}
                />
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function SheetEquippedWeaponsPanel({
  weapon,
  attack,
  buildInputs,
  weaponProficiencies,
}: SheetEquippedWeaponsPanelProps) {
  if (!weapon || !attack) return null

  return (
    <div className="mb-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
        Weapon Attacks
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <WeaponAttackCard
          weapon={weapon}
          attack={attack}
          buildInputs={buildInputs}
          weaponProficiencies={weaponProficiencies}
        />
      </div>
    </div>
  )
}
