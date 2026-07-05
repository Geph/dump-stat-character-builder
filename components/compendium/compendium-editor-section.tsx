"use client"

import { useState, type ReactNode } from "react"
import { ChevronDown, Plus } from "lucide-react"
import {
  pageOverlayPanelClass,
  pageOverlayPanelHintClass,
  pageOverlayPanelTitleClass,
} from "@/lib/compendium/editor-field-styles"
import { cn } from "@/lib/utils"

export const compendiumEditorAddButtonClass =
  "flex items-center gap-1 px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors shrink-0"

function CompendiumEditorCollapseButton({
  open,
  onToggle,
  label,
}: {
  open: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={open ? `Collapse ${label}` : `Expand ${label}`}
      className="p-1.5 rounded-lg border border-border/80 bg-background/80 hover:bg-muted/60 transition-colors shrink-0"
    >
      <ChevronDown
        className={cn(
          "h-4 w-4 text-muted-foreground transition-transform",
          open ? "" : "-rotate-90",
        )}
      />
    </button>
  )
}

type CompendiumEditorPanelProps = {
  title?: string
  hint?: string
  children: ReactNode
  className?: string
  /** When titled, panels collapse by default unless defaultOpen is set. */
  collapsible?: boolean
  defaultOpen?: boolean
}

/** Semi-opaque field group for compendium editors over page backgrounds. */
export function CompendiumEditorPanel({
  title,
  hint,
  children,
  className,
  collapsible = Boolean(title),
  defaultOpen = false,
}: CompendiumEditorPanelProps) {
  const [open, setOpen] = useState(defaultOpen)
  const isOpen = !collapsible || open

  return (
    <section className={cn(pageOverlayPanelClass, "p-4 space-y-4", className)}>
      {title ? (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className={pageOverlayPanelTitleClass}>{title}</h2>
            {hint ? <p className={pageOverlayPanelHintClass}>{hint}</p> : null}
          </div>
          {collapsible ? (
            <CompendiumEditorCollapseButton
              open={isOpen}
              onToggle={() => setOpen((value) => !value)}
              label={title}
            />
          ) : null}
        </div>
      ) : null}
      {isOpen ? children : null}
    </section>
  )
}

type CompendiumEditorSectionProps = {
  title: string
  hint?: string
  addLabel?: string
  onAdd?: () => void
  headerActions?: ReactNode
  collapsible?: boolean
  defaultOpen?: boolean
  children: ReactNode
  className?: string
}

/** Major compendium editor section — optional Add action and collapse control. */
export function CompendiumEditorSection({
  title,
  hint,
  addLabel,
  onAdd,
  headerActions,
  collapsible = false,
  defaultOpen = true,
  children,
  className,
}: CompendiumEditorSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const isOpen = !collapsible || open

  return (
    <section className={cn(pageOverlayPanelClass, "p-4 space-y-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className={pageOverlayPanelTitleClass}>{title}</h2>
          {hint ? <p className={pageOverlayPanelHintClass}>{hint}</p> : null}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {headerActions}
          {onAdd && addLabel ? (
            <button type="button" onClick={onAdd} className={compendiumEditorAddButtonClass}>
              <Plus className="w-4 h-4" />
              {addLabel}
            </button>
          ) : null}
          {collapsible ? (
            <CompendiumEditorCollapseButton
              open={isOpen}
              onToggle={() => setOpen((value) => !value)}
              label={title}
            />
          ) : null}
        </div>
      </div>
      {isOpen ? children : null}
    </section>
  )
}
