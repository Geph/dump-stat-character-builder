import { afterEach, describe, expect, it, vi } from "vitest"
import { savedCharacterNavigationHref } from "../edit-href"

afterEach(() => vi.unstubAllEnvs())

describe("post-save character navigation", () => {
  it("includes the GitHub Pages project path", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/dump-stat-character-builder")
    expect(savedCharacterNavigationHref("abc 123")).toBe("/dump-stat-character-builder/characters/sheet?id=abc%20123&saved=1")
  })
  it("works at the site root for local and hosted installs", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "")
    expect(savedCharacterNavigationHref("abc")).toBe("/characters/sheet?id=abc&saved=1")
  })
})
