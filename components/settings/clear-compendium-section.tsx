"use client"

import { useState } from "react"
import { AlertTriangle, Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { clearEntireCompendium } from "@/lib/compendium/clear-compendium"

const CLEARED_SECTIONS =
  "classes, subclasses, species, backgrounds, spells, feats, creatures, equipment, magic items, languages, tools, class resources, and custom abilities"

export function ClearCompendiumSection({
  onStatus,
}: {
  onStatus?: (status: string) => void
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClear = async () => {
    setClearing(true)
    setError(null)
    try {
      await clearEntireCompendium()
      onStatus?.("Compendium cleared. Reloading…")
      setConfirmOpen(false)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear the compendium")
      setClearing(false)
    }
  }

  return (
    <div>
      <p className="text-sm font-semibold text-foreground">Danger zone</p>
      <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3">
        <p className="text-sm font-semibold text-foreground">Clear entire compendium</p>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          Deletes every section at once: {CLEARED_SECTIONS}. Saved characters are kept, but they
          reference content by id, so they will show missing classes, spells, and gear until you
          seed the SRD again or re-import your content from the Import page.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 gap-2 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => {
            setError(null)
            setConfirmOpen(true)
          }}
        >
          <AlertTriangle className="h-4 w-4" />
          Clear entire compendium
        </Button>
        {error ? <p className="mt-2 text-xs font-medium text-destructive">{error}</p> : null}
      </div>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!clearing) setConfirmOpen(open)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear the entire compendium?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  This permanently removes all {CLEARED_SECTIONS} — both the seeded SRD content and
                  anything you imported or wrote yourself. This cannot be undone.
                </p>
                <p>
                  Your characters, parties, and snapshots are not deleted, but until you re-seed or
                  re-import they will be missing the content they were built from.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={clearing}
              onClick={(event) => {
                event.preventDefault()
                void handleClear()
              }}
            >
              {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {clearing ? "Clearing…" : "Clear everything"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
