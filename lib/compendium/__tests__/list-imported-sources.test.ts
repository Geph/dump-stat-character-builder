import { describe, expect, it } from "vitest"
import { collectNonSrdSourceLabels } from "@/lib/compendium/list-imported-sources"
import { SRD_SOURCE } from "@/lib/srd/source"

describe("collectNonSrdSourceLabels", () => {
  it("returns unique non-SRD sources sorted", () => {
    expect(
      collectNonSrdSourceLabels([
        { source: "MCDM" },
        { source: "SRD" },
        { source: SRD_SOURCE },
        { source: "  mcdm " },
        { source: "Laserllama" },
        { source: "System" },
        { source: "system" },
        { source: "" },
        { source: null },
        null,
      ]),
    ).toEqual(["Laserllama", "MCDM"])
  })
})
