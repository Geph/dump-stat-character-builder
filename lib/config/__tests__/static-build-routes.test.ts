import { readdirSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, expect, it } from "vitest"
import { DYNAMIC_ROUTES } from "../../../scripts/static-build-routes.mjs"

const root = process.cwd()

/** Normalize to forward slashes so Windows `relative()` paths match DYNAMIC_ROUTES. */
function asRoutePath(value: string): string {
  return value.replace(/\\/g, "/")
}

/** Every app/ directory holding a [dynamic] segment, shallowest first. */
function dynamicRouteDirs(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const full = join(dir, entry.name)
    if (/^\[.+\]$/.test(entry.name)) {
      found.push(asRoutePath(relative(root, full)))
      continue
    }
    dynamicRouteDirs(full, found)
  }
  return found
}

describe("static export route stashing", () => {
  /**
   * A dynamic route missing from DYNAMIC_ROUTES fails `build:static` with
   * "missing generateStaticParams()", which breaks the Pages deploy rather
   * than skipping that route.
   */
  it("stashes every dynamic app route before the static export", () => {
    const covered = DYNAMIC_ROUTES as string[]
    const uncovered = dynamicRouteDirs(join(root, "app")).filter(
      (route) => !covered.some((prefix) => route === prefix || route.startsWith(`${prefix}/`)),
    )
    expect(uncovered).toEqual([])
  })

  it("does not list routes that no longer exist", () => {
    const existing = dynamicRouteDirs(join(root, "app"))
    const stale = (DYNAMIC_ROUTES as string[]).filter(
      (prefix) =>
        prefix !== "app/api" &&
        !existing.some((route) => route === prefix || route.startsWith(`${prefix}/`)),
    )
    expect(stale).toEqual([])
  })
})
