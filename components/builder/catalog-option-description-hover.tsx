"use client"

import { Info } from "lucide-react"
import { RichTextContent } from "@/components/compendium/rich-text-editor"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"

type CatalogOptionDescriptionHoverProps = {
  name: string
  description?: string | null
}

export function CatalogOptionDescriptionHover({
  name,
  description,
}: CatalogOptionDescriptionHoverProps) {
  const html = description?.trim()
  if (!html) return null

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          aria-label={`About ${name}`}
          className="shrink-0 rounded-md border border-border/80 bg-background/80 p-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
          onClick={(event) => event.stopPropagation()}
        >
          <Info className="h-4 w-4" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        side="left"
        align="start"
        className="z-[70] w-80 max-h-[min(70vh,24rem)] overflow-y-auto"
      >
        <p className="text-xs font-bold uppercase tracking-wide text-primary mb-1">{name}</p>
        <RichTextContent html={html} className="text-sm text-muted-foreground" />
      </HoverCardContent>
    </HoverCard>
  )
}
