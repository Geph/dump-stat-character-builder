export const SEARCH_AUTOCOMPLETE_STORAGE_KEY = "dumpstat:search-autocomplete"
export const SEARCH_AUTOCOMPLETE_CHANGE_EVENT = "dumpstat:search-autocomplete-change"

/** Autocomplete is enabled by default; only an explicit "0" disables it. */
export function isSearchAutocompleteEnabled(): boolean {
  if (typeof localStorage === "undefined") return true
  return localStorage.getItem(SEARCH_AUTOCOMPLETE_STORAGE_KEY) !== "0"
}

export function setSearchAutocompleteEnabled(enabled: boolean): void {
  if (typeof localStorage === "undefined") return
  if (enabled) localStorage.removeItem(SEARCH_AUTOCOMPLETE_STORAGE_KEY)
  else localStorage.setItem(SEARCH_AUTOCOMPLETE_STORAGE_KEY, "0")
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SEARCH_AUTOCOMPLETE_CHANGE_EVENT))
  }
}

