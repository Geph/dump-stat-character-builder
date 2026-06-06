"use client"

import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  CompendiumEditorToolbar,
  COMPENDIUM_EDITOR_FORM_ID,
} from "@/components/compendium/editor-toolbar"
import { CompendiumEditorHeaderRow } from "@/components/compendium/editor-header-row"
import { RichTextEditor } from "@/components/compendium/rich-text-editor"
import { ModifierCatalogAdminEditor } from "@/components/compendium/modifier-catalog-admin-editor"
import {
  COMMON_MODIFIERS_CATALOG_ID,
  COMMON_MODIFIERS_CATALOG_NAME,
  MODIFIER_CATALOG_INFO,
  normalizeModifierCatalog,
  type ModifierCatalogEntry,
} from "@/lib/compendium/modifier-catalog"
import { normalizeCreatorUrl } from "@/components/compendium/source-link-field"

type CommonModifiersCatalogEditorProps = {
  description: string
  catalog: ModifierCatalogEntry[]
  spellOptions: { id: string; name: string }[]
  otherAbilities: { id: string; name: string }[]
  saving: boolean
  error: string | null
  onDescriptionChange: (description: string) => void
  onCatalogChange: (catalog: ModifierCatalogEntry[]) => void
  onSubmit: (e: React.FormEvent) => void
}

export function CommonModifiersCatalogEditor({
  description,
  catalog,
  spellOptions,
  otherAbilities,
  saving,
  error,
  onDescriptionChange,
  onCatalogChange,
  onSubmit,
}: CommonModifiersCatalogEditorProps) {
  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <CompendiumEditorToolbar
        tab="abilities"
        title={COMMON_MODIFIERS_CATALOG_NAME}
        isNew={false}
        saving={saving}
        saveLabel="Save Catalog"
      />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <CompendiumEditorHeaderRow
          nameLabel="Catalog name"
          name={COMMON_MODIFIERS_CATALOG_NAME}
          onNameChange={() => {}}
          nameRequired={false}
          source="System"
          onSourceChange={() => {}}
          creatorUrl=""
          onCreatorUrlChange={() => {}}
          icon="sparkles"
          onIconChange={() => {}}
        />

        <div className="mb-6 flex gap-3 rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Info className="h-5 w-5" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-sm">
              {MODIFIER_CATALOG_INFO}
            </TooltipContent>
          </Tooltip>
          <div>
            <p className="text-sm font-semibold text-foreground">Shared modifier catalog</p>
            <p className="text-sm text-muted-foreground mt-1">{MODIFIER_CATALOG_INFO}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive">
            {error}
          </div>
        )}

        <form id={COMPENDIUM_EDITOR_FORM_ID} onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Overview</label>
            <RichTextEditor
              value={description}
              onChange={onDescriptionChange}
              placeholder="Catalog overview shown in compendium…"
            />
          </div>

          <ModifierCatalogAdminEditor
            value={catalog}
            onChange={onCatalogChange}
            spellOptions={spellOptions}
            otherAbilities={otherAbilities}
          />
        </form>
      </main>
    </div>
  )
}

export function isCommonModifiersCatalogEditor(id: string): boolean {
  return id === COMMON_MODIFIERS_CATALOG_ID
}

export function parseCatalogFromRow(data: Record<string, unknown>): ModifierCatalogEntry[] {
  return normalizeModifierCatalog(data.modifier_catalog)
}

export function buildCatalogSavePayload(
  description: string,
  catalog: ModifierCatalogEntry[],
): Record<string, unknown> {
  return {
    description,
    modifier_catalog: catalog,
    creator_url: null,
    updated_at: new Date().toISOString(),
  }
}

export { COMMON_MODIFIERS_CATALOG_ID }
