"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, X } from "lucide-react"

// Icons are served from /public/icons/*.svg
// Drop any SVG files into the public/icons directory and they will appear here.
// File name (without .svg) is the icon identifier stored in the database.
//
// The picker fetches /api/icons to get the list of available icons at runtime,
// falling back to an empty list if the route is not yet set up.

interface GameIconPickerProps {
  value: string | null
  onChange: (icon: string | null) => void
  label?: string
}

export function GameIconPicker({ value, onChange, label = "Icon" }: GameIconPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [availableIcons, setAvailableIcons] = useState<string[]>([])
  const [loadingList, setLoadingList] = useState(false)

  // Fetch available icon names from the API route when the picker opens
  useEffect(() => {
    if (!isOpen || availableIcons.length > 0) return
    setLoadingList(true)
    fetch("/api/icons")
      .then((r) => r.json())
      .then((data: { icons: string[] }) => setAvailableIcons(data.icons ?? []))
      .catch(() => setAvailableIcons([]))
      .finally(() => setLoadingList(false))
  }, [isOpen, availableIcons.length])

  const filtered = search
    ? availableIcons.filter((n) => n.toLowerCase().includes(search.toLowerCase()))
    : availableIcons

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-foreground">{label}</label>

      <div className="flex items-center gap-3">
        {/* Preview */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 rounded-xl border-2 border-border bg-card flex items-center justify-center hover:border-primary transition-colors overflow-hidden"
        >
          {value ? (
            <GameIcon name={value} className="w-10 h-10" />
          ) : (
            <span className="text-[10px] text-muted-foreground text-center leading-tight px-1">
              Choose
            </span>
          )}
        </button>

        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <span className="text-sm text-muted-foreground">
          {value ? value.replace(/-/g, " ") : "No icon selected"}
        </span>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border-2 border-border w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-foreground">Choose Icon</h3>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
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
                  placeholder="Search icons..."
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingList ? (
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                  {[...Array(32)].map((_, i) => (
                    <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <p className="text-muted-foreground text-sm">
                    {availableIcons.length === 0
                      ? "No icons found. Drop SVG files into the public/icons/ directory."
                      : "No icons match your search."}
                  </p>
                  {availableIcons.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center max-w-xs">
                      Files should be named like <code className="bg-muted px-1 rounded">sword.svg</code> and the name will be used as the icon identifier.
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                  {filtered.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => {
                        onChange(iconName)
                        setIsOpen(false)
                        setSearch("")
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

            <div className="p-3 border-t border-border text-xs text-muted-foreground text-center">
              {availableIcons.length} icon{availableIcons.length !== 1 ? "s" : ""} available &mdash; add more SVGs to{" "}
              <code className="bg-muted px-1 rounded">public/icons/</code>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Renders a single icon by name from /public/icons/<name>.svg
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
      // Normalise fill so CSS color works
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
