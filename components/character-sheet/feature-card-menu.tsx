"use client"

import { Plus, Pin, Swords, UserCircle } from "lucide-react"
import type { FeatureActionPinTarget } from "@/lib/character/feature-layout"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Feature options"
          onClick={(event) => event.stopPropagation()}
          className="rounded p-0.5 text-muted-foreground hover:bg-background/70 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={4}
        className="z-[200] w-56 bg-card text-foreground"
      >
        <DropdownMenuItem
          className="gap-2 text-xs"
          onSelect={() => onTogglePin()}
        >
          <Pin className="h-3.5 w-3.5" />
          {pinned ? "Unpin from top" : "Pin at top"}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 text-xs"
          onSelect={() => onToggleAction("utility")}
        >
          <UserCircle className="h-3.5 w-3.5" />
          {actionPins.includes("utility")
            ? "Remove from Abilities & Skills actions"
            : "Add to Abilities & Skills actions"}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 text-xs"
          onSelect={() => onToggleAction("combat")}
        >
          <Swords className="h-3.5 w-3.5" />
          {actionPins.includes("combat")
            ? "Remove from Combat actions"
            : "Add to Combat actions"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
