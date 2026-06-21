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
import {
  getSystemCatalogMeta,
  isSystemCatalogEditor,
  SYSTEM_OPTION_CATALOG_IDS,
} from "@/lib/compendium/system-option-catalogs"

type CatalogEditorProps = {
  catalogId: string
  catalogName: string
  catalogInfo: string
  catalog: ModifierCatalogEntry[]
  spellOptions: { id: string; name: string }[]
  otherAbilities: { id: string; name: string }[]
  saving: boolean
  error: string | null
  onCatalogChange: (catalog: ModifierCatalogEntry[]) => void
  onSubmit: (e: React.FormEvent) => void
}

export function CatalogEditor({
  catalogId,
  catalogName,
  catalogInfo,
  catalog,
  spellOptions,
  otherAbilities,
  saving,
  error,
  onCatalogChange,
  onSubmit,
}: CatalogEditorProps) {
  const navSections = useMemo(() => catalogEditorNavSections(catalog), [catalog])

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <CompendiumEditorToolbar
        tab="abilities"
        title={catalogName}
        isNew={false}
        saving={saving}
        saveLabel={`Save ${catalogName}`}
      />
      <CatalogEditorFloatingNav sections={navSections} />
      <main className="max-w-4xl mx-auto px-4 py-8 pb-24 xl:pb-8">
        <CompendiumEditorHeaderRow
          nameLabel="Catalog name"
          name={catalogName}
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
              {catalogInfo}
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

/** @deprecated Use CatalogEditor */
export function CommonModifiersCatalogEditor(
  props: Omit<CatalogEditorProps, "catalogId" | "catalogName" | "catalogInfo">,
) {
  return (
    <CatalogEditor
      catalogId={COMMON_MODIFIERS_CATALOG_ID}
      catalogName={COMMON_MODIFIERS_CATALOG_NAME}
      catalogInfo={MODIFIER_CATALOG_INFO}
      {...props}
    />
  )
}

export function isSystemCatalogEditorRoute(id: string): boolean {
  return id === COMMON_MODIFIERS_CATALOG_ID || isSystemCatalogEditor(id)
}

/** @deprecated Use isSystemCatalogEditorRoute */
export function isCommonModifiersCatalogEditor(id: string): boolean {
  return isSystemCatalogEditorRoute(id)
}

export function getCatalogEditorMeta(id: string): { catalogId: string; name: string; info: string } | null {
  if (id === COMMON_MODIFIERS_CATALOG_ID) {
    return {
      catalogId: COMMON_MODIFIERS_CATALOG_ID,
      name: COMMON_MODIFIERS_CATALOG_NAME,
      info: MODIFIER_CATALOG_INFO,
    }
  }
  const systemMeta = getSystemCatalogMeta(id)
  if (systemMeta) {
    return { catalogId: id, ...systemMeta }
  }
  return null
}

export function parseCatalogFromRow(data: Record<string, unknown>): ModifierCatalogEntry[] {
  return normalizeModifierCatalog(data.modifier_catalog)
}

export function buildCatalogSavePayload(
  catalog: ModifierCatalogEntry[],
  catalogInfo: string,
): Record<string, unknown> {
  return {
    description: `<p>${catalogInfo}</p>`,
    modifier_catalog: catalog,
    creator_url: null,
  }
}

export { COMMON_MODIFIERS_CATALOG_ID, SYSTEM_OPTION_CATALOG_IDS }
