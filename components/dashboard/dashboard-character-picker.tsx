"use client"

import { Check, User } from "lucide-react"
import {
  DASHBOARD_MAX_CHARACTERS,
  DASHBOARD_MIN_CHARACTERS,
  validateDashboardSelection,
} from "@/lib/character/dashboard-url"
import {
  pageOverlayPanelClass,
  pageOverlayPanelHintClass,
} from "@/lib/compendium/editor-field-styles"
import type { Character, DndClass, Species } from "@/lib/types"
import { cn } from "@/lib/utils"

type LibraryCharacter = Character & {
  classes?: DndClass | null
  species?: Species | null
}

type DashboardCharacterPickerProps = {
  characters: LibraryCharacter[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onProceed: () => void
  loading?: boolean
}

export function DashboardCharacterPicker({
  characters,
  selectedIds,
  onToggle,
  onProceed,
  loading = false,
}: DashboardCharacterPickerProps) {
  const validation = validateDashboardSelection(selectedIds)
  const atMax = selectedIds.length >= DASHBOARD_MAX_CHARACTERS

  return (
    <div className="space-y-6">
      <div className={cn(pageOverlayPanelClass, "px-4 py-3 text-sm", pageOverlayPanelHintClass)}>
        Glance at key stats for multiple characters during play. Pick {DASHBOARD_MIN_CHARACTERS}–
        {DASHBOARD_MAX_CHARACTERS} characters for a compact GM view. Stats reflect each
        character&apos;s last saved sheet state.
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="aspect-square rounded-2xl border-2 border-border bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : characters.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No characters in your library yet. Create one in the builder first.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {characters.map((character) => {
            const selected = selectedIds.includes(character.id)
            const disabled = !selected && atMax
            return (
              <button
                key={character.id}
                type="button"
                disabled={disabled}
                onClick={() => onToggle(character.id)}
                title={
                  disabled
                    ? `Maximum ${DASHBOARD_MAX_CHARACTERS} characters selected`
                    : selected
                      ? "Remove from dashboard"
                      : "Add to dashboard"
                }
                className={`relative rounded-2xl border-2 overflow-hidden text-left transition-colors ${
                  selected
                    ? "border-primary ring-2 ring-primary/30"
                    : disabled
                      ? "border-border opacity-50 cursor-not-allowed"
                      : "border-border hover:border-primary/50"
                }`}
              >
                <div className="aspect-square bg-muted/30">
                  {character.portrait_url ? (
                    <img
                      src={character.portrait_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-bold text-sm text-foreground truncate">{character.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {character.classes?.name ?? "Adventurer"} · Lvl {character.level}
                  </p>
                </div>
                {selected ? (
                  <span className="absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="w-4 h-4" />
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 px-4 py-4 bg-background/95 backdrop-blur border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {selectedIds.length}/{DASHBOARD_MAX_CHARACTERS} selected
            {!validation.ok ? ` · ${validation.reason}` : null}
          </p>
          <button
            type="button"
            disabled={!validation.ok}
            onClick={onProceed}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            View GM Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
