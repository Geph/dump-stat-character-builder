import type { CompendiumContentType } from "./content-types"

/** Static-friendly compendium editor URL (works with GitHub Pages export). */
export function compendiumEditHref(type: CompendiumContentType, id: string): string {
  return `/compendium/edit?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`
}

/** Character sheet URL (static-friendly). */
export function characterSheetHref(id: string): string {
  return `/characters/sheet?id=${encodeURIComponent(id)}`
}
