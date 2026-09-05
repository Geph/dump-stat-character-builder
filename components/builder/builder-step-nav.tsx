"use client"

import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Check, ExternalLink } from "lucide-react"
import { ProceedBlockerBanner } from "@/components/builder/proceed-blocker-banner"
import type { BuilderBlocker } from "@/lib/builder/proceed-blockers"
import { cn } from "@/lib/utils"

type BuilderStepNavProps = {
  currentStep: number
  canProceed: boolean
  /** Shown in a popover on the disabled Continue button. */
  proceedBlockers?: Array<string | BuilderBlocker>
  /** When set, controls save on the final step instead of canProceed. */
  canSave?: boolean
  /** Shown in a popover on the disabled Save button. */
  saveBlockers?: Array<string | BuilderBlocker>
  onJumpBlocker?: (blocker: BuilderBlocker) => void
  saving: boolean
  onBack: () => void
  onContinue: () => void
  onSave: () => void
  saveLabel?: string
  /** When editing an existing character, always offer a link to the sheet. */
  viewSheetHref?: string | null
  className?: string
  /**
   * The final step id among visible steps; the Save action shows on this step.
   * Compare by identity (not numeric order) — step ids are not monotonic with display order
   * (e.g. CLASS_ABILITIES is 8, DETAILS is 6).
   */
  lastStep?: number
  /** Dense builder layout — use tighter controls on the smallest phone screens. */
  compact?: boolean
}

function ContinueButton({
  disabled,
  onContinue,
  className = "",
  compact = false,
}: {
  disabled: boolean
  onContinue: () => void
  className?: string
  compact?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onContinue}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors",
        compact && "max-sm:gap-1 max-sm:h-[30px] max-sm:px-2.5 max-sm:py-0 max-sm:text-xs max-sm:rounded-lg",
        className,
      )}
    >
      Continue
      <ChevronRight className={cn("w-4 h-4", compact && "max-sm:w-3.5 max-sm:h-3.5")} />
    </button>
  )
}

function SaveButton({
  disabled,
  saving,
  onSave,
  saveLabel,
  className = "",
  compact = false,
}: {
  disabled: boolean
  saving: boolean
  onSave: () => void
  saveLabel: string
  className?: string
  compact?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onSave}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 px-5 py-2 bg-success text-white rounded-xl font-bold text-sm hover:bg-success/90 disabled:opacity-50 transition-colors",
        compact && "max-sm:gap-1 max-sm:h-[30px] max-sm:px-2.5 max-sm:py-0 max-sm:text-xs max-sm:rounded-lg",
        className,
      )}
    >
      {saving ? "Saving..." : saveLabel}
      <Check className={cn("w-4 h-4", compact && "max-sm:w-3.5 max-sm:h-3.5")} />
    </button>
  )
}

function BlockedActionButton({
  blockers,
  compact = false,
  title,
  heading,
  onJump,
  children,
}: {
  blockers: Array<string | BuilderBlocker>
  compact?: boolean
  title: string
  heading?: string
  onJump?: (blocker: BuilderBlocker) => void
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  // Plain local panel — Radix Popover/HoverCard both looped here with parent re-renders.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  return (
    <div
      ref={rootRef}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        tabIndex={0}
        role="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={title}
        className={cn(
          "inline-flex cursor-not-allowed rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          compact && "max-sm:rounded-lg",
        )}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            setOpen((value) => !value)
          }
        }}
      >
        {children}
      </span>
      {open ? (
        <div
          id={panelId}
          role="status"
          className="absolute bottom-full right-0 mb-2 w-[min(22rem,calc(100vw-2rem))] rounded-md border border-destructive/40 bg-card p-4 text-foreground shadow-xl z-[110]"
        >
          <ProceedBlockerBanner
            blockers={blockers}
            heading={heading}
            onJump={(blocker) => {
              setOpen(false)
              onJump?.(blocker)
            }}
          />
        </div>
      ) : null}
    </div>
  )
}

export function BuilderStepNav({
  currentStep,
  canProceed,
  proceedBlockers = [],
  canSave,
  saveBlockers = [],
  saving,
  onBack,
  onContinue,
  onSave,
  saveLabel = "Create Character",
  viewSheetHref = null,
  className = "",
  lastStep = 6,
  compact = false,
  onJumpBlocker,
}: BuilderStepNavProps) {
  const saveEnabled = canSave ?? canProceed
  const showBlockerPopover = !canProceed && proceedBlockers.length > 0
  const showSaveBlockerPopover = !saveEnabled && !saving && saveBlockers.length > 0

  return (
    <div className={cn("flex items-center justify-end gap-2 shrink-0", compact && "max-sm:gap-1.5", className)}>
      <button
        type="button"
        onClick={onBack}
        disabled={currentStep === 1}
        className={cn(
          "flex items-center gap-2 px-4 py-2 bg-lemon text-lemon-foreground rounded-xl font-bold text-sm disabled:opacity-30 transition-colors hover:brightness-110",
          compact && "max-sm:gap-1 max-sm:h-[30px] max-sm:px-2.5 max-sm:py-0 max-sm:text-xs max-sm:rounded-lg",
        )}
      >
        <ChevronLeft className={cn("w-4 h-4", compact && "max-sm:w-3.5 max-sm:h-3.5")} />
        Back
      </button>

      {currentStep !== lastStep ? (
        showBlockerPopover ? (
          <BlockedActionButton
            blockers={proceedBlockers}
            compact={compact}
            title="Continue unavailable. Show required steps."
            onJump={onJumpBlocker}
          >
            <ContinueButton
              disabled
              onContinue={() => {}}
              compact={compact}
              className="pointer-events-none"
            />
          </BlockedActionButton>
        ) : (
          <ContinueButton disabled={!canProceed} onContinue={onContinue} compact={compact} />
        )
      ) : (
        <>
          {viewSheetHref ? (
            <Link
              href={viewSheetHref}
              className={cn(
                "flex items-center gap-2 px-4 py-2 bg-card border-2 border-border text-foreground rounded-xl font-bold text-sm hover:border-primary transition-colors",
                compact && "max-sm:gap-1 max-sm:h-[30px] max-sm:px-2.5 max-sm:py-0 max-sm:text-xs max-sm:rounded-lg",
              )}
            >
              <ExternalLink className={cn("w-4 h-4", compact && "max-sm:w-3.5 max-sm:h-3.5")} />
              View Sheet
            </Link>
          ) : null}
          {showSaveBlockerPopover ? (
            <BlockedActionButton
              blockers={saveBlockers}
              compact={compact}
              title="Save unavailable. Show required steps."
              heading="Complete these to save:"
              onJump={onJumpBlocker}
            >
              <SaveButton
                disabled
                saving={false}
                onSave={() => {}}
                saveLabel={saveLabel}
                compact={compact}
                className="pointer-events-none"
              />
            </BlockedActionButton>
          ) : (
            <SaveButton
              disabled={saving || !saveEnabled}
              saving={saving}
              onSave={onSave}
              saveLabel={saveLabel}
              compact={compact}
            />
          )}
        </>
      )}
    </div>
  )
}
