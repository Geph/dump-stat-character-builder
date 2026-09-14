import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { pickRandomSheetBannerUrl, SHEET_BANNER_IMAGES } from "@/lib/site-images"

describe("sheet banner stock art", () => {
  it("lists optimized sheet banner paths for the full stock set", () => {
    expect(SHEET_BANNER_IMAGES.length).toBe(32)
    for (const url of SHEET_BANNER_IMAGES) {
      expect(url).toMatch(/\/images\/sheet-banners\/.+\.webp$/)
    }
  })

  it("ships an optimized webp for every listed banner", () => {
    const root = path.join(process.cwd(), "public/images/sheet-banners")
    for (const url of SHEET_BANNER_IMAGES) {
      const file = url.split("/").pop()
      expect(file).toBeTruthy()
      expect(fs.existsSync(path.join(root, file!)), `missing ${file}`).toBe(true)
      const kb = fs.statSync(path.join(root, file!)).size / 1024
      expect(kb).toBeLessThan(600)
    }
  })

  it("picks a listed banner URL", () => {
    const url = pickRandomSheetBannerUrl()
    expect(url).not.toBeNull()
    expect(SHEET_BANNER_IMAGES).toContain(url)
  })

  it("returns null for an empty list", () => {
    expect(pickRandomSheetBannerUrl([])).toBeNull()
  })
})
