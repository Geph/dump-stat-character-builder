"use client"

import { useEffect, useState } from "react"
import {
  getPickerPageSize,
  getSpellPickerPageSize,
  PICKER_LARGE_MIN_WIDTH,
  SPELL_PICKER_MD_MIN_WIDTH,
  type PickerViewMode,
} from "@/lib/builder/picker-pagination"

export function useIsLargePickerScreen(): boolean {
  const [isLarge, setIsLarge] = useState(true)

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${PICKER_LARGE_MIN_WIDTH}px)`)
    const update = () => setIsLarge(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  return isLarge
}

export function usePickerPageSize(mode: PickerViewMode): number {
  const isLarge = useIsLargePickerScreen()
  return getPickerPageSize(mode, isLarge)
}

export function useIsMdPickerScreen(): boolean {
  const [isMd, setIsMd] = useState(true)

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${SPELL_PICKER_MD_MIN_WIDTH}px)`)
    const update = () => setIsMd(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  return isMd
}

export function useSpellPickerPageSize(): number {
  const isMd = useIsMdPickerScreen()
  return getSpellPickerPageSize(isMd)
}
