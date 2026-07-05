"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Check } from "lucide-react"
import { ProceedBlockerBanner } from "@/components/builder/proceed-blocker-banner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type BuilderStepNavProps = {
  currentStep: number
  canProceed: boolean
  /** Shown in a popover on the disabled Continue button. */
  proceedBlockers?: string[]
  /** When set, controls save on the final step instead of canProceed. */
  canSave?: boolean
  saving: boolean
  onBack: () => void
  onContinue: () => void
  onSave: () => void
  saveLabel?: string
  className?: string
  /** The final step id; the Save action shows on this step. Defaults to 6. */
  lastStep?: number
}

function ContinueButton({
  disabled,
  onContinue,
  className = "",
}: {
  disabled: boolean
  onContinue: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onContinue}
      disabled={disabled}
      className={`flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors ${className}`}
    >
      Continue
      <ChevronRight className="w-4 h-4" />
    </button>
  )
}

function BlockedContinueButton({ blockers }: { blockers: string[] }) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          tabIndex={0}
          role="button"
          aria-label="Continue unavailable. Show required steps."
          className="inline-flex cursor-not-allowed rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        >
          <ContinueButton disabled onContinue={() => {}} className="pointer-events-none" />
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
        <ProceedBlockerBanner blockers={blockers} />
      </PopoverContent>
    </Popover>
  )
}

export function BuilderStepNav({
  currentStep,
  canProceed,
  proceedBlockers = [],
  canSave,
  saving,
  onBack,
  onContinue,
  onSave,
  saveLabel = "Create Character",
  className = "",
  lastStep = 6,
}: BuilderStepNavProps) {
  const saveEnabled = canSave ?? canProceed
  const showBlockerPopover = !canProceed && proceedBlockers.length > 0

  return (
    <div className={`flex items-center justify-end gap-2 shrink-0 ${className}`}>
      <button
        type="button"
        onClick={onBack}
        disabled={currentStep === 1}
        className="flex items-center gap-2 px-4 py-2 bg-lemon text-lemon-foreground rounded-xl font-bold text-sm disabled:opacity-30 transition-colors hover:brightness-110"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>

      {currentStep < lastStep ? (
        showBlockerPopover ? (
          <BlockedContinueButton blockers={proceedBlockers} />
        ) : (
          <ContinueButton disabled={!canProceed} onContinue={onContinue} />
        )
      ) : (
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !saveEnabled}
          className="flex items-center gap-2 px-5 py-2 bg-success text-white rounded-xl font-bold text-sm hover:bg-success/90 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : saveLabel}
          <Check className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
