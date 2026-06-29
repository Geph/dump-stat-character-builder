"use client"

import { useState } from "react"
import { RichTextContent } from "@/components/compendium/rich-text-editor"
import { cn } from "@/lib/utils"

type ExpandableDescriptionProps = {
  text: string
  collapsedLines?: number
  className?: string
}

export function ExpandableDescription({
  text,
  collapsedLines = 3,
  className = "text-muted-foreground",
}: ExpandableDescriptionProps) {
  const [expanded, setExpanded] = useState(false)
  const plain = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  const isLong = plain.length > 180

  return (
    <div>
      <div
        className={cn(!expanded && isLong && `line-clamp-${collapsedLines}`, className)}
        style={
          !expanded && isLong
            ? {
                display: "-webkit-box",
                WebkitLineClamp: collapsedLines,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }
            : undefined
        }
      >
        <RichTextContent html={text} className="text-xs [&_p]:mb-1 [&_p:last-child]:mb-0" />
      </div>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1 text-[10px] font-semibold text-primary hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  )
}

/** Truncated rich-text blurb for compact previews (builder sidebar, pickers, etc.). */
export function ClampedRichText({
  html,
  lines = 2,
  className,
  fallback,
}: {
  html: string | null | undefined
  lines?: number
  className?: string
  fallback?: string
}) {
  if (!html?.trim()) {
    if (!fallback) return null
    return <p className={cn("text-muted-foreground", className)}>{fallback}</p>
  }

  return (
    <div
      className={cn("text-muted-foreground overflow-hidden", className)}
      style={{
        display: "-webkit-box",
        WebkitLineClamp: lines,
        WebkitBoxOrient: "vertical",
      }}
    >
      <RichTextContent
        html={html}
        className="text-inherit [&_p]:mb-0 [&_p:last-child]:mb-0"
        fallback=""
      />
    </div>
  )
}
