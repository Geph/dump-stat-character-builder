"use client"

import type { ClassDetailFeatureRow } from "@/lib/builder/class-detail-features"
import {
  portraitDetailBadge,
  portraitDetailSummary,
  portraitDetailTitle,
} from "@/lib/compendium/portrait-detail-typography"
import { RichTextContent } from "@/components/compendium/rich-text-editor"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

export function ClassDetailFeatureList({
  features,
  levelLabel,
  accentClassName = "text-primary",
  comfortableFromMd = false,
  /** When false, omit summary blurbs (titles + level only). Ignored when `accordion`. */
  showSummary = true,
  /** Prefix each row with its unlock level. */
  showLevel = false,
  /**
   * Collapsed feature titles; expanding one row shows the full description.
   * Only one item open at a time.
   */
  accordion = false,
}: {
  features: ClassDetailFeatureRow[]
  levelLabel?: string
  accentClassName?: string
  comfortableFromMd?: boolean
  showSummary?: boolean
  showLevel?: boolean
  accordion?: boolean
}) {
  if (!features.length) return null

  const levelClass = comfortableFromMd
    ? portraitDetailBadge
    : "text-[9px] font-bold uppercase tracking-widest text-white/45"
  const titleClass = comfortableFromMd ? portraitDetailTitle : "text-[11px] font-semibold leading-tight"
  const badgeClass = comfortableFromMd
    ? portraitDetailBadge
    : "text-[9px] font-bold uppercase tracking-wide opacity-75"
  const summaryClass = comfortableFromMd ? portraitDetailSummary : "text-[10px] leading-snug text-white/60 line-clamp-1"

  if (accordion) {
    return (
      <div>
        {levelLabel ? <p className={levelClass}>{levelLabel}</p> : null}
        <Accordion
          type="single"
          collapsible
          className={cn(levelLabel ? "mt-0.5" : undefined, "w-full")}
        >
          {features.map((feature) => {
            const value = `${feature.level}-${feature.name}`
            return (
              <AccordionItem
                key={value}
                value={value}
                className="border-white/15"
              >
                <AccordionTrigger
                  className={cn(
                    "py-2.5 hover:no-underline [&_svg]:text-white/55",
                    titleClass,
                    feature.resourceRelated ? accentClassName : "text-white/90",
                  )}
                >
                  <span className="min-w-0 text-left">
                    {showLevel ? (
                      <span className={cn("mr-1.5", badgeClass, "text-white/45")}>
                        L{feature.level}
                      </span>
                    ) : null}
                    {feature.name}
                    {feature.resourceRelated ? (
                      <span className={cn("ml-1", badgeClass)}>Resource</span>
                    ) : null}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-3 text-white/75">
                  {feature.summary?.trim() ? (
                    <RichTextContent
                      html={feature.summary}
                      fallback="No description listed."
                      className="text-sm text-white/75 [&_.text-muted-foreground]:text-white/70"
                    />
                  ) : (
                    <p className="text-sm text-white/55">No description listed.</p>
                  )}
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </div>
    )
  }

  return (
    <div>
      {levelLabel ? (
        <p className={levelClass}>{levelLabel}</p>
      ) : null}
      <ul className={levelLabel ? "mt-0.5 space-y-2" : "space-y-2"}>
        {features.map((feature) => (
          <li key={`${feature.level}-${feature.name}`} className="min-w-0">
            <p
              className={cn(
                titleClass,
                feature.resourceRelated ? accentClassName : "text-white/90",
              )}
            >
              {showLevel ? (
                <span className={cn("mr-1.5", badgeClass, "text-white/45")}>L{feature.level}</span>
              ) : null}
              {feature.name}
              {feature.resourceRelated ? (
                <span className={cn("ml-1", badgeClass)}>
                  Resource
                </span>
              ) : null}
            </p>
            {showSummary && feature.summary ? (
              <p className={cn(summaryClass, !comfortableFromMd && "line-clamp-1")}>{feature.summary}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
