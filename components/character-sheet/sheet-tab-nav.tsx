"use client"

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { SHEET_TAB_BUTTON } from "@/lib/character/sheet-status-colors"
import {
  UserCircle,
  Swords,
  Backpack,
  Sparkles,
  PawPrint,
  Wand2,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

export type SheetTab =
  | "abilities"
  | "details"
  | "combat"
  | "equipment"
  | "features"
  | "companions"
  | "custom"

const TAB_GAP_PX = 6
const ARROW_SLOT_PX = 36
const ROW_GAP_PX = 4

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

function tabButtonClassName(selected: boolean) {
  return `inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold whitespace-nowrap transition-colors ${
    selected ? SHEET_TAB_BUTTON.active : SHEET_TAB_BUTTON.idle
  }`
}

function totalTabRowWidth(tabWidths: number[], gap: number) {
  return tabWidths.reduce((sum, width, index) => sum + width + (index > 0 ? gap : 0), 0)
}

function partitionTabPages(tabWidths: number[], availableWidth: number, gap: number): number[][] {
  const pages: number[][] = []
  let index = 0

  while (index < tabWidths.length) {
    const page: number[] = []
    let used = 0

    while (index < tabWidths.length) {
      const width = tabWidths[index]!
      const extra = page.length > 0 ? gap : 0
      if (page.length > 0 && used + extra + width > availableWidth) break
      used += extra + width
      page.push(index)
      index++
    }

    if (page.length === 0) {
      page.push(index)
      index++
    }

    pages.push(page)
  }

  return pages
}

function SheetTabButton({
  tab,
  selected,
  onClick,
}: {
  tab: (typeof SHEET_TABS)[number]
  selected: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={tabButtonClassName(selected)}
    >
      {tab.icon}
      {tab.label}
    </button>
  )
}

export function SheetTabNav({ activeTab, onTabChange }: SheetTabNavProps) {
  const outerRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [outerWidth, setOuterWidth] = useState(0)
  const [tabWidths, setTabWidths] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(0)

  const measureLayout = () => {
    const outer = outerRef.current
    if (outer) setOuterWidth(outer.clientWidth)

    const measureRow = measureRef.current
    if (!measureRow) return

    const buttons = measureRow.querySelectorAll<HTMLElement>("button")
    setTabWidths(Array.from(buttons, (button) => button.offsetWidth))
  }

  useLayoutEffect(() => {
    measureLayout()
  }, [])

  useEffect(() => {
    const outer = outerRef.current
    if (!outer) return

    const observer = new ResizeObserver(() => {
      measureLayout()
    })
    observer.observe(outer)
    return () => observer.disconnect()
  }, [])

  const allTabIndices = useMemo(
    () => SHEET_TABS.map((_, index) => index),
    [],
  )

  const needsPagination = useMemo(() => {
    if (!tabWidths.length || !outerWidth) return false
    return totalTabRowWidth(tabWidths, TAB_GAP_PX) > outerWidth
  }, [outerWidth, tabWidths])

  const pages = useMemo(() => {
    if (!tabWidths.length || !outerWidth) return [allTabIndices]

    const totalWidth = totalTabRowWidth(tabWidths, TAB_GAP_PX)
    if (totalWidth <= outerWidth) return [allTabIndices]

    const availableWidth = outerWidth - 2 * ARROW_SLOT_PX - 2 * ROW_GAP_PX
    return partitionTabPages(tabWidths, availableWidth, TAB_GAP_PX)
  }, [allTabIndices, outerWidth, tabWidths])

  const pageCount = pages.length
  const safePage = Math.min(currentPage, Math.max(0, pageCount - 1))
  const visibleTabIndices = pages[safePage] ?? allTabIndices

  useEffect(() => {
    const activeIndex = SHEET_TABS.findIndex((tab) => tab.id === activeTab)
    if (activeIndex < 0) return

    const pageIndex = pages.findIndex((page) => page.includes(activeIndex))
    if (pageIndex >= 0) setCurrentPage(pageIndex)
  }, [activeTab, pages])

  useEffect(() => {
    if (currentPage > pageCount - 1) {
      setCurrentPage(Math.max(0, pageCount - 1))
    }
  }, [currentPage, pageCount])

  return (
    <div ref={outerRef} className="relative mb-3 -mx-1 overflow-hidden px-1">
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 -z-10 flex w-max gap-1.5 opacity-0"
      >
        {SHEET_TABS.map((tab) => (
          <SheetTabButton key={tab.id} tab={tab} selected={false} />
        ))}
      </div>

      <div className="flex items-stretch gap-1">
        {needsPagination ? (
          <button
            type="button"
            aria-label="Previous tabs"
            disabled={safePage === 0}
            onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
            className="flex h-11 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card/90 text-foreground transition-colors hover:bg-muted/90 disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : null}

        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex gap-1.5" role="tablist" aria-label="Sheet sections">
            {visibleTabIndices.map((tabIndex) => {
              const tab = SHEET_TABS[tabIndex]!
              const selected = activeTab === tab.id
              return (
                <SheetTabButton
                  key={tab.id}
                  tab={tab}
                  selected={selected}
                  onClick={() => onTabChange(tab.id)}
                />
              )
            })}
          </div>
        </div>

        {needsPagination ? (
          <button
            type="button"
            aria-label="Next tabs"
            disabled={safePage >= pageCount - 1}
            onClick={() => setCurrentPage((page) => Math.min(pageCount - 1, page + 1))}
            className="flex h-11 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card/90 text-foreground transition-colors hover:bg-muted/90 disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  )
}
