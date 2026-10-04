"use client"

import { Fragment, useRef, useState, type DragEvent, type ReactNode } from "react"
import { GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  isNoOpActionGroupSlot,
  type ActionGroupDropSlot,
} from "@/lib/character/action-group-layout"

export type ActionGroupColumnItem = {
  id: string
  label: string
  body: ReactNode
}

type ActionGroupColumnsProps = {
  /** Groups per column, in display order. */
  columns: readonly [ActionGroupColumnItem[], ActionGroupColumnItem[]]
  canDrag: boolean
  onPlace: (groupId: string, slot: ActionGroupDropSlot) => void
}

function sameSlot(a: ActionGroupDropSlot | null, b: ActionGroupDropSlot | null): boolean {
  return a?.column === b?.column && a?.beforeId === b?.beforeId
}

function DropPlaceholder({ label }: { label: string }) {
  return (
    <div
      aria-hidden
      className="flex h-12 items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/10 text-[10px] font-bold uppercase tracking-wide text-primary"
    >
      Move {label} here
    </div>
  )
}

/** Desktop two-column action groups with drag-to-rearrange drop slots. */
export function ActionGroupColumns({ columns, canDrag, onPlace }: ActionGroupColumnsProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropSlot, setDropSlot] = useState<ActionGroupDropSlot | null>(null)
  const draggingIdRef = useRef<string | null>(null)

  const columnIds = [columns[0].map((group) => group.id), columns[1].map((group) => group.id)] as const
  const draggingColumn: 0 | 1 | null = draggingId
    ? columnIds[0].includes(draggingId)
      ? 0
      : columnIds[1].includes(draggingId)
        ? 1
        : null
    : null
  const draggingLabel =
    [...columns[0], ...columns[1]].find((group) => group.id === draggingId)?.label ?? "group"

  const isLiveSlot = (slot: ActionGroupDropSlot) =>
    draggingId != null &&
    draggingColumn != null &&
    !isNoOpActionGroupSlot(slot, draggingId, draggingColumn, columnIds[slot.column])

  const hover = (event: DragEvent, slot: ActionGroupDropSlot) => {
    if (!canDrag || !draggingIdRef.current) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = "move"
    const next = isLiveSlot(slot) ? slot : null
    setDropSlot((previous) => (sameSlot(previous, next) ? previous : next))
  }

  const endDrag = () => {
    draggingIdRef.current = null
    setDraggingId(null)
    setDropSlot(null)
  }

  const drop = (event: DragEvent) => {
    if (!canDrag) return
    event.preventDefault()
    event.stopPropagation()
    const fromId = draggingIdRef.current
    const slot = dropSlot
    endDrag()
    if (fromId && slot) onPlace(fromId, slot)
  }

  const dragging = draggingId != null

  return (
    <div
      className={cn(
        "hidden min-w-0 grid-cols-2 gap-3 xl:grid",
        dragging ? "items-stretch" : "items-start",
      )}
    >
      {columns.map((groups, columnIndex) => {
        const column = columnIndex as 0 | 1
        const endSlot: ActionGroupDropSlot = { column, beforeId: null }
        const endActive = sameSlot(dropSlot, endSlot)
        return (
          <div
            key={column}
            className={cn(
              "min-h-16 min-w-0 space-y-3 rounded-lg transition-colors",
              dragging && "outline-2 outline-offset-4 outline-dashed outline-border",
              dragging && dropSlot?.column === column && "outline-primary/60",
            )}
            onDragOver={(event) => hover(event, endSlot)}
            onDrop={drop}
          >
            {groups.map((group, index) => {
              const beforeSlot: ActionGroupDropSlot = { column, beforeId: group.id }
              const afterSlot: ActionGroupDropSlot = {
                column,
                beforeId: groups[index + 1]?.id ?? null,
              }
              const isDragged = group.id === draggingId
              return (
                <Fragment key={group.id}>
                  {sameSlot(dropSlot, beforeSlot) ? <DropPlaceholder label={draggingLabel} /> : null}
                  <div
                    className={cn("relative min-w-0 transition-opacity", isDragged && "opacity-40")}
                    onDragOver={(event) => {
                      const rect = event.currentTarget.getBoundingClientRect()
                      const upperHalf = event.clientY < rect.top + rect.height / 2
                      hover(event, upperHalf ? beforeSlot : afterSlot)
                    }}
                    onDrop={drop}
                  >
                    {dragging && !isDragged && isLiveSlot(beforeSlot) && !sameSlot(dropSlot, beforeSlot) ? (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute -top-[7px] left-0 right-0 h-0.5 rounded-full bg-primary/30"
                      />
                    ) : null}
                    <div
                      className={cn(
                        "mb-1.5 flex items-center gap-1",
                        canDrag && "cursor-grab active:cursor-grabbing",
                      )}
                      draggable={canDrag}
                      title={canDrag ? `Drag to move ${group.label}` : undefined}
                      onDragStart={(event) => {
                        if (!canDrag) {
                          event.preventDefault()
                          return
                        }
                        draggingIdRef.current = group.id
                        event.dataTransfer.effectAllowed = "move"
                        event.dataTransfer.setData("text/plain", group.id)
                        const card = event.currentTarget.parentElement
                        if (card) {
                          const rect = card.getBoundingClientRect()
                          event.dataTransfer.setDragImage(
                            card,
                            event.clientX - rect.left,
                            event.clientY - rect.top,
                          )
                        }
                        // Defer so the browser captures the drag image before slots render.
                        window.setTimeout(() => setDraggingId(group.id), 0)
                      }}
                      onDragEnd={endDrag}
                    >
                      <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        {group.label}
                      </p>
                    </div>
                    {group.body}
                  </div>
                </Fragment>
              )
            })}
            {endActive ? <DropPlaceholder label={draggingLabel} /> : null}
            {dragging && !groups.length && !endActive ? (
              <div className="flex h-12 items-center justify-center rounded-lg border-2 border-dashed border-border text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Drop here
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
