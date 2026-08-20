import { describe, expect, it } from "vitest"
import {
  formatLibraryBackgroundUploadHint,
  MAX_LIBRARY_BG_FILE_MB,
  validateLibraryBackgroundFile,
} from "@/lib/site-settings/library-background"
import { formatHeroBackgroundUploadHint } from "@/lib/site-settings/hero-background"

describe("library and hero upload hints", () => {
  it("documents reduced library cover limits", () => {
    expect(formatLibraryBackgroundUploadHint()).toContain("16:9 landscape")
    expect(formatLibraryBackgroundUploadHint()).toContain("1600×900")
    expect(formatLibraryBackgroundUploadHint()).toContain(String(MAX_LIBRARY_BG_FILE_MB))
  })

  it("documents reduced hero banner limits", () => {
    expect(formatHeroBackgroundUploadHint()).toContain("1920×810")
    expect(formatHeroBackgroundUploadHint()).toContain("2 MB")
  })

  it("rejects oversize library files", () => {
    expect(
      validateLibraryBackgroundFile({
        type: "image/jpeg",
        size: 2 * 1024 * 1024 + 1,
      } as File),
    ).toMatch(/2 MB/)
  })
})
