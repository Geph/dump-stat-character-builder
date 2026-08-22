export type PickerViewMode = "dense" | "cinematic"

/** Matches builder picker grids (`lg:` column breakpoint). */
export const PICKER_LARGE_MIN_WIDTH = 1024

/** Matches spell picker grid (`md:grid-cols-3`). */
export const SPELL_PICKER_MD_MIN_WIDTH = 768

/** Matches Tailwind `sm` — phone-only layout tweaks stay below this width. */
export const PICKER_SM_MIN_WIDTH = 640

/**
 * Dense spell grid: single column (name only) below this; two columns from here until `md`.
 * Lower than `sm` so large phones / narrow panels keep 2-col before true pocket widths.
 * Keep in sync with `getDenseSpellPickerGridClass` / compact school visibility classes.
 */
export const SPELL_PICKER_TWO_COL_MIN_WIDTH = 480

/** Dense (non-cinematic) spell picks: 1 col on pocket phones, 2 from 480px, 3 from `md`. */
export function getDenseSpellPickerGridClass(): string {
  return "grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 gap-2"
}

/** Show spell school under the name once the dense grid is 2+ columns. */
export function getDenseSpellPickerSchoolClass(): string {
  return "hidden text-xs text-muted-foreground min-[480px]:block"
}

/** Default visible rows for paginated picker grids. */
export const PICKER_GRID_ROWS = 3

/** Class/subclass/species cinematic grids — 3 cols × 3 rows from `sm` up (phone swipe ignores page size). */
export const CINEMATIC_COMPENDIUM_PAGE_SIZE = PICKER_GRID_ROWS * 3

/** Backgrounds and other 2-col cinematic grids. */
export const CINEMATIC_TWO_COL_PAGE_SIZE = PICKER_GRID_ROWS * 2

/** Items per page before showing pagination controls. */
export function getPickerPageSize(mode: PickerViewMode, isLargeScreen: boolean): number {
  if (mode === "dense") {
    // Phone/medium: 2 cols × 4 rows = 8. Large: up to 4 cols × 3 rows = 12.
    return isLargeScreen ? PICKER_GRID_ROWS * 4 : 8
  }
  // Cinematic class/subclass/species cards: 3 cols × 3 rows whenever paginated (`sm`+).
  return CINEMATIC_COMPENDIUM_PAGE_SIZE
}

/** Skill / language / tool multi-selects — fixed page length on phone and compact layouts. */
export const MULTI_SELECT_CHOICE_PAGE_SIZE = 10


/** Spell step: 12 on `sm`+ (3-col cinematic / denser grids), 8 on phones. */
export function getSpellPickerPageSize(isSmScreen: boolean): number {
  return isSmScreen ? 12 : 8
}

/** Feat / feature spell grants on narrow phones — paginate long spell lists. */
export function getFeatSpellGrantPickerPageSize(isSmScreen: boolean): number {
  return isSmScreen ? PICKER_GRID_ROWS * 3 : PICKER_GRID_ROWS * 2
}

/** Width/snap for one swipe carousel slide (apply to each item wrapper). */
export function getCinematicPickerItemClass(): string {
  // Between full-bleed and the earlier 70% pass — peeks the next card without feeling tiny.
  return "max-sm:basis-[82%] max-sm:shrink-0 max-sm:grow-0 max-sm:min-w-0 max-sm:snap-center max-sm:snap-always"
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

/** Visual builder cards: swipe on phones; `sm+` uses `columns` (class/species = 3, backgrounds = 2). */
export function getCinematicPickerContainerClass(columns: 2 | 3 = 3): string {
  return [
    "px-1 py-2",
    "max-sm:flex max-sm:w-full max-sm:min-w-0 max-sm:flex-nowrap max-sm:gap-4 max-sm:overflow-x-auto max-sm:overscroll-x-contain max-sm:snap-x max-sm:snap-mandatory max-sm:scroll-smooth max-sm:pb-2 max-sm:[touch-action:pan-x]",
    "max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden",
    columns === 3 ? "sm:grid sm:grid-cols-3 sm:gap-4" : "sm:grid sm:grid-cols-2 sm:gap-4",
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
