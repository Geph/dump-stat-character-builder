/**
 * Compare class source text feature headers to import JSON feature names.
 */

export type CompletenessFinding = {
  where: "class" | "subclass"
  subclassName?: string
  level: number | null
  name: string
  status: "missing_in_json" | "extra_in_json" | "ok"
}

const LEVEL_FEATURE_RE =
  /^\s*(?:LEVEL\s+)?(\d+)\s*:\s*([A-Z][^\n]{1,80}?)\s*$/gim

/** Also catch "Level 3: Feature Name" prose lines. */
const LEVEL_FEATURE_PROSE_RE =
  /(?:^|\n)\s*Level\s+(\d+)\s*:\s*([^\n]+?)(?:\n|$)/gi

export function extractSourceFeatureHeaders(sourceText: string): { level: number; name: string }[] {
  const found: { level: number; name: string }[] = []
  const seen = new Set<string>()

  const push = (level: number, rawName: string) => {
    const name = rawName
      .replace(/\s+/g, " ")
      .replace(/\s*\[.*?\]\s*$/, "")
      .trim()
    if (!name || /^(features?|subclass|ability score)/i.test(name)) return
    // Skip table-ish leftovers
    if (/^\d+$/.test(name)) return
    const key = `${level}::${name.toLowerCase()}`
    if (seen.has(key)) return
    seen.add(key)
    found.push({ level, name })
  }

  for (const re of [LEVEL_FEATURE_RE, LEVEL_FEATURE_PROSE_RE]) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(sourceText))) {
      push(Number(m[1]), m[2])
    }
  }

  return found
}

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null
}

function normalizeName(name: string): string {
  return name
    .replace(/\s*\[[^\]]*\]\s*/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function compareSourceToImport(
  sourceText: string,
  content: unknown,
): CompletenessFinding[] {
  const root = asRecord(content)
  if (!root) return []

  const findings: CompletenessFinding[] = []
  const sourceHeaders = extractSourceFeatureHeaders(sourceText)

  const classes = Array.isArray(root.classes) ? root.classes : []
  const cls = asRecord(classes[0])
  const classFeats = Array.isArray(cls?.features)
    ? (cls!.features as unknown[]).map(asRecord).filter(Boolean) as JsonRecord[]
    : []

  const classJsonNames = new Set(
    classFeats.map((f) => normalizeName(String(f.name ?? ""))).filter(Boolean),
  )

  // Source headers before first clear subclass block are treated as class-level.
  // Heuristic: many MHP sources interleave subclasses; compare loosely by name only.
  const sourceNames = new Map<string, { level: number; name: string }>()
  for (const h of sourceHeaders) {
    sourceNames.set(normalizeName(h.name), h)
  }

  for (const [key, h] of sourceNames) {
    if (!classJsonNames.has(key)) {
      // May live on a subclass — check subclasses too
      const onSubclass = (Array.isArray(root.subclasses) ? root.subclasses : []).some((sub) => {
        const s = asRecord(sub)
        const feats = Array.isArray(s?.features) ? s!.features : []
        return feats.some((f) => normalizeName(String(asRecord(f)?.name ?? "")) === key)
      })
      if (!onSubclass) {
        findings.push({
          where: "class",
          level: h.level,
          name: h.name,
          status: "missing_in_json",
        })
      }
    }
  }

  // Flag ASI / Epic Boon / Subclass shell noise less aggressively — only missing real headers.

  return findings
}

export function formatCompletenessReport(
  findings: CompletenessFinding[],
  opts?: { limit?: number },
): string {
  const missing = findings.filter((f) => f.status === "missing_in_json")
  const limit = opts?.limit ?? 40
  if (!missing.length) return "Completeness: no missing LEVEL N feature headers detected."
  const lines = missing.slice(0, limit).map((f) => {
    const loc = f.subclassName ? `subclass ${f.subclassName}` : "class/subclass"
    return `- missing in JSON (${loc}): L${f.level ?? "?"} ${f.name}`
  })
  if (missing.length > limit) lines.push(`… and ${missing.length - limit} more`)
  return `Completeness: ${missing.length} source feature header(s) not found in JSON:\n${lines.join("\n")}`
}
