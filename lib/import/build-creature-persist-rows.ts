/**
 * Map import creatures[] rows onto the creatures table shape.
 * Prefer schema v2.0 structured records; legacy prose falls back to parseCreatureStatBlock.
 */
export {
  buildCreaturePersistRows,
  mapCreatureImportV2ToTemplate,
  parseSignedScaledStat,
  type CreaturePersistRow,
} from "@/lib/import/map-creature-import-v2"
