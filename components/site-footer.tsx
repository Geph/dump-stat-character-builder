"use client"

import { useState } from "react"
import { ChevronUp } from "lucide-react"
import { SrdAttribution } from "@/components/srd-attribution"
import { cn } from "@/lib/utils"

const GITHUB_REPO_URL = "https://github.com/Geph/dump-stat-character-builder"

type SiteFooterProps = {
  id?: string
  className?: string
}

export function SiteFooter({ id = "site-footer", className }: SiteFooterProps) {
  const [open, setOpen] = useState(false)

  return (
    <footer id={id} className={className ?? "mt-auto shrink-0 w-full py-5 px-4 border-t border-border bg-card"}>
      <div className="max-w-6xl mx-auto flex flex-col">
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-out",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <div className="text-center text-muted-foreground text-sm space-y-2 pb-4">
              <p className="font-medium text-foreground/80 text-xs sm:text-sm">
                Dump Stat — 5E compatible character builder
              </p>
              <SrdAttribution className="text-left sm:text-center max-w-4xl mx-auto" />
              <p className="text-xs leading-snug">
                Logo icon:{" "}
                <a
                  href="https://game-icons.net/1x1/delapouite/spiked-dragon-head.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Spiked Dragon Head
                </a>{" "}
                by{" "}
                <a
                  href="https://delapouite.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Delapouite
                </a>{" "}
                under{" "}
                <a
                  href="http://creativecommons.org/licenses/by/3.0/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  CC BY 3.0
                </a>
                {" · "}
                Fonts: Solbera&apos;s D&D Fonts by{" "}
                <a
                  href="https://jonathonf.github.io/solbera-dnd-fonts/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Solbera / Ryrok
                </a>{" "}
                under CC BY-SA 4.0
              </p>
              <p className="text-xs leading-snug">
                Not affiliated with or endorsed by Wizards of the Coast. &ldquo;Dungeons &amp; Dragons&rdquo; and
                related marks are trademarks of Wizards of the Coast LLC.
              </p>
              <p className="text-xs leading-snug">
                All product names, logos, and brands are property of their respective owners. All company,
                product, and service names used in this graphic are for identification purposes only. Use of
                these names, logos, and brands does not imply endorsement.
              </p>
              <p className="text-xs leading-snug">
                Dump Stat does not collect personal identification data. Character and compendium data stay in
                your browser or your own database when you host the app yourself.
              </p>
              <p className="text-xs leading-snug pt-1">
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  View Dump Stat on GitHub
                </a>
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex w-full items-center justify-center gap-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Attribution and Legal
          <ChevronUp
            className={cn(
              "size-3.5 shrink-0 transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>
      </div>
    </footer>
  )
}
