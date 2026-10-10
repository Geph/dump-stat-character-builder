import { describe, expect, it } from "vitest"
import { existsSync } from "node:fs"
import { join } from "node:path"
import defaults from "../custom-ability-art.json"
import { getCompendiumCardImageUrl } from "../card-image"
import { isBundledPublicCardArtPath } from "../bundled-card-art"

describe("user-provided Psion art", () => {
  it("ships every mapped default in the public allowlist", () => {
    for (const url of Object.values(defaults)) {
      expect(existsSync(join(process.cwd(), "public", url))).toBe(true)
      expect(isBundledPublicCardArtPath(`public${url}`)).toBe(true)
    }
  })
  it("fills missing art only for the matching publisher and preserves overrides", () => {
    expect(getCompendiumCardImageUrl({ name: "Astral Construct", source: "Kibbles Tasty" })).toBe(defaults["Astral Construct"])
    expect(getCompendiumCardImageUrl({ name: "Astral Construct", source: "Other" })).toBeNull()
    expect(getCompendiumCardImageUrl({ name: "Astral Construct", source: "Kibbles Tasty", card_image_url: "https://example.com/custom.png" })).toBe("https://example.com/custom.png")
  })
})
