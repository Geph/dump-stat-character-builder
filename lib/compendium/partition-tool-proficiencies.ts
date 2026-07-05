import { getMusicalInstrumentNames } from "@/lib/compendium/tool-options"

const musicalInstrumentNames = new Set(
  getMusicalInstrumentNames().map((name) => name.toLowerCase()),
)

export function isMusicalInstrumentProficiency(name: string): boolean {
  const lower = name.toLowerCase()
  return lower === "musical instrument" || musicalInstrumentNames.has(lower)
}

export function partitionToolProficiencies(names: string[]): {
  instruments: string[]
  tools: string[]
} {
  const instruments: string[] = []
  const tools: string[] = []
  for (const name of names) {
    if (isMusicalInstrumentProficiency(name)) {
      instruments.push(name)
    } else {
      tools.push(name)
    }
  }
  return { instruments, tools }
}
