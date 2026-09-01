import {
  isBundledPublicCardArtPath,
  publicCardArtPathFromUrl,
} from "@/lib/compendium/bundled-card-art"
import { withBasePath } from "@/lib/config/deploy-mode"

/** Written by `pnpm images:optimize`; gitignored. Lists local-only card art relative to `public/images/compendium/`. */
export const LOCAL_AVAILABLE_CARD_ART_MANIFEST_URL = "/images/compendium/local-available-card-art.json"
export const LOCAL_AVAILABLE_CARD_ART_MANIFEST_REPO_PATH =
  "public/images/compendium/local-available-card-art.json"
/** Hosted / `next dev` fallback when the optimize manifest is missing. */
export const LOCAL_AVAILABLE_CARD_ART_API_URL = "/api/local-card-art"
let browserLocalAvailable: Set<string> | null = null
let browserManifestPromise: Promise<void> | null = null

function normalizeCompendiumRelative(repoOrPublicPath: string): string | null {
  const n = String(repoOrPublicPath ?? "").replace(/\\/g, "/")
  const marker = "images/compendium/"
  const idx = n.indexOf(marker)
  if (idx < 0) return null
  return n.slice(idx + marker.length).replace(/^\//, "")
}

function readLocalAvailableFromDisk(): Set<string> {
  if (typeof window !== "undefined") return new Set()
  try {
    // Dynamic require keeps this module safe for client bundles.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs") as typeof import("node:fs")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("node:path") as typeof import("node:path")
    const full = path.join(process.cwd(), LOCAL_AVAILABLE_CARD_ART_MANIFEST_REPO_PATH)
    if (!fs.existsSync(full)) return new Set()
    const parsed = JSON.parse(fs.readFileSync(full, "utf8")) as { paths?: unknown }
    const available = new Set<string>()
    if (!Array.isArray(parsed.paths)) return available
    for (const entry of parsed.paths) {
      if (typeof entry === "string" && entry.trim()) {
        available.add(entry.replace(/\\/g, "/").replace(/^\//, ""))
      }
    }
    return available
  } catch {
    return new Set()
  }
}

function existsOnDisk(repoRelative: string): boolean {
  if (typeof window !== "undefined") return false
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs") as typeof import("node:fs")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("node:path") as typeof import("node:path")
    return fs.existsSync(path.join(process.cwd(), repoRelative))
  } catch {
    return false
  }
}

/**
 * Whether a default `/images/compendium/…` portrait should be assigned or shown.
 * Git-bundled SRD / Kibbles seed art (and already-shipped species portraits) is always available.
 * Kibbles, setting-book, and other local-only art apply when the PNG is on this install
 * (optimize manifest, live disk listing, or a file check on the server).
 */
export function isDefaultCardArtAvailable(url: string | null | undefined): boolean {
  const existing = typeof url === "string" ? url.trim() : ""
  if (!existing) return false
  const repoRel = publicCardArtPathFromUrl(existing)
  if (!repoRel) return false
  if (isBundledPublicCardArtPath(repoRel)) return true

  const relative = normalizeCompendiumRelative(repoRel)
  if (!relative) return false

  if (typeof window === "undefined") {
    if (existsOnDisk(repoRel)) return true
    return readLocalAvailableFromDisk().has(relative)
  }

  if (browserLocalAvailable?.has(relative)) return true
  void ensureLocalAvailableCardArtLoaded()
  return false
}

/** Drop default URLs that are not present on this install (keeps custom / remote URLs). */
export function filterAvailableDefaultCardImageUrl(url: string | null): string | null {
  if (!url) return null
  if (!/\/images\/compendium\//i.test(url)) return url
  return isDefaultCardArtAvailable(url) ? url : null
}

export type DefaultCardImageAvailability = {
  /** When false, return the mapped `/images/compendium/…` path even if the file is missing. */
  requireAvailable?: boolean
}

/** Apply availability filtering unless the caller is only peeking at the mapped path. */
export function maybeFilterDefaultCardImageUrl(
  url: string | null,
  requireAvailable = true,
): string | null {
  return requireAvailable ? filterAvailableDefaultCardImageUrl(url) : url
}

function collectCardArtPaths(parsed: { paths?: unknown }): Set<string> {
  const next = new Set<string>()
  if (!Array.isArray(parsed.paths)) return next
  for (const entry of parsed.paths) {
    if (typeof entry === "string" && entry.trim()) {
      next.add(entry.replace(/\\/g, "/").replace(/^\//, ""))
    }
  }
  return next
}

async function fetchCardArtPaths(url: string): Promise<Set<string> | null> {
  try {
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) return null
    return collectCardArtPaths((await res.json()) as { paths?: unknown })
  } catch {
    return null
  }
}

/**
 * Load local-only card-art availability in the browser.
 * Prefers the gitignored optimize manifest, then the live disk listing from `/api/local-card-art`.
 * Safe no-op when both are missing (GitHub / seed-only / static installs).
 */
export function ensureLocalAvailableCardArtLoaded(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (browserLocalAvailable) return Promise.resolve()
  if (browserManifestPromise) return browserManifestPromise

  browserManifestPromise = (async () => {
    try {
      const next = new Set<string>()
      const manifest = await fetchCardArtPaths(withBasePath(LOCAL_AVAILABLE_CARD_ART_MANIFEST_URL))
      if (manifest) {
        for (const entry of manifest) next.add(entry)
      }
      const live = await fetchCardArtPaths(withBasePath(LOCAL_AVAILABLE_CARD_ART_API_URL))
      if (live) {
        for (const entry of live) next.add(entry)
      }
      browserLocalAvailable = next
      window.dispatchEvent(new CustomEvent("dumpstat:local-card-art-available"))
    } catch {
      browserLocalAvailable = new Set()
    }
  })()

  return browserManifestPromise
}

/** Test helper — reset browser cache between cases. */
export function resetLocalAvailableCardArtCacheForTests(): void {
  browserLocalAvailable = null
  browserManifestPromise = null
}
