"use client"
import { SIGNATURE_DRAG_TYPE } from "@/lib/character/signature-abilities"

import { Wand2 } from "lucide-react"
import type { Spell } from "@/lib/types"
import { SHEET_COMBAT_PANEL } from "@/lib/character/sheet-status-colors"
import { SheetSectionHeading } from "./sheet-section-heading"

type SheetSpellsPanelProps = {
  groups: { level: number; label: string; spells: Spell[] }[]
  alwaysPreparedSpellIds: ReadonlySet<string>
  spellResourceCastCosts: { has: (id: string) => boolean }
  onSelect: (spell: Spell) => void
}

/** Content-sized spell tiles keep touch targets usable without fixed column counts. */
export function SheetSpellsPanel({
  groups,
  alwaysPreparedSpellIds,
  spellResourceCastCosts,
  onSelect,
}: SheetSpellsPanelProps) {
  return (
    <div id="sheet-spells" className={`${SHEET_COMBAT_PANEL.spells} min-w-0 rounded-xl border border-border p-3`}>
      <SheetSectionHeading icon={Wand2}>Spells</SheetSectionHeading>
      {groups.length ? (
        <div
          className="grid max-h-[420px] items-start gap-x-3 gap-y-2.5 overflow-y-auto pr-1"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))" }}
        >
          {groups.map((group) => (
            <div key={group.level}>
              <h3 className="mb-1.5 flex items-center gap-1.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {group.label}
                <span className="font-medium text-muted-foreground/60">({group.spells.length})</span>
                <span className="h-px flex-1 bg-border/70" aria-hidden />
              </h3>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 140px), 1fr))" }}>
                {group.spells.map((spell) => (
                  <button
                    key={spell.id}
                    draggable
                    onDragStart={event => event.dataTransfer.setData(SIGNATURE_DRAG_TYPE, JSON.stringify({ kind: "spell", id: spell.id }))}
                    type="button"
                    onClick={() => onSelect(spell)}
                    title={spell.name}
                    className="flex min-h-11 min-w-0 items-center justify-between gap-1.5 rounded-lg border border-border/80 bg-muted/40 px-2.5 py-1.5 text-left text-xs transition-colors hover:border-primary/40 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="line-clamp-2 min-w-0 break-words font-semibold leading-snug">{spell.name}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {alwaysPreparedSpellIds.has(spell.id) && (
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400"
                          title={spellResourceCastCosts.has(spell.id)
                            ? "Granted by a discipline / feature (cast with class resource)"
                            : "Always prepared by your subclass"}
                        />
                      )}
                      {spell.concentration && (
                        <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400" title="Concentration">C</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No spells prepared</p>
      )}
    </div>
  )
}
