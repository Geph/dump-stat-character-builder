import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { resolveSubclassUnlockLevel } from "@/lib/builder/subclass-unlock"
import { featureHasSubclassUnlockModifier } from "@/lib/compendium/subclass-unlock-modifier"
import type { DndClass } from "@/lib/types"

function classesInPackFolder(folder: string): DndClass[] {
  const root = join(process.cwd(), "lib", "seed-packs", folder)
  return readdirSync(root)
    .filter((file) => file.endsWith(".json"))
    .flatMap((file) => {
      const content = JSON.parse(readFileSync(join(root, file), "utf8")) as {
        classes?: DndClass[]
      }
      return content.classes ?? []
    })
}

describe("bundled subclass unlock levels", () => {
  it("unlocks every Kibbles class archetype at level 1", () => {
    const classes = classesInPackFolder("kibbles-tasty")
    expect(classes.length).toBeGreaterThan(0)
    for (const cls of classes) {
      expect(resolveSubclassUnlockLevel(cls), cls.name).toBe(1)
      expect(cls.features.some(featureHasSubclassUnlockModifier), cls.name).toBe(true)
    }
  })

  it("unlocks every Mage Hand Press subclass at level 3", () => {
    const classes = classesInPackFolder("mage-hand-press")
    expect(classes.length).toBeGreaterThan(0)
    for (const cls of classes) {
      expect(resolveSubclassUnlockLevel(cls), cls.name).toBe(3)
      expect(cls.features.some(featureHasSubclassUnlockModifier), cls.name).toBe(true)
    }
  })
})
