import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { ACTION_EFFECT_OPTIONS } from "@/lib/compendium/class-feature-metadata"
import { CHARACTERISTIC_MODIFIER_TYPE_OPTIONS } from "@/lib/compendium/characteristic-modifiers"

const ROOT = process.cwd()
const GENERATED = join(ROOT, "lib/import/modifier-vocabulary.generated.md")
const SCRIPT = join(ROOT, "scripts/build-modifier-vocabulary.mjs")

describe("modifier vocabulary", () => {
  it("regenerates from catalog option lists and matches the committed copy", () => {
    const generated = execFileSync(process.execPath, [SCRIPT, "--print"], {
      encoding: "utf8",
      cwd: ROOT,
    })
    const committed = readFileSync(GENERATED, "utf8")
    expect(generated).toBe(committed)
    expect(generated.split("\n").length).toBeLessThanOrEqual(400)
    expect(generated).toContain("UNDOCUMENTED")
    expect(generated).toMatch(/^# Modifier vocabulary \(generated\)/m)
    for (const heading of [
      "## resource spend",
      "## roll modifier",
      "## grant",
      "## trigger",
      "## companion",
      "## equipment",
    ]) {
      expect(generated).toContain(heading)
    }
    for (const option of CHARACTERISTIC_MODIFIER_TYPE_OPTIONS) {
      expect(generated).toContain(`\`${option.value}\` (char)`)
    }
    for (const option of ACTION_EFFECT_OPTIONS) {
      expect(generated).toContain(`\`${option.value}\` (fx)`)
    }
  })
})
