"use client"

import { Info } from "lucide-react"
import { RichTextContent } from "@/components/compendium/rich-text-editor"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function ConditionInfoTip({
  description,
  source,
  details,
  ariaLabel = "More information",
}: {
  description: string
  source?: string
  details?: { label: string; description: string; source?: string }[]
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
        {details?.length ? (
          <div className="space-y-2">
            {details.map((detail, index) => (
              <div key={`${detail.label}-${detail.source ?? ""}-${index}`}>
                <p className="text-xs font-semibold">{detail.label}</p>
                <RichTextContent
                  html={detail.description}
                  className="text-xs text-inherit [&_p]:mb-1 [&_p:last-child]:mb-0"
                  fallback=""
                />
                {detail.source ? (
                  <p className="text-[10px] opacity-70">
                    <span className="font-semibold">Source:</span> {detail.source}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <RichTextContent
            html={description}
            className="text-xs text-inherit [&_p]:mb-1 [&_p:last-child]:mb-0"
            fallback=""
          />
        )}
        {source ? (
          <p className="mt-1 border-t border-current/30 pt-1 text-[10px] opacity-70">
            <span className="font-semibold">Source:</span> {source}
          </p>
        ) : null}
      </TooltipContent>
    </Tooltip>
  )
}
