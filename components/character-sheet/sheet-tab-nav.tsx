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

type SheetTabGroup = "play" | "build" | "story"

type TabDef = {
  id: SheetTab
  label: string
  shortLabel: string
  icon: ReactNode
}

const TAB_GROUPS: {
  id: SheetTabGroup
  label: string
  tabs: TabDef[]
}[] = [
  {
    id: "play",
    label: "Play",
    tabs: [
      {
        id: "abilities",
        label: "Abilities & Skills",
        shortLabel: "Abilities",
        icon: <UserCircle className="w-4 h-4 shrink-0" aria-hidden />,
      },
      {
        id: "combat",
        label: "Combat",
        shortLabel: "Combat",
        icon: <Swords className="w-4 h-4 shrink-0" aria-hidden />,
      },
      {
        id: "companions",
        label: "Companion / Beast Form",
        shortLabel: "Companion",
        icon: <PawPrint className="w-4 h-4 shrink-0" aria-hidden />,
      },
    ],
  },
  {
    id: "build",
    label: "Build",
    tabs: [
      {
        id: "equipment",
        label: "Equipment",
        shortLabel: "Gear",
        icon: <Backpack className="w-4 h-4 shrink-0" aria-hidden />,
      },
      {
        id: "features",
        label: "Features",
        shortLabel: "Features",
        icon: <Sparkles className="w-4 h-4 shrink-0" aria-hidden />,
      },
      {
        id: "custom",
        label: "Custom",
        shortLabel: "Custom",
        icon: <Wand2 className="w-4 h-4 shrink-0" aria-hidden />,
      },
    ],
  },
  {
    id: "story",
    label: "Story",
    tabs: [
      {
        id: "details",
        label: "Character Details",
        shortLabel: "Details",
        icon: <FileText className="w-4 h-4 shrink-0" aria-hidden />,
      },
    ],
  },
]

const TAB_TO_GROUP = new Map<SheetTab, SheetTabGroup>(
  TAB_GROUPS.flatMap((group) => group.tabs.map((tab) => [tab.id, group.id] as const)),
)

export function groupForSheetTab(tab: SheetTab): SheetTabGroup {
  return TAB_TO_GROUP.get(tab) ?? "play"
}

export function firstTabInGroup(group: SheetTabGroup): SheetTab {
  return TAB_GROUPS.find((entry) => entry.id === group)?.tabs[0]?.id ?? "abilities"
}

type SheetTabNavProps = {
  activeTab: SheetTab
  onTabChange: (tab: SheetTab) => void
}

export function SheetTabNav({ activeTab, onTabChange }: SheetTabNavProps) {
  const activeGroup = groupForSheetTab(activeTab)
  const subTabs = TAB_GROUPS.find((group) => group.id === activeGroup)?.tabs ?? []

  return (
    <div className="mb-3 space-y-2">
      <div
        className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted/40 p-1"
        role="tablist"
        aria-label="Sheet sections"
      >
        {TAB_GROUPS.map((group) => {
          const selected = activeGroup === group.id
          return (
            <button
              key={group.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onTabChange(firstTabInGroup(group.id))}
              className={`min-h-11 rounded-lg px-3 text-sm font-bold transition-colors ${
                selected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-card hover:text-foreground"
              }`}
            >
              {group.label}
            </button>
          )
        })}
      </div>

      {subTabs.length > 1 ? (
        <div className="-mx-1 overflow-x-auto overscroll-x-contain pb-0.5">
          <div
            className="flex gap-1.5 px-1 min-w-max"
            role="tablist"
            aria-label={`${activeGroup} tabs`}
          >
            {subTabs.map((tab) => {
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
                      ? "bg-card text-foreground ring-1 ring-border shadow-sm"
                      : "bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground"
                  }`}
                >
                  {tab.icon}
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
