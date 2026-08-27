"use client"

import { Info } from "lucide-react"
import { RichTextContent } from "@/components/compendium/rich-text-editor"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function ConditionInfoTip({
  description,
  source,
  ariaLabel = "More information",
}: {
  description: string
  source?: string
  ariaLabel?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="p-0.5 text-muted-foreground hover:text-foreground shrink-0"
          aria-label={ariaLabel}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Info className="w-3 h-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={6} className="max-w-[260px] text-left">
        <RichTextContent
          html={description}
          className="text-xs text-inherit [&_p]:mb-1 [&_p:last-child]:mb-0"
          fallback=""
        />
        {source ? (
          <p className="mt-1 border-t border-border/60 pt-1 text-[10px] text-muted-foreground">
            <span className="font-semibold text-foreground">Source:</span> {source}
          </p>
        ) : null}
      </TooltipContent>
    </Tooltip>
  )
}
