import { existsSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { isBundledPublicCardArtPath } from "@/lib/compendium/bundled-card-art"
import { listLocalOnlyCardArtRelativePaths } from "@/lib/compendium/list-local-card-art"

describe("listLocalOnlyCardArtRelativePaths", () => {
  it("lists local-only backgrounds that exist on disk and skips bundled ones", () => {
    const paths = listLocalOnlyCardArtRelativePaths()
    const charlatanOnDisk = existsSync(
      join(process.cwd(), "public/images/compendium/backgrounds/charlatan.png"),
    )
    expect(paths.includes("backgrounds/charlatan.png")).toBe(charlatanOnDisk)
    expect(paths.includes("backgrounds/acolyte.png")).toBe(false)
    const inventorOnDisk = existsSync(
      join(process.cwd(), "public/images/compendium/classes/inventor.png"),
    )
    expect(paths.includes("classes/inventor.png")).toBe(inventorOnDisk)
    expect(
      isBundledPublicCardArtPath("public/images/compendium/backgrounds/acolyte.png"),
    ).toBe(true)
  })
})
