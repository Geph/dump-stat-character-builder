import {
  formatClassComplexityLabel,
  formatClassComplexityPhrase,
  isClassComplexity,
  resolveClassComplexity,
} from "@/lib/compendium/class-complexity"
import {
  portraitDetailEyebrow,
  portraitDetailHeading,
} from "@/lib/compendium/portrait-detail-typography"
import type { DndClass } from "@/lib/types"
import { cn } from "@/lib/utils"

export function ClassComplexityDisplay({
  cls,
  className,
  labelClassName = "text-primary",
  comfortableFromMd = false,
}: {
  cls: Pick<DndClass, "name" | "complexity">
  className?: string
  labelClassName?: string
  comfortableFromMd?: boolean
}) {
  const complexity = resolveClassComplexity(cls)
  if (!complexity) return null

  return (
    <div className={className}>
      <p className={cn(comfortableFromMd ? portraitDetailEyebrow : "text-[10px] font-bold uppercase tracking-widest", labelClassName)}>
        Complexity
      </p>
      <p className={comfortableFromMd ? portraitDetailHeading : "font-serif text-sm font-bold text-white"}>
        {formatClassComplexityLabel(complexity)}
      </p>
    </div>
  )
}

export function classComplexityDetailRow(cls: Pick<DndClass, "name" | "complexity">): {
  label: string
  value: string
} | null {
  const complexity = resolveClassComplexity(cls)
  if (!complexity) return null
  return {
    label: "Complexity",
    value: formatClassComplexityPhrase(complexity),
  }
}

export function classComplexityFormValue(
  value: DndClass["complexity"] | "" | null | undefined,
): DndClass["complexity"] | "" {
  return isClassComplexity(value) ? value : ""
}
