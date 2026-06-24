import { describe, expect, it } from "vitest"
import {
  parsePsionicAugmentCost,
  parsePsionicAugmentsFromDescription,
} from "@/lib/compendium/parse-psionic-augments"

const SAMPLE_AUGMENT_BLOCK = `
<p>You can spend psi points up to your per use limit to add the following modifiers to Seeing (you can add multiple modifiers).</p>
<ul>
<li><strong>Omniscient (1 psi point):</strong> Bless and guidance until your next turn.</li>
<li><strong>Piercing (1+ psi points):</strong> Extra damage per psi point spent.</li>
<li><strong>Withheld (0 psi points):</strong> Use as a reaction instead.</li>
</ul>
`

describe("parse-psionic-augments", () => {
  it("parses augment costs", () => {
    expect(parsePsionicAugmentCost("1 psi point")).toEqual({ fixed: 1 })
    expect(parsePsionicAugmentCost("1+ psi points")).toEqual({ min: 1, scalesPerPoint: true })
    expect(parsePsionicAugmentCost("1-3 psi points")).toEqual({ min: 1, max: 3 })
  })

  it("parses augment list blocks from HTML", () => {
    const parsed = parsePsionicAugmentsFromDescription(SAMPLE_AUGMENT_BLOCK)
    expect(parsed?.allowMultiple).toBe(true)
    expect(parsed?.augments).toHaveLength(3)
    expect(parsed?.augments[1]?.cost.scalesPerPoint).toBe(true)
  })
})
