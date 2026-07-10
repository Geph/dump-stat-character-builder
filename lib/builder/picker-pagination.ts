export type PickerViewMode = "dense" | "cinematic"

/** Matches builder picker grids (`lg:` column breakpoint). */
export const PICKER_LARGE_MIN_WIDTH = 1024

/** Matches spell picker grid (`md:grid-cols-3`). */
export const SPELL_PICKER_MD_MIN_WIDTH = 768

/** Matches Tailwind `sm` — phone-only layout tweaks stay below this width. */
export const PICKER_SM_MIN_WIDTH = 640

/** Default visible rows for paginated picker grids. */
export const PICKER_GRID_ROWS = 3

/** Class/species cinematic grids — 2 cols × 3 rows from `sm` up (phone swipe ignores page size). */
export const CINEMATIC_COMPENDIUM_PAGE_SIZE = PICKER_GRID_ROWS * 2

/** Items per page before showing pagination controls. */
export function getPickerPageSize(mode: PickerViewMode, isLargeScreen: boolean): number {
  if (mode === "dense") {
    // Phone: 2 cols × 3 rows. Large: up to 4 cols × 3 rows.
    return isLargeScreen ? PICKER_GRID_ROWS * 4 : PICKER_GRID_ROWS * 2
  }
  // Cinematic compendium cards: 2 cols × 3 rows whenever paginated (`sm`+).
  return CINEMATIC_COMPENDIUM_PAGE_SIZE
}

/** Spell step uses `grid-cols-2 md:grid-cols-3` — always 3 rows in compact view. */
export function getSpellPickerPageSize(isMdScreen: boolean): number {
  const columns = isMdScreen ? 3 : 2
  return columns * PICKER_GRID_ROWS
}

/** Feat / feature spell grants on narrow phones — paginate long spell lists. */
export function getFeatSpellGrantPickerPageSize(isSmScreen: boolean): number {
  return isSmScreen ? PICKER_GRID_ROWS * 3 : PICKER_GRID_ROWS * 2
}

/** Width/snap for one swipe carousel slide (apply to each item wrapper). */
export function getCinematicPickerItemClass(): string {
  return "max-sm:basis-full max-sm:shrink-0 max-sm:grow-0 max-sm:min-w-0 max-sm:snap-center max-sm:snap-always"
}

/** Visual spell picker: swipe on phones, three portrait columns from `sm` up. */
export function getCinematicSpellPickerContainerClass(): string {
  return [
    "px-1 py-2",
    "max-sm:flex max-sm:w-full max-sm:min-w-0 max-sm:flex-nowrap max-sm:gap-4 max-sm:overflow-x-auto max-sm:overscroll-x-contain max-sm:snap-x max-sm:snap-mandatory max-sm:scroll-smooth max-sm:pb-2 max-sm:[touch-action:pan-x]",
    "max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden",
    "sm:grid sm:grid-cols-3 sm:gap-3",
  ].join(" ")
}

/** Visual builder cards: swipe on phones, two columns from `sm` up. */
export function getCinematicPickerContainerClass(): string {
  return [
    "px-1 py-2",
    "max-sm:flex max-sm:w-full max-sm:min-w-0 max-sm:flex-nowrap max-sm:gap-4 max-sm:overflow-x-auto max-sm:overscroll-x-contain max-sm:snap-x max-sm:snap-mandatory max-sm:scroll-smooth max-sm:pb-2 max-sm:[touch-action:pan-x]",
    "max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden",
    "sm:grid sm:grid-cols-2 sm:gap-4",
  ].join(" ")
}

export function paginateList<T>(
  items: T[],
  page: number,
  pageSize: number,
): { items: T[]; pageItems: T[]; pageCount: number; safePage: number } {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(Math.max(0, page), pageCount - 1)
  const start = safePage * pageSize
  const pageSlice = items.slice(start, start + pageSize)
  return {
    items: pageSlice,
    pageItems: pageSlice,
    pageCount,
    safePage,
  }
}
