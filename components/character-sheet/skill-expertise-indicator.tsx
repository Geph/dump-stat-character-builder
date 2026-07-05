"use client"

import { Star } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function SkillExpertiseIndicator() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex items-center justify-center rounded px-0.5 py-0.5 bg-orange/15 text-orange border border-orange/25 shrink-0"
          aria-label="Expertise"
        >
          <Star className="h-3 w-3 fill-current" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        Expertise
      </TooltipContent>
    </Tooltip>
  )
}
