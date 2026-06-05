"use client"

import { Settings } from "lucide-react"
import { useAppTheme, APP_THEMES } from "@/components/providers/app-theme-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export function GlobalSettingsMenu() {
  const { theme, setTheme } = useAppTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 rounded-xl border-2 border-border bg-card hover:bg-muted"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
          {APP_THEMES.map((t) => (
            <DropdownMenuRadioItem key={t.id} value={t.id} className="items-start gap-3 py-2.5">
              <span className="flex gap-1 shrink-0 mt-0.5" aria-hidden>
                {t.swatches.map((color, i) => (
                  <span
                    key={i}
                    className="w-3.5 h-3.5 rounded-full border border-border/80"
                    style={{ background: color }}
                  />
                ))}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-foreground">{t.label}</span>
                <span className="block text-xs text-muted-foreground leading-snug">{t.description}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
