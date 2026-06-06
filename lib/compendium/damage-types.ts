export const DAMAGE_TYPES = [
  "Bludgeoning",
  "Piercing",
  "Slashing",
  "Fire",
  "Cold",
  "Lightning",
  "Thunder",
  "Acid",
  "Poison",
  "Necrotic",
  "Radiant",
  "Force",
  "Psychic",
] as const

export type DamageType = (typeof DAMAGE_TYPES)[number]
