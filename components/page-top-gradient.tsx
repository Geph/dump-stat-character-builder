import { cn } from "@/lib/utils"

const gradientHeightClass = {
  /** Compendium list/edit — full fade over headers and filters. */
  full: "h-[min(33rem,67.5vh)]",
  /** Other app pages — half the compendium fade height. */
  half: "h-[min(16.5rem,33.75vh)]",
} as const

type PageTopGradientProps = {
  size?: keyof typeof gradientHeightClass
  className?: string
}

/** Gentle top fade so titles and nav stay readable over decorative page backgrounds. */
export function PageTopGradient({ size = "half", className }: PageTopGradientProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "page-top-gradient pointer-events-none fixed inset-x-0 top-0 z-[1]",
        gradientHeightClass[size],
        "bg-gradient-to-b from-background/95 via-background/55 to-transparent",
        className,
      )}
    />
  )
}
