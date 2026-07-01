import { compendiumStorageContentType, type CompendiumContentType } from "./content-types"

/** Static-friendly compendium editor URL (works with GitHub Pages export). */
export function compendiumEditHref(type: CompendiumContentType, id: string): string {
  const storageType = compendiumStorageContentType(type)
  const params = new URLSearchParams({
    type: storageType,
    id,
  })
  if (type === "magic_items" && id === "new") {
    params.set("magic", "1")
  }
  return `/compendium/edit?${params.toString()}`
}

/** Character sheet URL (static-friendly). */
export function characterSheetHref(id: string): string {
  return `/characters/sheet?id=${encodeURIComponent(id)}`
}
