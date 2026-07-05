export type PickerViewMode = "dense" | "cinematic"

/** Matches builder picker grids (`lg:` column breakpoint). */
export const PICKER_LARGE_MIN_WIDTH = 1024

/** Matches spell picker grid (`md:grid-cols-3`). */
export const SPELL_PICKER_MD_MIN_WIDTH = 768

/** Default visible rows for paginated picker grids. */
export const PICKER_GRID_ROWS = 3

/** Items per page before showing pagination controls. */
export function getPickerPageSize(mode: PickerViewMode, isLargeScreen: boolean): number {
  if (mode === "dense") {
    // Phone: 2 cols × 3 rows. Large: up to 4 cols × 3 rows.
    return isLargeScreen ? PICKER_GRID_ROWS * 4 : PICKER_GRID_ROWS * 2
  }
  // Phone: 1 col × 4 tall cards. Large: 2 cols × 3 rows.
  return isLargeScreen ? PICKER_GRID_ROWS * 2 : 4
}

/** Spell step uses `grid-cols-2 md:grid-cols-3` — always 3 rows in compact view. */
export function getSpellPickerPageSize(isMdScreen: boolean): number {
  const columns = isMdScreen ? 3 : 2
  return columns * PICKER_GRID_ROWS
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
