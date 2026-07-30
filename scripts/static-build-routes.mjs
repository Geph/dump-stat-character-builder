/**
 * Routes with dynamic segments, which `output: export` cannot render without
 * generateStaticParams. Stashed before the static build and restored after, so
 * both scripts must read the same list — a new dynamic route missing from here
 * fails the static export (and the Pages deploy) rather than being skipped.
 */
export const DYNAMIC_ROUTES = [
  "app/compendium/classes/[id]",
  "app/compendium/subclasses/[id]",
  "app/compendium/species/[id]",
  "app/compendium/backgrounds/[id]",
  "app/compendium/spells/[id]",
  "app/compendium/feats/[id]",
  "app/compendium/equipment/[id]",
  "app/compendium/abilities/[id]",
  "app/characters/[id]",
  "app/share/[token]",
  "app/api",
]
