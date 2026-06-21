export type PickerViewMode = "dense" | "cinematic"

/** Matches builder picker grids (`lg:` column breakpoint). */
export const PICKER_LARGE_MIN_WIDTH = 1024

/** Items per page before showing pagination controls. */
export function getPickerPageSize(mode: PickerViewMode, isLargeScreen: boolean): number {
  if (mode === "dense") {
    // Phone: 2 cols × 3 rows. Large: up to 4 cols × 3 rows.
    return isLargeScreen ? 12 : 6
  }
  // Phone: 1 col × 4 tall cards. Large: 2 cols × 3 rows.
  return isLargeScreen ? 6 : 4
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
