"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { Info, X } from "lucide-react"
import { RichTextContent } from "@/components/compendium/rich-text-editor"
import { cn } from "@/lib/utils"

type CatalogOptionDescriptionHoverProps = {
  name: string
  description?: string | null
  /** Compact trigger for cinematic card corners. */
  compact?: boolean
  className?: string
}

/**
 * Info button for catalog options (Eldritch Invocations, Metamagic, …).
 * Opens a full-screen overlay so long descriptions stay readable on mobile.
 */
export function CatalogOptionDescriptionHover({
  name,
  description,
  compact = false,
  className,
}: CatalogOptionDescriptionHoverProps) {
  const html = description?.trim()
  const [open, setOpen] = useState(false)
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  if (!html) return null

  return (
    <>
      <button
        type="button"
        aria-label={`About ${name}`}
        aria-expanded={open}
        className={cn(
          "shrink-0 rounded-md border border-border/80 bg-background/80 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary",
          compact ? "p-1" : "p-1.5",
          className,
        )}
        onClick={(event) => {
          event.stopPropagation()
          setOpen(true)
        }}
      >
        <Info className={compact ? "h-3 w-3" : "h-4 w-4"} />
      </button>

      {portalReady
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  key={`catalog-option-info-${name}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 p-4 sm:items-center"
                  onClick={() => setOpen(false)}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="catalog-option-info-title"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 16 }}
                    className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border-2 border-primary/40 bg-card p-4 shadow-2xl sm:p-5"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <p className="pr-8 text-xs font-bold uppercase tracking-wide text-primary">
                      Details
                    </p>
                    <h4
                      id="catalog-option-info-title"
                      className="mt-1 pr-8 text-lg font-black text-foreground"
                    >
                      {name}
                    </h4>
                    <div className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      <RichTextContent html={html} />
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  )
}
