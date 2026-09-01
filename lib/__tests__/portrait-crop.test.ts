import { describe, expect, it } from "vitest"
import {
  defaultPortraitCrop,
  normalizePortraitCrop,
  panPortraitCrop,
  resolvePortraitCropRect,
} from "@/lib/portrait"

describe("resolvePortraitCropRect", () => {
  it("uses the largest centered square on a landscape image", () => {
    expect(resolvePortraitCropRect(2000, 1000, defaultPortraitCrop())).toEqual({
      sx: 500,
      sy: 0,
      size: 1000,
    })
  })

  it("uses the largest centered square on a portrait image", () => {
    expect(resolvePortraitCropRect(800, 1600, defaultPortraitCrop())).toEqual({
      sx: 0,
      sy: 400,
      size: 800,
    })
  })

  it("zooms in around the center and stays inside the image", () => {
    const rect = resolvePortraitCropRect(1000, 1000, { cx: 0.5, cy: 0.5, zoom: 2 })
    expect(rect.size).toBe(500)
    expect(rect.sx).toBe(250)
    expect(rect.sy).toBe(250)
  })

  it("clamps a corner zoom so the square stays in-bounds", () => {
    const rect = resolvePortraitCropRect(1000, 800, { cx: 0, cy: 0, zoom: 2 })
    expect(rect.size).toBe(400)
    expect(rect.sx).toBe(0)
    expect(rect.sy).toBe(0)
  })
})

describe("normalizePortraitCrop", () => {
  it("rewrites an out-of-bounds center to the clamped square", () => {
    const next = normalizePortraitCrop(1000, 800, { cx: 0, cy: 0, zoom: 1 })
    expect(next.zoom).toBe(1)
    expect(next.cx).toBeCloseTo(0.4)
    expect(next.cy).toBeCloseTo(0.5)
  })
})

describe("panPortraitCrop", () => {
  it("moves the crop and reclamps", () => {
    const start = defaultPortraitCrop()
    const panned = panPortraitCrop(2000, 1000, start, 0.5, 0)
    expect(panned.cx).toBeGreaterThan(start.cx)
    const rect = resolvePortraitCropRect(2000, 1000, panned)
    expect(rect.sx + rect.size).toBeLessThanOrEqual(2000)
  })
})
