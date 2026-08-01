"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Check, ExternalLink } from "lucide-react"
import { ProceedBlockerBanner } from "@/components/builder/proceed-blocker-banner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type BuilderStepNavProps = {
  currentStep: number
  canProceed: boolean
  /** Shown in a popover on the disabled Continue button. */
  proceedBlockers?: string[]
  /** When set, controls save on the final step instead of canProceed. */
  canSave?: boolean
  /** Shown in a popover on the disabled Save button. */
  saveBlockers?: string[]
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
  children,
}: {
  blockers: string[]
  compact?: boolean
  title: string
  heading?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          tabIndex={0}
          role="button"
          aria-label={title}
          className="inline-flex cursor-not-allowed rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        >
          {children}
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="top"
        sideOffset={8}
        className="w-[min(22rem,calc(100vw-2rem))] border-destructive/40 bg-card text-foreground p-4 shadow-xl z-[110]"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <ProceedBlockerBanner blockers={blockers} heading={heading} />
      </PopoverContent>
    </Popover>
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
