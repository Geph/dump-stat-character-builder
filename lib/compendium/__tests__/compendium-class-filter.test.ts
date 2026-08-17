import { describe, expect, it } from "vitest"
import {
  UNASSIGNED_CLASS_FILTER,
  abilityMatchesClassFilter,
  subclassMatchesClassFilter,
} from "@/lib/compendium/compendium-class-filter"

const CLASS_NAMES = { "cls-warden": "Warden", "cls-witch": "Witch" }

describe("compendium class filter", () => {
  it("matches abilities attached by class id or name", () => {
    expect(
      abilityMatchesClassFilter(
        { attached_to_type: "class", attached_to_id: "cls-warden" },
        "cls-warden",
        CLASS_NAMES,
      ),
    ).toBe(true)
    expect(
      abilityMatchesClassFilter(
        { attached_to_type: "class", attached_to_id: "Warden" },
        "cls-warden",
        CLASS_NAMES,
      ),
    ).toBe(true)
    expect(
      abilityMatchesClassFilter(
        { attached_to_type: "class", attached_to_id: "cls-witch" },
        "cls-warden",
        CLASS_NAMES,
      ),
    ).toBe(false)
  })

  it("matches eligible_classes and subclass attachments", () => {
    expect(
      abilityMatchesClassFilter(
        { eligible_classes: ["Warden", "Witch"] },
        "cls-warden",
        CLASS_NAMES,
      ),
    ).toBe(true)
    expect(
      abilityMatchesClassFilter(
        { attached_to_type: "subclass", attached_to_id: "sub-1" },
        "cls-warden",
        CLASS_NAMES,
        [{ id: "sub-1", name: "Green Reaper", class_id: "cls-warden" }],
      ),
    ).toBe(true)
  })

  it("isolates unassigned abilities and subclasses", () => {
    expect(
      abilityMatchesClassFilter({ attached_to_type: null, attached_to_id: null }, UNASSIGNED_CLASS_FILTER, CLASS_NAMES),
    ).toBe(true)
    expect(
      abilityMatchesClassFilter(
        { attached_to_type: "class", attached_to_id: "Warden" },
        UNASSIGNED_CLASS_FILTER,
        CLASS_NAMES,
      ),
    ).toBe(false)
    expect(subclassMatchesClassFilter({ class_id: "cls-warden" }, "cls-warden")).toBe(true)
    expect(subclassMatchesClassFilter({ class_id: "cls-warden" }, "cls-witch")).toBe(false)
  })
})
