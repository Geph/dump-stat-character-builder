"use client"

import { ChevronLeft, ChevronRight, Check } from "lucide-react"

type BuilderStepNavProps = {
  currentStep: number
  canProceed: boolean
  saving: boolean
  onBack: () => void
  onContinue: () => void
  onSave: () => void
  className?: string
}

export function BuilderStepNav({
  currentStep,
  canProceed,
  saving,
  onBack,
  onContinue,
  onSave,
  className = "",
}: BuilderStepNavProps) {
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

      {currentStep < 6 ? (
        <button
          type="button"
          onClick={onContinue}
          disabled={!canProceed}
          className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          Continue
          <ChevronRight className="w-4 h-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !canProceed}
          className="flex items-center gap-2 px-5 py-2 bg-success text-white rounded-xl font-bold text-sm hover:bg-success/90 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Create Character"}
          <Check className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
