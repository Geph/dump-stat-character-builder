"use client"

import { useEffect } from "react"
import { motion } from "framer-motion"
import { X } from "lucide-react"
import type { SheetToggleEffectsSection } from "@/lib/character/collect-active-toggle-effects"

type SheetToggleEffectsOverlayProps = {
  title: string
  sections: SheetToggleEffectsSection[]
  onClose: () => void
}

export function SheetToggleEffectsOverlay({
  title,
  sections,
  onClose,
}: SheetToggleEffectsOverlayProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        role="dialog"
        aria-labelledby="sheet-toggle-effects-title"
        className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border-2 border-border bg-card p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 id="sheet-toggle-effects-title" className="pr-8 text-lg font-black text-foreground">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Effects currently applying.</p>
        <div className="mt-4 space-y-4">
          {sections.map((section) => (
            <section
              key={section.toggleId}
              className="rounded-lg border border-border bg-muted/20 px-3 py-2.5"
            >
              <h3 className="text-sm font-bold text-foreground">
                {section.label}
                {section.remaining ? (
                  <span className="ml-2 font-semibold text-muted-foreground">
                    · {section.remaining}
                  </span>
                ) : null}
              </h3>
              {section.note ? (
                <p className="mt-0.5 text-xs font-medium text-foreground/80">{section.note}</p>
              ) : null}
              {section.hint ? (
                <p className="mt-1 text-xs leading-snug text-muted-foreground">{section.hint}</p>
              ) : null}
              {section.effects.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {section.effects.map((line) => (
                    <li key={line.text} className="text-sm leading-snug text-foreground">
                      {line.text}
                      {line.source ? (
                        <span className="block text-xs text-muted-foreground">{line.source}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  No structured riders for this state yet — use the feature card for the full rules.
                </p>
              )}
            </section>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
