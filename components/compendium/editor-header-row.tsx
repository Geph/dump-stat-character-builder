"use client"

import type { ReactNode } from "react"
import { GameIconPicker } from "@/components/game-icon-picker"
import { SourceLinkField } from "@/components/compendium/source-link-field"
import { compendiumFieldClass } from "@/lib/compendium/editor-field-styles"

const fieldClass = compendiumFieldClass

type CompendiumEditorHeaderRowProps = {
  nameLabel: string
  name: string
  onNameChange: (value: string) => void
  namePlaceholder?: string
  nameRequired?: boolean
  source: string
  onSourceChange: (value: string) => void
  creatorUrl: string
  onCreatorUrlChange: (value: string) => void
  icon: string | null
  onIconChange: (icon: string | null) => void
  /** Optional field between name and source (e.g. parent class). */
  afterName?: ReactNode
}

export function CompendiumEditorHeaderRow({
  nameLabel,
  name,
  onNameChange,
  namePlaceholder,
  nameRequired = true,
  source,
  onSourceChange,
  creatorUrl,
  onCreatorUrlChange,
  icon,
  onIconChange,
  afterName,
}: CompendiumEditorHeaderRowProps) {
  const gridCols = afterName
    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
    : "grid-cols-1 md:grid-cols-3"

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start">
      <div className="shrink-0 flex flex-col">
        <span className="hidden sm:block text-sm font-semibold text-foreground mb-2 invisible select-none" aria-hidden>
          Icon
        </span>
        <GameIconPicker value={icon} onChange={onIconChange} inline />
      </div>
      <div className={`flex-1 w-full min-w-0 grid ${gridCols} gap-4`}>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">{nameLabel}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            required={nameRequired}
            className={fieldClass}
            placeholder={namePlaceholder}
          />
        </div>
        {afterName}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Source</label>
          <input
            type="text"
            value={source}
            onChange={(e) => onSourceChange(e.target.value)}
            className={fieldClass}
            placeholder="Player's Handbook"
          />
        </div>
        <SourceLinkField
          value={creatorUrl}
          onChange={onCreatorUrlChange}
          compact
        />
      </div>
    </div>
  )
}
