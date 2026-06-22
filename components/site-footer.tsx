import { SrdAttribution } from "@/components/srd-attribution"

type SiteFooterProps = {
  id?: string
  className?: string
}

export function SiteFooter({ id = "site-footer", className }: SiteFooterProps) {
  return (
    <footer id={id} className={className ?? "py-5 px-4 border-t border-border bg-card"}>
      <div className="max-w-6xl mx-auto text-center text-muted-foreground text-sm space-y-2">
        <p className="font-medium text-foreground/80 text-xs sm:text-sm">Dump Stat — 5E compatible character builder</p>
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
      </div>
    </footer>
  )
}
