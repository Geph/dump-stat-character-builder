import { describe, expect, it } from "vitest"
import { markdownInlineToHtml, markdownToHtml } from "@/lib/compendium/markdown-to-html"
import { isHtml } from "@/lib/compendium/html-utils"

describe("markdownToHtml", () => {
  it("italicizes SRD-style _Name._ option labels", () => {
    const input =
      "You gain one of the following feature options of your choice.\n_Colossus Slayer._ Your tenacity can wear down even the most resilient foes.\n_Horde Breaker._ Once on each of your turns when you make an attack with a weapon, you can make another attack."
    expect(isHtml(input)).toBe(false)
    const html = markdownToHtml(input)
    expect(html).toContain("<em>Colossus Slayer.</em>")
    expect(html).toContain("<em>Horde Breaker.</em>")
    expect(html).not.toContain("_Colossus")
  })

  it("handles bold and italic inline", () => {
    expect(markdownInlineToHtml("**bold** and _italic_")).toBe(
      "<strong>bold</strong> and <em>italic</em>",
    )
  })

  it("converts markdown left inside HTML-wrapped descriptions", () => {
    const input =
      "<p>_Colossus Slayer._ Your tenacity can wear down foes.</p><p>_Horde Breaker._ Extra attack.</p>"
    expect(isHtml(input)).toBe(true)
    const html = markdownToHtml(input)
    expect(html).toContain("<em>Colossus Slayer.</em>")
    expect(html).toContain("<em>Horde Breaker.</em>")
    expect(html).not.toContain("_Colossus")
  })

  it("converts bold headings that sit next to HTML tables", () => {
    const input =
      "You always have the listed spells prepared.\n**Life Domain Spells**\n<table><tbody><tr><td>3</td><td>Aid</td></tr></tbody></table>"
    const html = markdownToHtml(input)
    expect(html).toContain("<strong>Life Domain Spells</strong>")
    expect(html).toContain("<table>")
    expect(html).not.toContain("**Life")
  })
})
