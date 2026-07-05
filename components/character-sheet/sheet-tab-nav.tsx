"use client"

import type { ReactNode } from "react"
import {
  UserCircle,
  Swords,
  Backpack,
  Sparkles,
  PawPrint,
  Wand2,
  FileText,
} from "lucide-react"

export type SheetTab =
  | "abilities"
  | "details"
  | "combat"
  | "equipment"
  | "features"
  | "companions"
  | "custom"

const SHEET_TABS: {
  id: SheetTab
  label: string
  icon: ReactNode
}[] = [
  {
    id: "abilities",
    label: "Abilities & Skills",
    icon: <UserCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />,
  },
  {
    id: "combat",
    label: "Combat",
    icon: <Swords className="w-3.5 h-3.5 shrink-0" aria-hidden />,
  },
  {
    id: "equipment",
    label: "Equipment",
    icon: <Backpack className="w-3.5 h-3.5 shrink-0" aria-hidden />,
  },
  {
    id: "features",
    label: "Features",
    icon: <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden />,
  },
  {
    id: "companions",
    label: "Companion / Beast Form",
    icon: <PawPrint className="w-3.5 h-3.5 shrink-0" aria-hidden />,
  },
  {
    id: "custom",
    label: "Custom",
    icon: <Wand2 className="w-3.5 h-3.5 shrink-0" aria-hidden />,
  },
  {
    id: "details",
    label: "Character Details",
    icon: <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden />,
  },
]

type SheetTabNavProps = {
  activeTab: SheetTab
  onTabChange: (tab: SheetTab) => void
}

export function SheetTabNav({ activeTab, onTabChange }: SheetTabNavProps) {
  return (
    <div className="mb-3 -mx-1 overflow-x-auto overscroll-x-contain">
      <div className="flex gap-1.5 px-1 min-w-max" role="tablist" aria-label="Sheet sections">
        {SHEET_TABS.map((tab) => {
          const selected = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onTabChange(tab.id)}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                selected
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
