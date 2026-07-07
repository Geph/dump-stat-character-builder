"use client"

import { useEffect, useState } from "react"
import {
  getFeatSpellGrantPickerPageSize,
  getPickerPageSize,
  getSpellPickerPageSize,
  PICKER_LARGE_MIN_WIDTH,
  PICKER_SM_MIN_WIDTH,
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

/** Below Tailwind `sm` — horizontal swipe carousel for cinematic pickers. */
export function useIsPhonePickerScreen(): boolean {
  const [isPhone, setIsPhone] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${PICKER_SM_MIN_WIDTH - 1}px)`)
    const update = () => setIsPhone(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  return isPhone
}

/** Tablet range (`sm` through `lg`−1) — portrait compendium cards in visual builder. */
export function useIsMediumPickerScreen(): boolean {
  const [isMedium, setIsMedium] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(
      `(min-width: ${PICKER_SM_MIN_WIDTH}px) and (max-width: ${PICKER_LARGE_MIN_WIDTH - 1}px)`,
    )
    const update = () => setIsMedium(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  return isMedium
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

export function useIsSmPickerScreen(): boolean {
  const [isSm, setIsSm] = useState(true)

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${PICKER_SM_MIN_WIDTH}px)`)
    const update = () => setIsSm(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  return isSm
}

export function useFeatSpellGrantPickerPageSize(): number {
  const isSm = useIsSmPickerScreen()
  return getFeatSpellGrantPickerPageSize(isSm)
}
