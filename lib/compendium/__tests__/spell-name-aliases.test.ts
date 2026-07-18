import { describe, expect, it } from "vitest"
import {
  canonicalSpellLookupKey,
  canonicalSpellName,
  spellAliasLookupKeys,
  spellNamesAliasEqual,
} from "@/lib/compendium/spell-name-aliases"

describe("spell-name-aliases", () => {
  it("maps legacy print names to SRD canonical names", () => {
    expect(canonicalSpellName("Detect Good and Evil")).toBe("Detect Evil and Good")
    expect(canonicalSpellName("Pass without a Trace")).toBe("Pass without Trace")
    expect(canonicalSpellName("Feeblemind")).toBe("Befuddlement")
    expect(canonicalSpellName("Detect Evil and Good")).toBe("Detect Evil and Good")
    expect(canonicalSpellName("Fireball")).toBe("Fireball")
    expect(canonicalSpellName("Animate Objects")).toBe("Dancing Objects (Animate Object)")
    expect(canonicalSpellName("Animate Object")).toBe("Dancing Objects (Animate Object)")
    expect(canonicalSpellName("Dancing Objects")).toBe("Dancing Objects (Animate Object)")
  })

  it("treats each alias pair as the same lookup key", () => {
    expect(canonicalSpellLookupKey("Detect Good and Evil")).toBe(
      canonicalSpellLookupKey("Detect Evil and Good"),
    )
    expect(canonicalSpellLookupKey("Pass without a Trace")).toBe(
      canonicalSpellLookupKey("Pass without Trace"),
    )
    expect(canonicalSpellLookupKey("Feeblemind")).toBe(
      canonicalSpellLookupKey("Befuddlement"),
    )
    expect(canonicalSpellLookupKey("Animate Objects")).toBe(
      canonicalSpellLookupKey("Dancing Objects (Animate Object)"),
    )
    expect(spellNamesAliasEqual("Feeblemind", "Befuddlement")).toBe(true)
    expect(spellNamesAliasEqual("Animate Objects", "Dancing Objects (Animate Object)")).toBe(
      true,
    )
    expect(spellNamesAliasEqual("Fireball", "Feeblemind")).toBe(false)
  })

  it("lists both sides of each alias group", () => {
    expect(spellAliasLookupKeys("Feeblemind").sort()).toEqual([
      "befuddlement",
      "feeblemind",
    ])
    expect(spellAliasLookupKeys("Animate Objects").sort()).toEqual([
      "animate object",
      "animate objects",
      "dancing object (animate object)",
      "dancing objects",
      "dancing objects (animate object)",
    ])
  })
})
