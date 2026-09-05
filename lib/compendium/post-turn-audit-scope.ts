/** Map dirty files to class-scoped post-turn audits, or a full sweep when the class is unclear. */

export const POST_TURN_AUDIT_TRIGGER_RE =
  /(?:^|\/)lib\/(import|compendium|character)\//

const SHARED_AUDIT_INFRA_RE =
  /(?:^|\/)lib\/(?:import|compendium|character)\/(?:audit-resource-graph|audit-granted-equipment|post-turn-audit-scope|characteristic-modifiers|modifier-catalog|modifier-wiring-registry|detect-feature-modifier|parse-ai-mechanics|enrich-import-modifiers|feature-claims|granted-equipment|sheet-actions|compute-derived|builder-modifier-refs|content-schema)(?:[./]|$)/

const SHARED_PRESET_RE =
  /(?:^|\/)lib\/import\/enrichment-presets\/(?:apply|registry|builders|index|types)\.ts$/

const SHARED_PACK_RE = /(?:^|\/)lib\/import\/enrichment-presets\/packs\/homebrew\.ts$/

const SRD_SEED_RE = /(?:^|\/)lib\/srd\//

const CLASS_SLUG_TO_NAMES: Record<string, string[]> = {
  alchemist: ["Alchemist"],
  captain: ["Captain"],
  craftsman: ["Craftsman"],
  dancer: ["Dancer"],
  gunslinger: ["Gunslinger"],
  investigator: ["Investigator"],
  martyr: ["Martyr"],
  necromancer: ["Necromancer"],
  vagabond: ["Vagabond"],
  warden: ["Warden"],
  "mhp-warden": ["Warden"],
  "kibbles-warden": ["Warden"],
  warmage: ["Warmage"],
  witch: ["Witch"],
  inventor: ["Inventor"],
  occultist: ["Occultist"],
  psion: ["Psion"],
  barbarian: ["Barbarian"],
  bard: ["Bard"],
  cleric: ["Cleric"],
  druid: ["Druid"],
  fighter: ["Fighter"],
  monk: ["Monk"],
  paladin: ["Paladin"],
  ranger: ["Ranger"],
  rogue: ["Rogue"],
  sorcerer: ["Sorcerer"],
  warlock: ["Warlock"],
  wizard: ["Wizard"],
  artificer: ["Artificer"],
  beastheart: ["Beastheart"],
  "alternate-barbarian": ["Alternate Barbarian"],
  "alternate-fighter": ["Alternate Fighter"],
  "alternate-monk": ["Alternate Monk"],
  "alternate-ranger": ["Alternate Ranger"],
  "alternate-rogue": ["Alternate Rogue"],
  "alternate-sorcerer": ["Alternate Sorcerer"],
  altbarbarian: ["Alternate Barbarian"],
  altfighter: ["Alternate Fighter"],
  altmonk: ["Alternate Monk"],
  altranger: ["Alternate Ranger"],
  altrogue: ["Alternate Rogue"],
  altsorcerer: ["Alternate Sorcerer"],
}

const LASERLLAMA_SLUG: Record<string, string> = {
  altbarbarian: "alternate-barbarian",
  altfighter: "alternate-fighter",
  altmonk: "alternate-monk",
  altranger: "alternate-ranger",
  altrogue: "alternate-rogue",
  altsorcerer: "alternate-sorcerer",
}

export type PostTurnAuditScope = {
  full: boolean
  classes: string[]
}

function normalizeRel(file: string): string {
  return file.replace(/\\/g, "/").trim()
}

export function isPostTurnAuditTriggerPath(file: string): boolean {
  return POST_TURN_AUDIT_TRIGGER_RE.test(normalizeRel(file))
}

export function isSharedAuditInfraPath(file: string): boolean {
  const rel = normalizeRel(file)
  return (
    SHARED_AUDIT_INFRA_RE.test(rel) ||
    SHARED_PRESET_RE.test(rel) ||
    SHARED_PACK_RE.test(rel) ||
    SRD_SEED_RE.test(rel)
  )
}

function namesForSlug(slug: string): string[] {
  return CLASS_SLUG_TO_NAMES[slug] ?? []
}

/** Best-effort class names from a repo-relative path. Empty when the file is not class-specific. */
export function classNamesFromAuditPath(file: string): string[] {
  const rel = normalizeRel(file)
  const pack = /enrichment-presets\/packs\/([a-z0-9-]+)\.ts$/i.exec(rel)
  if (pack?.[1] && pack[1].toLowerCase() !== "homebrew") {
    return namesForSlug(pack[1].toLowerCase())
  }

  const seed = /(?:magehandpress|kibbles)-([a-z0-9-]+)-class/i.exec(rel)
  if (seed?.[1]) return namesForSlug(seed[1].toLowerCase())

  const laser = /laserllama-(alt[a-z]+)/i.exec(rel)
  if (laser?.[1]) {
    const mapped = LASERLLAMA_SLUG[laser[1].toLowerCase()]
    return mapped ? namesForSlug(mapped) : []
  }

  const test = /(?:^|\/)(?:mhp-)?([a-z0-9-]+)-(?:import|feature-wiring|sheet-wiring|enrichment|class)/i.exec(
    rel,
  )
  if (test?.[1]) return namesForSlug(test[1].toLowerCase())

  return []
}

/**
 * Scope audits to classes named by dirty files when every trigger file is class-specific.
 * Shared import/runtime/audit infra (or an unmapped trigger file) forces a full sweep.
 */
export function resolvePostTurnAuditScope(files: readonly string[]): PostTurnAuditScope {
  const triggers = files.map(normalizeRel).filter(isPostTurnAuditTriggerPath)
  if (!triggers.length) return { full: true, classes: [] }

  const classes = new Set<string>()
  for (const file of triggers) {
    if (isSharedAuditInfraPath(file)) return { full: true, classes: [] }
    const names = classNamesFromAuditPath(file)
    if (!names.length) return { full: true, classes: [] }
    for (const name of names) classes.add(name)
  }
  return { full: false, classes: [...classes].sort((a, b) => a.localeCompare(b)) }
}

export function classNameInScope(
  className: string,
  scope: Pick<PostTurnAuditScope, "full" | "classes">,
): boolean {
  if (scope.full || !scope.classes.length) return true
  const n = className.trim().toLowerCase()
  return scope.classes.some((name) => name.trim().toLowerCase() === n)
}
