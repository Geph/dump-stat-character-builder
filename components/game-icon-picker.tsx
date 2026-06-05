"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, X } from "lucide-react"
import type { IconCategoryId } from "@/lib/icons/categories"
import { compendiumIconButtonClass } from "@/lib/compendium/editor-field-styles"

interface IconCategoryMeta {
  id: IconCategoryId | "other"
  label: string
  count: number
}

interface GameIconPickerProps {
  value: string | null
  onChange: (icon: string | null) => void
  label?: string
  /** Compact picker for compendium name rows (no label, smaller button). */
  inline?: boolean
}

export function GameIconPicker({
  value,
  onChange,
  label = "Icon",
  inline = false,
}: GameIconPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [categories, setCategories] = useState<IconCategoryMeta[]>([])
  const [activeCategory, setActiveCategory] = useState<string>("weapon")
  const [categoryIcons, setCategoryIcons] = useState<string[]>([])
  const [searchIcons, setSearchIcons] = useState<string[] | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [totalIcons, setTotalIcons] = useState(0)

  const isSearchMode = search.trim().length > 0
  const displayIcons = isSearchMode ? (searchIcons ?? []) : categoryIcons

  useEffect(() => {
    if (!isOpen) return

    setLoadingList(true)
    fetch("/api/icons")
      .then((r) => r.json())
      .then((data: { categories?: IconCategoryMeta[]; total?: number }) => {
        const cats = data.categories ?? []
        setCategories(cats)
        setTotalIcons(data.total ?? 0)
        const first =
          cats.find((c) => c.count > 0)?.id ?? cats[0]?.id ?? "weapon"
        setActiveCategory(first)
      })
      .catch(() => {
        setCategories([])
        setTotalIcons(0)
      })
      .finally(() => setLoadingList(false))
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || isSearchMode) return

    setLoadingList(true)
    fetch(`/api/icons?category=${encodeURIComponent(activeCategory)}`)
      .then((r) => r.json())
      .then((data: { icons: string[] }) => setCategoryIcons(data.icons ?? []))
      .catch(() => setCategoryIcons([]))
      .finally(() => setLoadingList(false))
  }, [isOpen, activeCategory, isSearchMode])

  useEffect(() => {
    if (!isOpen || !isSearchMode) {
      setSearchIcons(null)
      return
    }

    const timer = setTimeout(() => {
      setLoadingList(true)
      fetch(`/api/icons?search=${encodeURIComponent(search.trim())}`)
        .then((r) => r.json())
        .then((data: { icons: string[] }) => setSearchIcons(data.icons ?? []))
        .catch(() => setSearchIcons([]))
        .finally(() => setLoadingList(false))
    }, 250)

    return () => clearTimeout(timer)
  }, [isOpen, search, isSearchMode])

  const closePicker = useCallback(() => {
    setIsOpen(false)
    setSearch("")
    setSearchIcons(null)
  }, [])

  const buttonClass = inline
    ? compendiumIconButtonClass
    : `${compendiumIconButtonClass}`
  const iconSize = inline ? "w-7 h-7" : "w-8 h-8"

  return (
    <div className={inline ? "shrink-0" : "space-y-2"}>
      {!inline && (
        <label className="block text-sm font-semibold text-foreground">{label}</label>
      )}

      <div className={`flex items-center ${inline ? "gap-1" : "gap-3"}`}>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title={inline ? "Choose icon" : undefined}
          className={`${buttonClass} bg-card flex items-center justify-center hover:border-primary transition-colors overflow-hidden`}
        >
          {value ? (
            <GameIcon name={value} className={iconSize} />
          ) : (
            <span className="text-[9px] text-muted-foreground text-center leading-tight px-0.5">
              Choose
            </span>
          )}
        </button>

        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
            title="Remove icon"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border-2 border-border w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-foreground">Choose Icon</h3>
                <button
                  type="button"
                  onClick={closePicker}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search all icons..."
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {!isSearchMode && categories.length > 0 && (
              <div className="px-4 py-2 border-b border-border flex gap-1.5 overflow-x-auto shrink-0 scrollbar-hide">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      activeCategory === cat.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat.label}
                    <span className="ml-1 opacity-70">({cat.count})</span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4">
              {loadingList ? (
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                  {[...Array(32)].map((_, i) => (
                    <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              ) : displayIcons.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <p className="text-muted-foreground text-sm">
                    {totalIcons === 0
                      ? "No icons found. Drop SVG files into public/icons/."
                      : isSearchMode
                        ? "No icons match your search."
                        : "No icons in this category."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                  {displayIcons.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => {
                        onChange(iconName)
                        closePicker()
                      }}
                      title={iconName.replace(/-/g, " ")}
                      className={`aspect-square rounded-lg border-2 flex items-center justify-center transition-all hover:scale-105 ${
                        value === iconName
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background hover:border-primary/50"
                      }`}
                    >
                      <GameIcon name={iconName} className="w-8 h-8" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-border text-xs text-muted-foreground text-center shrink-0">
              {isSearchMode
                ? `${displayIcons.length} match${displayIcons.length === 1 ? "" : "es"}`
                : `${totalIcons} icons — categories from `}
              {!isSearchMode && (
                <a
                  href="https://game-icons.net/tags.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  game-icons.net
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface GameIconProps {
  name: string
  className?: string
  color?: string
}

const svgCache: Record<string, string | null> = {}

export function GameIcon({ name, className = "w-6 h-6", color }: GameIconProps) {
  const [svg, setSvg] = useState<string | null>(svgCache[name] ?? null)
  const [failed, setFailed] = useState(svgCache[name] === null)

  const load = useCallback(async () => {
    if (!name) return
    if (svgCache[name] !== undefined) {
      if (svgCache[name] === null) setFailed(true)
      else setSvg(svgCache[name])
      return
    }
    try {
      const res = await fetch(`/icons/${encodeURIComponent(name)}.svg`)
      if (!res.ok) throw new Error("not found")
      const text = await res.text()
      if (!text.includes("<svg")) throw new Error("not svg")
      const normalised = text
        .replace(/fill="(?!none)[^"]*"/g, 'fill="currentColor"')
        .replace(/stroke="(?!none)[^"]*"/g, "")
      svgCache[name] = normalised
      setSvg(normalised)
    } catch {
      svgCache[name] = null
      setFailed(true)
    }
  }, [name])

  useEffect(() => {
    setSvg(svgCache[name] ?? null)
    setFailed(svgCache[name] === null)
    if (svgCache[name] === undefined) load()
  }, [name, load])

  if (failed || !name) {
    return (
      <div className={`${className} bg-muted rounded flex items-center justify-center`}>
        <span className="text-[8px] text-muted-foreground">?</span>
      </div>
    )
  }

  if (!svg) {
    return <div className={`${className} bg-muted/50 rounded animate-pulse`} />
  }

  return (
    <div
      className={`${className} [&_svg]:w-full [&_svg]:h-full [&_svg]:fill-current`}
      style={color ? { color } : undefined}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
