"use client"

import { useLayoutEffect, useRef, useState } from "react"

/** Observe content, not grid spans, so wrapping and use trackers can resize the board. */
export function useActionGroupMeasurements(groupIds: string) {
  const boardRef = useRef<HTMLDivElement>(null)
  const [heights, setHeights] = useState<Record<string, number>>({})
  const [columnCount, setColumnCount] = useState<1 | 2>(2)
  useLayoutEffect(() => {
    const board = boardRef.current
    if (!board) return
    // Measure before paint too: estimated grid spans must not briefly overlap on load.
    setColumnCount(board.getBoundingClientRect().width >= 600 ? 2 : 1)
    setHeights((previous) => {
      const next = { ...previous }
      let changed = false
      board.querySelectorAll<HTMLElement>("[data-action-group-card]").forEach((card) => {
        const id = card.dataset.actionGroupCard!
        const height = Math.ceil(card.getBoundingClientRect().height)
        if (next[id] !== height) { next[id] = height; changed = true }
      })
      return changed ? next : previous
    })
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === board) setColumnCount(entry.contentRect.width >= 600 ? 2 : 1)
      }
      setHeights((previous) => {
        const next = { ...previous }
        let changed = false
        for (const entry of entries) {
          const element = entry.target as HTMLElement
          const id = element.dataset.actionGroupCard
          if (!id) continue
          const height = Math.ceil(element.getBoundingClientRect().height)
          if (next[id] !== height) { next[id] = height; changed = true }
        }
        return changed ? next : previous
      })
    })
    observer.observe(board)
    board.querySelectorAll<HTMLElement>("[data-action-group-card]").forEach((card) => observer.observe(card))
    return () => observer.disconnect()
  }, [groupIds, columnCount])
  return { boardRef, heights, columnCount }
}
