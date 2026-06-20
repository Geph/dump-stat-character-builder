"use client"

import Link from "next/link"
import { ArrowLeft, Copy, Save, Trash2, Download } from "lucide-react"
import type { CompendiumContentType } from "@/lib/compendium/content-types"
import { compendiumListHref } from "@/lib/compendium/content-types"

export const COMPENDIUM_EDITOR_FORM_ID = "compendium-editor-form"

type CompendiumEditorToolbarProps = {
  tab: CompendiumContentType
  title: string
  isNew: boolean
  saving: boolean
  saveLabel: string
  onExport?: () => void
  onCopy?: () => void
  copying?: boolean
  onDelete?: () => void
}

export function CompendiumEditorToolbar({
  tab,
  title,
  isNew,
  saving,
  saveLabel,
  onExport,
  onCopy,
  copying = false,
  onDelete,
}: CompendiumEditorToolbarProps) {
  const listHref = compendiumListHref(tab)

  return (
    <div className="sticky top-16 z-40 border-b border-border bg-card/95 backdrop-blur-lg">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={listHref}
            className="p-2 shrink-0 bg-lemon text-lemon-foreground hover:brightness-110 rounded-xl transition-colors"
            aria-label="Back to list"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg sm:text-xl font-black text-foreground truncate">{title}</h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onExport ? (
            <button
              type="button"
              onClick={onExport}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10 rounded-xl transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          ) : null}
          {!isNew && onCopy ? (
            <button
              type="button"
              onClick={onCopy}
              disabled={copying || saving}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted rounded-xl transition-colors disabled:opacity-50"
            >
              <Copy className="w-4 h-4" />
              <span className="hidden sm:inline">{copying ? "Copying…" : "Make a copy"}</span>
            </button>
          ) : null}
          {!isNew && onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          ) : null}
          <Link
            href={listHref}
            className="hidden sm:inline-flex px-4 py-2 text-sm font-bold text-foreground bg-card border-2 border-border rounded-xl hover:bg-muted transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            form={COMPENDIUM_EDITOR_FORM_ID}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving…" : saveLabel}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
