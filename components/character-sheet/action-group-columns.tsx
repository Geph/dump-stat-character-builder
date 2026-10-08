"use client"

import { useRef, useState, type DragEvent, type ReactNode } from "react"
import { ArrowDown, ArrowLeftRight, ArrowUp, GripVertical, LayoutGrid, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { actionGroupTheme } from "@/components/character-sheet/action-group-theme"
import { useActionGroupMeasurements } from "@/components/character-sheet/use-action-group-measurements"
import { isNoOpActionGroupSlot, packActionGroups, type ActionGroupColumnMap, type ActionGroupDropSlot } from "@/lib/character/action-group-layout"
import { cn } from "@/lib/utils"

export type ActionGroupColumnItem = { id: string; label: string; body: ReactNode; count?: number }

type Props = {
  groups: ActionGroupColumnItem[]
  preferredColumns: ActionGroupColumnMap
  canDrag: boolean
  onPlace: (groupId: string, slot: ActionGroupDropSlot, columnIds: string[]) => void
  onReset: () => void
}

/** A measured masonry board. Group bodies keep their existing actions and trackers. */
export function ActionGroupColumns({ groups, preferredColumns, canDrag, onPlace, onReset }: Props) {
  const { boardRef, heights, columnCount } = useActionGroupMeasurements(groups.map((g) => g.id).join("|"))
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropSlot, setDropSlot] = useState<ActionGroupDropSlot | null>(null)
  const draggingRef = useRef<string | null>(null)
  const dropRef = useRef<ActionGroupDropSlot | null>(null)
  const [announcement, setAnnouncement] = useState("")
  const placements = packActionGroups(groups.map((g) => g.id), heights, columnCount, preferredColumns)
  const columns = [0, 1].map((column) => placements.filter((p) => p.column === column).map((p) => p.id))
  const boardHeight = Math.max(0, ...placements.map((p) => p.top + p.height))
  const draggingLabel = groups.find((g) => g.id === draggingId)?.label ?? "group"

  const finish = () => {
    draggingRef.current = null
    dropRef.current = null
    setDraggingId(null)
    setDropSlot(null)
  }
  const place = (id: string, slot: ActionGroupDropSlot) => {
    onPlace(id, slot, columns[slot.column])
    setAnnouncement(`${groups.find((g) => g.id === id)?.label ?? "Group"} moved`)
  }
  const hover = (event: DragEvent) => {
    const fromId = draggingRef.current
    const board = boardRef.current
    if (!canDrag || !fromId || !board) return
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    const rect = board.getBoundingClientRect()
    const column: 0 | 1 = columnCount === 1 || event.clientX < rect.left + rect.width / 2 ? 0 : 1
    const y = event.clientY - rect.top
    const target = placements.find((p) => p.column === column && y < p.top + p.height / 2)
    const next: ActionGroupDropSlot = { column, beforeId: target?.id ?? null }
    const sourceColumn = placements.find((p) => p.id === fromId)?.column ?? 0
    const slot = isNoOpActionGroupSlot(next, fromId, sourceColumn, columns[column]) ? null : next
    dropRef.current = slot
    setDropSlot((previous) => previous?.column === slot?.column && previous?.beforeId === slot?.beforeId ? previous : slot)
  }
  const start = (event: DragEvent<HTMLButtonElement>, group: ActionGroupColumnItem) => {
    draggingRef.current = group.id
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", group.id)
    const card = event.currentTarget.closest<HTMLElement>("[data-action-group-card]")
    if (card) {
      const rect = card.getBoundingClientRect()
      event.dataTransfer.setDragImage(card, event.clientX - rect.left, event.clientY - rect.top)
    }
    window.setTimeout(() => { if (draggingRef.current === group.id) setDraggingId(group.id) }, 0)
  }
  const markerTop = dropSlot?.beforeId
    ? placements.find((p) => p.id === dropSlot.beforeId)?.top ?? 0
    : Math.max(0, ...placements.filter((p) => p.column === dropSlot?.column).map((p) => p.top + p.height + 10))

  return <div className="space-y-2">
    <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
      <span className="flex items-center gap-1.5"><GripVertical className="h-3.5 w-3.5" /> Drag a group header to arrange</span>
      <button type="button" onClick={onReset} className="flex items-center gap-1 rounded-md px-2 py-1 font-semibold hover:bg-primary/10 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary" title="Clear saved positions and balance groups by height">
        <LayoutGrid className="h-3 w-3" /> Auto arrange
      </button>
    </div>
    <div role="status" aria-live="polite" className="sr-only">{announcement}</div>
    <div ref={boardRef} data-action-group-board className="relative grid min-w-0 gap-x-3"
      style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`, gridAutoRows: "1px", minHeight: boardHeight }}
      onDragOver={hover}
      onDrop={(event) => {
        event.preventDefault()
        const id = draggingRef.current
        const slot = dropRef.current
        finish()
        if (id && slot) place(id, slot)
      }}>
      {groups.map((group, index) => {
        const position = placements[index]
        const theme = actionGroupTheme(group.id)
        const column = columns[position.column]
        const inColumn = column.indexOf(group.id)
        return <section key={group.id} aria-label={`${group.label} group`}
          style={{ gridColumn: position.column + 1, gridRow: `${position.top + 1} / span ${position.height}` }}
          className={cn("min-w-0 self-start", draggingId === group.id && "opacity-35")}>
          <div data-action-group-card={group.id} className={cn("overflow-hidden rounded-xl border bg-card/70 shadow-sm", theme.edge,
            group.id === "weapons" && "border-transparent bg-transparent shadow-none")}>
            <div className={cn("flex items-center border-b bg-gradient-to-r", theme.header, theme.edge)}>
              <button type="button" draggable={canDrag} onDragStart={(event) => start(event, group)} onDragEnd={finish}
                onKeyDown={(event) => { if (event.key === "Escape") finish() }}
                aria-label={`Drag to move ${group.label}`} title={`Drag to move ${group.label}; use the menu for keyboard controls`}
                className={cn("flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left focus-visible:outline-2 focus-visible:outline-primary", theme.color, canDrag && "cursor-grab active:cursor-grabbing")}>
                <theme.Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-[10px] font-extrabold uppercase tracking-wider">{group.label}</span>
                {group.count != null ? <span className="rounded bg-background/70 px-1.5 text-[10px] font-bold tabular-nums">{group.count}</span> : null}
                <GripVertical className="h-4 w-4 opacity-50" />
              </button>
              {canDrag ? <DropdownMenu>
                <DropdownMenuTrigger asChild><button type="button" aria-label={`Move ${group.label}`} className="mr-1 rounded-md p-1.5 text-muted-foreground hover:bg-background/70 focus-visible:outline-2 focus-visible:outline-primary"><MoreHorizontal className="h-4 w-4" /></button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled={inColumn === 0} onSelect={() => place(group.id, { column: position.column, beforeId: column[inColumn - 1] })}><ArrowUp className="mr-2 h-4 w-4" /> Move up</DropdownMenuItem>
                  <DropdownMenuItem disabled={inColumn === column.length - 1} onSelect={() => place(group.id, { column: position.column, beforeId: column[inColumn + 2] ?? null })}><ArrowDown className="mr-2 h-4 w-4" /> Move down</DropdownMenuItem>
                  {columnCount === 2 ? <DropdownMenuItem onSelect={() => place(group.id, { column: position.column === 0 ? 1 : 0, beforeId: null })}><ArrowLeftRight className="mr-2 h-4 w-4" /> Move to {position.column === 0 ? "right" : "left"} column</DropdownMenuItem> : null}
                </DropdownMenuContent>
              </DropdownMenu> : null}
            </div>
            <div className={group.id === "weapons" ? "pt-1.5" : "p-1.5"}>{group.body}</div>
          </div>
        </section>
      })}
      {dropSlot ? <div aria-hidden className="pointer-events-none absolute z-20 h-1 rounded bg-primary shadow-[0_0_8px_var(--primary)]"
        style={{ top: Math.max(0, markerTop - 5), left: columnCount === 2 && dropSlot.column === 1 ? "calc(50% + 6px)" : 0, width: columnCount === 2 ? "calc(50% - 6px)" : "100%" }}>
        <span className="absolute -top-3 left-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">Move {draggingLabel} here</span>
      </div> : null}
    </div>
  </div>
}
