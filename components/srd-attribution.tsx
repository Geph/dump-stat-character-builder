import {
  SRD_CC_BY_URL,
  SRD_COMPATIBILITY_STATEMENT,
  SRD_DND_BEYOND_URL,
  SRD_SECTION_5_DISCLAIMER,
} from "@/lib/srd/attribution"
import { cn } from "@/lib/utils"

type SrdAttributionProps = {
  className?: string
  /** Omit compatibility line and Section 5 disclaimer (e.g. compact tooltips). */
  compact?: boolean
  /** Show the compatibility line (default true when not compact). */
  showCompatibility?: boolean
}

const linkClass = "text-primary hover:underline"

export function SrdAttribution({
  className,
  compact = false,
  showCompatibility = true,
}: SrdAttributionProps) {
  if (compact) {
    return (
      <p className={cn("text-muted-foreground", className)}>
        Uses{" "}
        <a href={SRD_DND_BEYOND_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
          SRD 5.2.1
        </a>{" "}
        (
        <a href={SRD_CC_BY_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
          CC BY 4.0
        </a>
        ). {SRD_COMPATIBILITY_STATEMENT}
      </p>
    )
  }

  return (
    <div className={cn("space-y-2 text-sm text-muted-foreground leading-relaxed", className)}>
      <p>
        This work includes material from the System Reference Document 5.2.1 (&ldquo;SRD 5.2.1&rdquo;) by
        Wizards of the Coast LLC, available at{" "}
        <a href={SRD_DND_BEYOND_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {SRD_DND_BEYOND_URL}
        </a>
        . The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License,
        available at{" "}
        <a href={SRD_CC_BY_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {SRD_CC_BY_URL}
        </a>
        .
      </p>
      {showCompatibility ? <p>{SRD_COMPATIBILITY_STATEMENT}</p> : null}
      <p className="text-xs">{SRD_SECTION_5_DISCLAIMER}</p>
    </div>
  )
}
