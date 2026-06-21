"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

type PickerGridPaginationProps = {
  page: number
  pageCount: number
  onPrevious: () => void
  onNext: () => void
  previousLabel?: string
  nextLabel?: string
  className?: string
}

export function PickerGridPagination({
  page,
  pageCount,
  onPrevious,
  onNext,
  previousLabel = "Previous page",
  nextLabel = "Next page",
  className,
}: PickerGridPaginationProps) {
  if (pageCount <= 1) return null

  return (
    <div className={cn("flex items-center justify-center gap-3 mt-2", className)}>
      <button
        type="button"
        aria-label={previousLabel}
        disabled={page === 0}
        onClick={onPrevious}
        className="p-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-xs text-muted-foreground tabular-nums">
        {page + 1} / {pageCount}
      </span>
      <button
        type="button"
        aria-label={nextLabel}
        disabled={page >= pageCount - 1}
        onClick={onNext}
        className="p-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
