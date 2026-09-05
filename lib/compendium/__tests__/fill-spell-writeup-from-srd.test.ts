import { describe, expect, it } from "vitest"
import {
  fillEmptySpellWriteup,
  lookupSrdSpellWriteup,
} from "@/lib/compendium/fill-spell-writeup-from-srd"

describe("fillEmptySpellWriteup", () => {
  it("restores SRD prose and casting details on a class-list stub", () => {
    const srd = lookupSrdSpellWriteup("Acid Splash")
    expect(srd?.description).toEqual(expect.any(String))
    expect(String(srd?.description).length).toBeGreaterThan(20)

    const filled = fillEmptySpellWriteup({
      id: "mhp-acid",
      name: "Acid Splash",
      level: 0,
      school: "Evocation",
      casting_time: null,
      range: null,
      duration: null,
      components: null,
      description: null,
      source: "Mage Hand Press",
      classes: ["Necromancer"],
      concentration: false,
    })

    expect(filled.id).toBe("mhp-acid")
    expect(filled.source).toBe("Mage Hand Press")
    expect(filled.classes).toEqual(["Necromancer"])
    expect(filled.description).toBe(srd?.description)
    expect(filled.casting_time).toBe(srd?.casting_time)
    expect(filled.range).toBe(srd?.range)
    expect(filled.duration).toBe(srd?.duration)
  })

  it("does not replace an existing write-up", () => {
    const filled = fillEmptySpellWriteup({
      name: "Acid Splash",
      description: "Homebrew acid bubble.",
      casting_time: "Bonus Action",
      range: "30 feet",
    })
    expect(filled.description).toBe("Homebrew acid bubble.")
    expect(filled.casting_time).toBe("Bonus Action")
    expect(filled.range).toBe("30 feet")
  })

  it("restores Chill Touch from the 5.2 SRD and leaves homebrew-only stubs alone", () => {
    const chill = fillEmptySpellWriteup({
      name: "Chill Touch",
      description: null,
      casting_time: null,
      school: "Necromancy",
      source: "Mage Hand Press",
    })
    expect(chill.casting_time).toBe("Action")
    expect(String(chill.description)).toMatch(/chill of the grave/i)

    const stub = {
      name: "Spark of Life",
      description: null,
      casting_time: null,
      school: "Necromancy",
      source: "Mage Hand Press",
    }
    expect(fillEmptySpellWriteup(stub)).toEqual(stub)
    expect(lookupSrdSpellWriteup("Spark of Life")).toBeNull()
  })
})
