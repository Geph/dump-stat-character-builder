"use client"

import { useState, useEffect } from "react"
import { Search, X } from "lucide-react"

// Popular D&D-related icons from game-icons.net
// These are organized by category for easy browsing
const ICON_CATEGORIES = {
  "Combat": [
    "crossed-swords", "sword-wound", "bloody-sword", "two-handed-sword", "broadsword",
    "axe-swing", "battle-axe", "war-hammer", "mace-head", "bow-arrow",
    "arrow-cluster", "daggers", "saber-slash", "punch-blast", "fist",
    "shield", "round-shield", "bordered-shield", "spear-hook", "halberd"
  ],
  "Magic": [
    "magic-swirl", "spell-book", "wand", "crystal-ball", "fire-ray",
    "ice-bolt", "lightning-helix", "magic-portal", "pentacle", "vortex",
    "fairy-wand", "book-aura", "flame", "snowflake-1", "thunder-struck",
    "charm", "curly-wing", "meditation", "third-eye", "enlightenment"
  ],
  "Creatures": [
    "dragon-head", "spiked-dragon-head", "wyvern", "wolf-head", "bear-head",
    "spider-face", "goblin-head", "orc-head", "troll", "minotaur",
    "vampire-dracula", "skeleton", "ghost", "slime", "giant",
    "fairy", "mermaid", "centaur", "gargoyle", "golem-head"
  ],
  "Nature": [
    "oak", "pine-tree", "palm-tree", "shamrock", "flower-twirl",
    "sun", "moon", "star-swirl", "cloud", "lightning-trio",
    "water-drop", "stone-pile", "mountain", "cave-entrance", "campfire"
  ],
  "Skills": [
    "rogue", "ninja-mask", "spy", "cowled", "lock-picking",
    "eyeball", "magnifying-glass", "compass", "foot-trip", "jump-across",
    "run", "sprint", "weight-lifting-up", "biceps", "brain",
    "conversation", "convinced", "embrassed-energy", "healing", "health-potion"
  ],
  "Items": [
    "chest", "locked-chest", "open-treasure-chest", "coin-pile", "two-coins",
    "ring", "gem-pendant", "crown", "belt", "cape",
    "backpack", "scroll-unfurled", "potion-ball", "cauldron", "candle-holder",
    "key", "padlock", "rope-coil", "torch", "lantern"
  ],
  "Classes": [
    "sword-brandish", "sword-spin", "battle-gear", "barbarian", "gladius",
    "wizard-staff", "orb-wand", "wizard-face", "pointy-hat", "spell-book",
    "holy-symbol", "angel-outfit", "hood", "archer", "hunting-horn",
    "druid-sickle", "vine-leaf", "lyre", "harp", "musical-notes"
  ],
  "Species": [
    "person", "hooded-figure", "dwarf-helmet", "dwarf-face", "elf-ear",
    "orc-head", "goblin-head", "half-body-crawling", "horned-skull", "dragon-head",
    "tiefling", "dragonborn", "gnome-helmet", "halfling", "aasimar"
  ]
}

// Flatten all icons for search
const ALL_ICONS = Object.values(ICON_CATEGORIES).flat()

interface GameIconPickerProps {
  value: string | null
  onChange: (icon: string | null) => void
  label?: string
}

export function GameIconPicker({ value, onChange, label = "Icon" }: GameIconPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("Combat")

  // Filter icons based on search
  const filteredIcons = search 
    ? ALL_ICONS.filter(icon => icon.toLowerCase().includes(search.toLowerCase()))
    : ICON_CATEGORIES[activeCategory as keyof typeof ICON_CATEGORIES] || []

  const getIconUrl = (iconName: string) => 
    `https://raw.githubusercontent.com/game-icons/icons/master/delapouite/originals/svg/${iconName}.svg`

  const getIconUrlAlt = (iconName: string) =>
    `https://raw.githubusercontent.com/game-icons/icons/master/lorc/originals/svg/${iconName}.svg`

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-foreground">{label}</label>
      
      <div className="flex items-center gap-3">
        {/* Preview current icon */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-16 h-16 rounded-xl border-2 border-border bg-card flex items-center justify-center hover:border-primary transition-colors overflow-hidden"
        >
          {value ? (
            <GameIcon name={value} className="w-10 h-10" />
          ) : (
            <span className="text-xs text-muted-foreground text-center">Choose Icon</span>
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
        
        <span className="text-sm text-muted-foreground">{value || "No icon selected"}</span>
      </div>

      {/* Icon picker modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
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
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search icons..."
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Categories */}
            {!search && (
              <div className="flex gap-1 p-2 border-b border-border overflow-x-auto">
                {Object.keys(ICON_CATEGORIES).map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      activeCategory === category
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}

            {/* Icon grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                {filteredIcons.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => {
                      onChange(iconName)
                      setIsOpen(false)
                    }}
                    className={`aspect-square rounded-lg border-2 flex items-center justify-center transition-all hover:scale-105 ${
                      value === iconName
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:border-primary/50"
                    }`}
                    title={iconName.replace(/-/g, " ")}
                  >
                    <GameIcon name={iconName} className="w-8 h-8" />
                  </button>
                ))}
              </div>
              
              {filteredIcons.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No icons found</p>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border text-xs text-muted-foreground text-center">
              Icons from <a href="https://game-icons.net" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">game-icons.net</a> (CC BY 3.0)
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Component to render a game icon by name
interface GameIconProps {
  name: string
  className?: string
  fallbackColor?: string
}

export function GameIcon({ name, className = "w-6 h-6", fallbackColor = "currentColor" }: GameIconProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!name) return

    const fetchIcon = async () => {
      // Try delapouite first, then lorc
      const urls = [
        `https://raw.githubusercontent.com/game-icons/icons/master/delapouite/originals/svg/${name}.svg`,
        `https://raw.githubusercontent.com/game-icons/icons/master/lorc/originals/svg/${name}.svg`,
        `https://raw.githubusercontent.com/game-icons/icons/master/skoll/originals/svg/${name}.svg`,
      ]

      for (const url of urls) {
        try {
          const response = await fetch(url)
          if (response.ok) {
            let svg = await response.text()
            // Remove any fill/stroke attributes to allow CSS styling
            svg = svg.replace(/fill="[^"]*"/g, '')
            svg = svg.replace(/stroke="[^"]*"/g, '')
            setSvgContent(svg)
            setError(false)
            return
          }
        } catch {
          continue
        }
      }
      setError(true)
    }

    fetchIcon()
  }, [name])

  if (error || !name) {
    return (
      <div className={`${className} bg-muted rounded flex items-center justify-center`}>
        <span className="text-[8px] text-muted-foreground">?</span>
      </div>
    )
  }

  if (!svgContent) {
    return <div className={`${className} bg-muted/50 rounded animate-pulse`} />
  }

  return (
    <div 
      className={`${className} [&_svg]:w-full [&_svg]:h-full [&_svg]:fill-current`}
      style={{ color: fallbackColor }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  )
}
