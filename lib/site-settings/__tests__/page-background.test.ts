import { describe, expect, it } from "vitest"
import {
  formatPageBackgroundUploadHint,
  MAX_PAGE_BG_FILE_MB,
  validatePageBackgroundFile,
} from "@/lib/site-settings/page-background"
import { themePageBackgroundAssetPath } from "@/lib/site-settings/theme-page-backgrounds"

describe("page background upload", () => {
  it("documents 2:3 portrait limits in the hint", () => {
    expect(formatPageBackgroundUploadHint()).toContain("2:3 portrait")
    expect(formatPageBackgroundUploadHint()).toContain("1200×1800")
    expect(formatPageBackgroundUploadHint()).toContain(String(MAX_PAGE_BG_FILE_MB))
  })

  it("rejects oversize and unsupported files", () => {
    expect(
      validatePageBackgroundFile({
        type: "image/jpeg",
        size: 4 * 1024 * 1024 + 1,
      } as File),
    ).toMatch(/4 MB/)
    expect(
      validatePageBackgroundFile({ type: "image/gif", size: 1000 } as File),
    ).toMatch(/JPEG/)
  })

  it("accepts typical image types within the size limit", () => {
    expect(
      validatePageBackgroundFile({ type: "image/webp", size: 1024 } as File),
    ).toBeNull()
  })

  it("uses predictable bundled asset paths per theme", () => {
    expect(themePageBackgroundAssetPath("arcane")).toBe("/images/page-backgrounds/arcane.webp")
  })
})
