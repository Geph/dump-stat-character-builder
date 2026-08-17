"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Clock, Plus, X } from "lucide-react"
import { useState } from "react"
import {
  createDurationReminder,
  type DurationReminder,
} from "@/lib/character/duration-reminders"
import { SHEET_BANNER_BUTTON } from "@/lib/character/sheet-status-colors"
import { cn } from "@/lib/utils"

export function DurationRemindersPanel({
  reminders,
  onChange,
}: {
  reminders: DurationReminder[]
  onChange: (next: DurationReminder[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState("")
  const [remaining, setRemaining] = useState("")
  const count = reminders.length

  const add = () => {
    if (!label.trim()) return
    onChange([...reminders, createDurationReminder(label, remaining)])
    setLabel("")
    setRemaining("")
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Duration reminders"
        aria-label={
          count > 0
            ? `Open duration reminders, ${count} active`
            : "Open duration reminders"
        }
        aria-expanded={open}
        className={cn(
          "relative flex h-11 w-11 items-center justify-center rounded-lg border-2 transition-colors",
          count > 0
            ? SHEET_BANNER_BUTTON.durationRemindersActive
            : SHEET_BANNER_BUTTON.durationReminders,
        )}
      >
        <Clock className="h-5 w-5" aria-hidden />
        {count > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-black leading-none text-primary-foreground">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-16 sm:justify-end sm:pt-20 sm:pr-6"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border-2 border-border bg-gradient-to-b from-card via-card to-muted/40 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="duration-reminders-title"
            >
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/80 px-4 py-3">
                <div>
                  <h2
                    id="duration-reminders-title"
                    className="text-sm font-black tracking-wide text-foreground"
                  >
                    Duration Reminders
                  </h2>
                  <p className="text-[10px] text-muted-foreground">
                    Track Bless, Hex, and other timed effects.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Close duration reminders"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 p-4">
                {count > 0 ? (
                  <ul className="space-y-1.5">
                    {reminders.map((reminder) => (
                      <li
                        key={reminder.id}
                        className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1.5 text-xs"
                      >
                        <span className="min-w-0">
                          <span className="font-semibold text-foreground">{reminder.label}</span>
                          {reminder.remaining ? (
                            <span className="ml-1 text-muted-foreground">· {reminder.remaining}</span>
                          ) : null}
                        </span>
                        <button
                          type="button"
                          aria-label={`Clear ${reminder.label}`}
                          onClick={() =>
                            onChange(reminders.filter((entry) => entry.id !== reminder.id))
                          }
                          className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    No timed effects yet. Add one below.
                  </p>
                )}

                <form
                  className="flex flex-wrap gap-1.5"
                  onSubmit={(event) => {
                    event.preventDefault()
                    add()
                  }}
                >
                  <input
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    placeholder="Effect"
                    aria-label="Effect name"
                    className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                  />
                  <input
                    value={remaining}
                    onChange={(event) => setRemaining(event.target.value)}
                    placeholder="1 min"
                    aria-label="Remaining duration"
                    className="w-20 rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs font-semibold"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
