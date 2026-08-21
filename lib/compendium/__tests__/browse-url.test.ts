import { describe, expect, it } from "vitest"
import {
  compendiumBrowseHref,
  compendiumBrowseUrlMatches,
  parseCompendiumBrowseTab,
  readCompendiumBrowseState,
} from "@/lib/compendium/browse-url"

describe("compendium browse URL", () => {
  it("keeps a trimmed search query when switching tabs", () => {
    expect(compendiumBrowseHref("abilities", "bomb")).toBe("/compendium?tab=abilities&q=bomb")
    expect(compendiumBrowseHref("classes", "  bomb  ")).toBe("/compendium?tab=classes&q=bomb")
  })

  it("omits q when the box is empty so tab-only URLs stay stable", () => {
    expect(compendiumBrowseHref("classes", "   ")).toBe("/compendium?tab=classes")
  })

  it("treats tab + trimmed query as already matching the URL", () => {
    const params = new URLSearchParams("tab=classes&q=bomb")
    expect(compendiumBrowseUrlMatches(params, "classes", "bomb")).toBe(true)
    expect(compendiumBrowseUrlMatches(params, "classes", " bomb ")).toBe(true)
    expect(compendiumBrowseUrlMatches(params, "abilities", "bomb")).toBe(false)
    expect(compendiumBrowseUrlMatches(params, "classes", "")).toBe(false)
  })

  it("reads tab and query from the address bar", () => {
    expect(parseCompendiumBrowseTab("abilities")).toBe("abilities")
    expect(parseCompendiumBrowseTab("nope")).toBe("classes")
    expect(readCompendiumBrowseState(new URLSearchParams("tab=abilities&q=bomb"))).toEqual({
      tab: "abilities",
      query: "bomb",
    })
  })
})
