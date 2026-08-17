"use client"

import { Plus, Pin, Swords, UserCircle } from "lucide-react"
import { useState } from "react"
import type { FeatureActionPinTarget } from "@/lib/character/feature-layout"

export function FeatureCardMenu({
  pinned,
  actionPins,
  onTogglePin,
  onToggleAction,
}: {
  pinned: boolean
  actionPins: FeatureActionPinTarget[]
  onTogglePin: () => void
  onToggleAction: (target: FeatureActionPinTarget) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Feature options"
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
        }}
        className="rounded p-0.5 text-muted-foreground hover:bg-background/70 hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-card py-1 shadow-xl">
            <button
              type="button"
              onClick={() => {
                onTogglePin()
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted"
            >
              <Pin className="h-3.5 w-3.5" />
              {pinned ? "Unpin from top" : "Pin at top"}
            </button>
            <button
              type="button"
              onClick={() => {
                onToggleAction("utility")
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted"
            >
              <UserCircle className="h-3.5 w-3.5" />
              {actionPins.includes("utility")
                ? "Remove from Abilities & Skills actions"
                : "Add to Abilities & Skills actions"}
            </button>
            <button
              type="button"
              onClick={() => {
                onToggleAction("combat")
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted"
            >
              <Swords className="h-3.5 w-3.5" />
              {actionPins.includes("combat") ? "Remove from Combat actions" : "Add to Combat actions"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
