import {
  assertModifierWiringRegistryComplete,
  formatModifierWiringRegistryCoverage,
  getModifierWiringRegistryCoverage,
  NARRATIVE_ONLY_GUIDANCE,
} from "../lib/import/modifier-wiring-registry"

const PROMOTION_CANDIDATES = [
  {
    guidance: NARRATIVE_ONLY_GUIDANCE[4],
    note:
      "Promote standard phrasing to detectors: while raging, below half HP, if you have Advantage on the attack.",
  },
]

function main() {
  assertModifierWiringRegistryComplete()
  const coverage = getModifierWiringRegistryCoverage()
  console.log(formatModifierWiringRegistryCoverage(coverage))
  console.log(
    `Mechanics kinds: ${coverage.mechanicsKinds} · SRD preset names: ${coverage.srdPresetNames} · Homebrew patterns: ${coverage.homebrewPatterns}`,
  )

  if (!coverage.isComplete) {
    console.error("Modifier wiring registry is incomplete.")
    process.exit(1)
  }

  console.log("\nNarrative-only promotion review:")
  for (const entry of PROMOTION_CANDIDATES) {
    console.log(`- ${entry.guidance}`)
    console.log(`  → ${entry.note}`)
  }
}

main()
