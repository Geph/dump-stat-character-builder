/** Bundled example content packs (separate from SRD seed-data). */
export const EXAMPLE_SEED_PACK_IDS = ["kibbles-tasty", "mage-hand-press"] as const

export type ExampleSeedPackId = (typeof EXAMPLE_SEED_PACK_IDS)[number]

export type ExampleSeedPackMeta = {
  id: ExampleSeedPackId
  label: string
  source: string
  description: string
}

export const EXAMPLE_SEED_PACKS: ExampleSeedPackMeta[] = [
  {
    id: "kibbles-tasty",
    label: "Kibbles Tasty",
    source: "Kibbles Tasty",
    description:
      "Inventor, Occultist, Psion, Warden, species, crafting backgrounds and feats, Kibbles spells, and the psionics catalog.",
  },
  {
    id: "mage-hand-press",
    label: "Mage Hand Press",
    source: "Mage Hand Press",
    description:
      "MHP base classes, free subclass subsets only, masteries, and spells. Paid/extra subclasses are excluded.",
  },
]

export function isExampleSeedPackId(value: string): value is ExampleSeedPackId {
  return (EXAMPLE_SEED_PACK_IDS as readonly string[]).includes(value)
}
