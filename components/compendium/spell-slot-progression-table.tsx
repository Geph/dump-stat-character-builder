"use client"

import type { CasterSlotType } from "@/lib/compendium/spell-slots"
import type { DndClass } from "@/lib/types"
import {
  formatSpellSlotLevel,
  getCasterSlotType,
  getSpellSlotTable,
  spellSlotTableForCasterType,
} from "@/lib/compendium/spell-slots"

type SpellSlotProgressionTableProps = {
  /** Resolve the progression from a specific class + its spellcasting config. */
  className?: string
  spellcasting?: DndClass["spellcasting"] | null
  /** Or resolve directly from a caster progression type (no class needed). */
  casterType?: CasterSlotType
}

const CHARACTER_LEVELS = Array.from({ length: 20 }, (_, i) => i + 1)

export function SpellSlotProgressionTable({
  className,
  spellcasting,
  casterType: casterTypeProp,
}: SpellSlotProgressionTableProps) {
  const casterType =
    casterTypeProp ?? (className ? getCasterSlotType(className, spellcasting) : null)
  if (!casterType) return null

  const tableAt = (level: number) =>
    casterTypeProp
      ? spellSlotTableForCasterType(casterTypeProp, level)
      : getSpellSlotTable(className ?? "", level, spellcasting)

  const rows = CHARACTER_LEVELS.map((level) => ({
    level,
    table: tableAt(level),
  }))

  const maxSpellLevel = rows.reduce((max, row) => {
    const highest = row.table?.slotsByLevel.reduce(
      (slotMax, count, idx) => (count > 0 ? idx + 1 : slotMax),
      0,
    )
    return Math.max(max, highest ?? 0)
  }, 0)

  if (maxSpellLevel === 0 && casterType !== "pact") {
    return (
      <p className="text-xs text-muted-foreground">
        No spell slots at this caster type until higher class levels.
      </p>
    )
  }

  if (casterType === "pact") {
    return (
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/40">
              <th className="px-3 py-2 text-left text-xs font-bold text-muted-foreground uppercase">
                Class level
              </th>
              <th className="px-3 py-2 text-center text-xs font-bold text-muted-foreground uppercase">
                Slots
              </th>
              <th className="px-3 py-2 text-center text-xs font-bold text-muted-foreground uppercase">
                Slot level
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ level, table }) => {
              const total = table?.slotsByLevel.reduce((sum, count) => sum + count, 0) ?? 0
              const slotLevel = table?.pactSlotLevel
              return (
                <tr key={level} className="border-t border-border">
                  <td className="px-3 py-1.5 font-medium text-foreground">{level}</td>
                  <td className="px-3 py-1.5 text-center tabular-nums">
                    {total > 0 ? total : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-center tabular-nums text-muted-foreground">
                    {slotLevel ? formatSpellSlotLevel(slotLevel) : "—"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
          Pact magic: all slots share the same spell level and recharge on a short rest.
        </p>
      </div>
    )
  }

  const spellLevels = Array.from({ length: maxSpellLevel }, (_, i) => i + 1)

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm border-collapse min-w-[28rem]">
        <thead>
          <tr className="bg-muted/40">
            <th className="sticky left-0 z-10 bg-muted/40 px-3 py-2 text-left text-xs font-bold text-muted-foreground uppercase border-r border-border">
              Level
            </th>
            {spellLevels.map((spellLevel) => (
              <th
                key={spellLevel}
                className="px-2 py-2 text-center text-xs font-bold text-muted-foreground uppercase whitespace-nowrap"
              >
                {formatSpellSlotLevel(spellLevel)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ level, table }) => (
            <tr key={level} className="border-t border-border hover:bg-muted/20">
              <td className="sticky left-0 z-10 bg-card px-3 py-1.5 font-medium text-foreground border-r border-border">
                {level}
              </td>
              {spellLevels.map((spellLevel) => {
                const count = table?.slotsByLevel[spellLevel - 1] ?? 0
                return (
                  <td
                    key={spellLevel}
                    className={`px-2 py-1.5 text-center tabular-nums ${
                      count > 0 ? "text-foreground" : "text-muted-foreground/40"
                    }`}
                  >
                    {count > 0 ? count : "—"}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {casterType === "half" && (
        <p className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
          Half-caster progression (Paladin, Ranger): spell slots begin at class level 2.
        </p>
      )}
      {casterType === "third" && (
        <p className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
          One-third caster progression (Eldritch Knight, Arcane Trickster): spell slots begin at
          class level 3.
        </p>
      )}
    </div>
  )
}
