"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { DEFAULT_SHEET_ACTIONS } from "@/lib/character/default-actions"
import { ConditionInfoTip } from "@/components/character-sheet/condition-info-tip"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

export function SheetDefaultActionsPanel() {
  const [open, setOpen] = useState(true)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-3">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/40 transition-colors">
          <div>
            <h2 className="text-sm font-bold text-foreground">Default Actions</h2>
            <p className="text-[10px] text-muted-foreground">
              Standard 2024 actions — one action per turn unless noted
            </p>
          </div>
          <ChevronDown
            className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-1 border-t border-border/60">
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_SHEET_ACTIONS.map((action) => (
                <span
                  key={action.id}
                  className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md text-xs font-medium bg-secondary/15 text-foreground border border-border/50"
                >
                  {action.name}
                  <ConditionInfoTip description={action.description} />
                </span>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
