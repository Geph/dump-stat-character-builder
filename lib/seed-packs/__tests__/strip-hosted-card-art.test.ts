import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { mhpClassCardImageUrl } from "@/lib/seed-packs/mage-hand-press/class-presentation"
import { stripBlockedHostedCardArt } from "@/lib/seed-packs/strip-hosted-card-art"

describe("stripBlockedHostedCardArt", () => {
  it("does not emit hosted jeffginger class portraits", () => {
    expect(mhpClassCardImageUrl("alchemist")).toBeNull()
  })

  it("clears jeffginger image fields and leaves other URLs alone", () => {
    const next = stripBlockedHostedCardArt({
      name: "Alchemist",
      card_image_url: "https://jeffginger.com/dumpstat/images/magehandpress/classes/alchemist.png",
      creator_url: "https://magehandpress.com/category/content/mage-hand-press-classes/alchemist/",
      subclasses: [
        {
          name: "Mad Bomber",
          card_image_url: "https://jeffginger.com/dumpstat/images/magehandpress/subclasses/bomber.png",
        },
      ],
    })
    expect(next.card_image_url).toBeNull()
    expect(next.subclasses[0].card_image_url).toBeNull()
    expect(next.creator_url).toContain("magehandpress.com")
  })

  it("keeps bundled seed JSON free of jeffginger.com image URLs", () => {
    const root = join(process.cwd(), "lib", "seed-packs")
    for (const pack of ["mage-hand-press", "kibbles-tasty"]) {
      for (const file of readdirSync(join(root, pack)).filter((name) => name.endsWith(".json"))) {
        const text = readFileSync(join(root, pack, file), "utf8")
        expect(text.includes("jeffginger.com"), `${pack}/${file}`).toBe(false)
      }
    }
  })
})
