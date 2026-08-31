import { describe, expect, it } from "vitest"
import {
  filterAvailableDefaultCardImageUrl,
  isDefaultCardArtAvailable,
} from "@/lib/compendium/available-card-art"
import { withBasePath } from "@/lib/config/deploy-mode"

describe("available-card-art", () => {
  it("always treats git-bundled SRD / Kibbles paths as available", () => {
    const url = withBasePath("/images/compendium/classes/barbarian.png")
    expect(isDefaultCardArtAvailable(url)).toBe(true)
    expect(filterAvailableDefaultCardImageUrl(url)).toBe(url)
  })

  it("exposes PHB portraits only when the optimized file exists locally", () => {
    const url = withBasePath("/images/compendium/subclasses/bard/college-of-dance.png")
    // This machine has local PHB art after images:optimize; CI / GitHub clones should not.
    const fs = require("node:fs") as typeof import("node:fs")
    const path = require("node:path") as typeof import("node:path")
    const onDisk = fs.existsSync(
      path.join(process.cwd(), "public/images/compendium/subclasses/bard/college-of-dance.png"),
    )
    expect(isDefaultCardArtAvailable(url)).toBe(onDisk)
    expect(filterAvailableDefaultCardImageUrl(url)).toBe(onDisk ? url : null)
  })

  it("leaves non-compendium URLs untouched", () => {
    expect(filterAvailableDefaultCardImageUrl("https://example.com/art.png")).toBe(
      "https://example.com/art.png",
    )
  })

  it("treats a local-only background as available only when the PNG exists", () => {
    const url = withBasePath("/images/compendium/backgrounds/charlatan.png")
    const fs = require("node:fs") as typeof import("node:fs")
    const path = require("node:path") as typeof import("node:path")
    const onDisk = fs.existsSync(
      path.join(process.cwd(), "public/images/compendium/backgrounds/charlatan.png"),
    )
    expect(isDefaultCardArtAvailable(url)).toBe(onDisk)
    expect(filterAvailableDefaultCardImageUrl(url)).toBe(onDisk ? url : null)
  })
})
