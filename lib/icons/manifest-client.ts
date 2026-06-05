import { getBasePath, isStaticDeploy } from "@/lib/config/deploy-mode"
import type { IconCategoryId } from "./categories"

export type IconManifestCategory = {
  id: IconCategoryId | "other"
  label: string
  count: number
}

type IconManifest = {
  total: number
  categories: IconManifestCategory[]
  byCategory: Record<string, string[]>
  icons: string[]
}

let cachedManifest: IconManifest | null = null

function manifestUrl(): string {
  const base = getBasePath()
  return `${base}/icons/manifest.json`
}

export async function loadIconManifest(): Promise<IconManifest> {
  if (cachedManifest) return cachedManifest
  const res = await fetch(manifestUrl())
  if (!res.ok) throw new Error("Failed to load icon manifest")
  cachedManifest = (await res.json()) as IconManifest
  return cachedManifest
}

export function shouldUseIconManifest(): boolean {
  return isStaticDeploy()
}

export async function fetchIconCategories(): Promise<{ categories: IconManifestCategory[]; total: number }> {
  if (shouldUseIconManifest()) {
    const manifest = await loadIconManifest()
    return { categories: manifest.categories, total: manifest.total }
  }
  const res = await fetch("/api/icons")
  const data = await res.json()
  return { categories: data.categories ?? [], total: data.total ?? 0 }
}

export async function fetchIconsByCategory(category: string): Promise<string[]> {
  if (shouldUseIconManifest()) {
    const manifest = await loadIconManifest()
    return manifest.byCategory[category] ?? []
  }
  const res = await fetch(`/api/icons?category=${encodeURIComponent(category)}`)
  const data = await res.json()
  return data.icons ?? []
}

export async function searchIcons(query: string): Promise<string[]> {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return []
  if (shouldUseIconManifest()) {
    const manifest = await loadIconManifest()
    return manifest.icons.filter((name) => name.toLowerCase().includes(trimmed)).slice(0, 240)
  }
  const res = await fetch(`/api/icons?search=${encodeURIComponent(trimmed)}`)
  const data = await res.json()
  return data.icons ?? []
}
