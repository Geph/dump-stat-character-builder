"use client"

import { useMemo } from "react"
import { MainNav } from "@/components/main-nav"
import {
  CompendiumEditorToolbar,
  COMPENDIUM_EDITOR_FORM_ID,
} from "@/components/compendium/editor-toolbar"
import { CompendiumEditorHeaderRow } from "@/components/compendium/editor-header-row"
import { ModifierCatalogAdminEditor } from "@/components/compendium/modifier-catalog-admin-editor"
import {
  CatalogEditorFloatingNav,
} from "@/components/compendium/catalog-editor-floating-nav"
import {
  COMMON_MODIFIERS_CATALOG_ID,
  COMMON_MODIFIERS_CATALOG_NAME,
  MODIFIER_CATALOG_INFO,
  CATALOG_EDITOR_SECTION_CLASS,
  catalogEditorNavSections,
  catalogEditorSectionId,
  normalizeModifierCatalog,
  type ModifierCatalogEntry,
} from "@/lib/compendium/modifier-catalog"

type CommonModifiersCatalogEditorProps = {
  catalog: ModifierCatalogEntry[]
  spellOptions: { id: string; name: string }[]
  otherAbilities: { id: string; name: string }[]
  saving: boolean
  error: string | null
  onCatalogChange: (catalog: ModifierCatalogEntry[]) => void
  onSubmit: (e: React.FormEvent) => void
}

export function CommonModifiersCatalogEditor({
  catalog,
  spellOptions,
  otherAbilities,
  saving,
  error,
  onCatalogChange,
  onSubmit,
}: CommonModifiersCatalogEditorProps) {
  const navSections = useMemo(() => catalogEditorNavSections(catalog), [catalog])

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
      <CatalogEditorFloatingNav sections={navSections} />
      <main className="max-w-4xl mx-auto px-4 py-8 pb-24 xl:pb-8">
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

        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive">
            {error}
          </div>
        )}

        <form id={COMPENDIUM_EDITOR_FORM_ID} onSubmit={onSubmit} className="space-y-6">
          <section
            id={catalogEditorSectionId("Overview")}
            className={CATALOG_EDITOR_SECTION_CLASS}
          >
            <label className="block text-sm font-semibold text-foreground mb-2">Overview</label>
            <p className="rounded-xl border-2 border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground leading-relaxed">
              {MODIFIER_CATALOG_INFO}
            </p>
          </section>

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

export function buildCatalogSavePayload(catalog: ModifierCatalogEntry[]): Record<string, unknown> {
  return {
    description: `<p>${MODIFIER_CATALOG_INFO}</p>`,
    modifier_catalog: catalog,
    creator_url: null,
  }
}

export { COMMON_MODIFIERS_CATALOG_ID }
