/** Global preference for how the builder renders pickers and choice grids. */
import { getAppPresentationMode } from "@/lib/site-settings/app-presentation-mode"

export type BuilderLayout = "visual" | "compact"

/** The builder's internal card-view value maps 1:1 to the global layout preference. */
export type BuilderCardViewMode = "dense" | "cinematic"

export const BUILDER_LAYOUT_STORAGE_KEY = "dump-stat-builder-layout"
export const BUILDER_LAYOUT_CHANGE_EVENT = "dumpstat:builder-layout-change"
export const DEFAULT_BUILDER_LAYOUT: BuilderLayout = "visual"

export function isBuilderLayout(value: unknown): value is BuilderLayout {
  return value === "visual" || value === "compact"
}

export function layoutToCardViewMode(layout: BuilderLayout): BuilderCardViewMode {
  return layout === "visual" ? "cinematic" : "dense"
}

export function cardViewModeToLayout(mode: BuilderCardViewMode): BuilderLayout {
  return mode === "cinematic" ? "visual" : "compact"
}

export function getBuilderLayout(): BuilderLayout {
  if (typeof localStorage === "undefined") return DEFAULT_BUILDER_LAYOUT
  const stored = localStorage.getItem(BUILDER_LAYOUT_STORAGE_KEY)
  if (isBuilderLayout(stored)) return stored
  return getAppPresentationMode() === "compact-only" ? "compact" : "visual"
}

export function setBuilderLayout(layout: BuilderLayout): void {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(BUILDER_LAYOUT_STORAGE_KEY, layout)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(BUILDER_LAYOUT_CHANGE_EVENT))
  }
}
