/**
 * Static audit of CharacteristicModifier types vs application, authoring, import, and tests.
 * Reads source files with regex — does not import runtime modifier modules.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

export type ModifierCatalogAuditRow = {
  type: string
  applied: boolean
  derivedConsumes: boolean
  authorable: boolean
  inCatalog: boolean
  hasEditor: boolean
  importable: boolean
  inAiKinds: boolean
  inDetectorRules: boolean
  tested: boolean
}

export type ModifierCatalogAuditSummary = {
  dead: string[]
  unreachable: string[]
  untested: string[]
  duplicates: string[][]
}

export type ModifierCatalogAuditResult = {
  rows: ModifierCatalogAuditRow[]
  summary: ModifierCatalogAuditSummary
}

function repoRoot(): string {
  return process.cwd()
}

function readRepoFile(...parts: string[]): string {
  return readFileSync(join(repoRoot(), ...parts), "utf8")
}

/** Extract `value: "…"` entries from CHARACTERISTIC_MODIFIER_TYPE_OPTIONS. */
export function extractDefinedModifierTypes(source: string): string[] {
  const start = source.indexOf("export const CHARACTERISTIC_MODIFIER_TYPE_OPTIONS")
  if (start < 0) throw new Error("CHARACTERISTIC_MODIFIER_TYPE_OPTIONS not found")
  const asConst = source.indexOf("] as const", start)
  if (asConst < 0) throw new Error("CHARACTERISTIC_MODIFIER_TYPE_OPTIONS closing not found")
  const block = source.slice(start, asConst)
  const values = [...block.matchAll(/value:\s*"([a-z0-9_]+)"/g)].map((m) => m[1])
  return [...new Set(values)]
}

/**
 * Extract `case "…":` labels from the `aggregateCharacteristics` switch (mod.type).
 * Includes fallthrough cases that share a body.
 */
export function extractAggregateHandledTypes(source: string): {
  handled: Set<string>
  caseBodies: Map<string, string>
  fallthroughGroups: string[][]
} {
  const fnStart = source.indexOf("export function aggregateCharacteristics(")
  if (fnStart < 0) throw new Error("aggregateCharacteristics not found")
  const switchStart = source.indexOf("switch (mod.type)", fnStart)
  if (switchStart < 0) throw new Error("aggregateCharacteristics switch not found")

  // Brace-match the switch block
  const openBrace = source.indexOf("{", switchStart)
  let depth = 0
  let end = openBrace
  for (let i = openBrace; i < source.length; i++) {
    const ch = source[i]
    if (ch === "{") depth++
    else if (ch === "}") {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  const switchBody = source.slice(openBrace + 1, end)

  const handled = new Set<string>()
  const caseBodies = new Map<string, string>()
  const fallthroughGroups: string[][] = []

  // Split into case / default segments
  const caseHeader = /(?:^|\n)[ \t]*case\s+"([a-z0-9_]+)"\s*:/g
  const matches = [...switchBody.matchAll(caseHeader)]
  for (let i = 0; i < matches.length; i++) {
    const type = matches[i][1]
    handled.add(type)
    const bodyStart = (matches[i].index ?? 0) + matches[i][0].length
    const bodyEnd = i + 1 < matches.length ? (matches[i + 1].index ?? switchBody.length) : switchBody.length
    let body = switchBody.slice(bodyStart, bodyEnd)
    // Trim trailing next-case headers already excluded; strip leading fallthrough-only cases
    body = body.replace(/^\s*(?:case\s+"[a-z0-9_]+"\s*:[\s]*)+/, "").trim()
    // If this match is a fallthrough header (next content starts with case), body may be empty —
    // assign later via group merge.
    caseBodies.set(type, body)
  }

  // Build fallthrough groups: consecutive case labels with empty bodies until a non-empty body
  let pending: string[] = []
  for (let i = 0; i < matches.length; i++) {
    const type = matches[i][1]
    const body = caseBodies.get(type) ?? ""
    const isFallthroughOnly = !body || /^case\s+"/.test(body) || body.startsWith("case ")
    // Re-parse: body for fallthrough-only cases is often the following cases' text incorrectly.
    // Detect true fallthrough: between this case header and the next, only whitespace / comments.
    const headerEnd = (matches[i].index ?? 0) + matches[i][0].length
    const nextStart =
      i + 1 < matches.length ? (matches[i + 1].index ?? switchBody.length) : switchBody.length
    const between = switchBody.slice(headerEnd, nextStart).trim()
    const emptyBetween = between.length === 0 || /^\/\/.*$/.test(between)

    if (emptyBetween && i + 1 < matches.length) {
      pending.push(type)
      continue
    }

    const group = [...pending, type]
    pending = []
    if (group.length > 1) fallthroughGroups.push(group)

    // Shared body for the whole fallthrough group
    const sharedBody = between
    for (const member of group) {
      caseBodies.set(member, sharedBody)
    }
  }

  return { handled, caseBodies, fallthroughGroups }
}

/** Property names on AggregatedCharacteristics / aggregated.* referenced in compute-derived. */
export function extractDerivedAggregatedFields(source: string): Set<string> {
  const fields = new Set<string>()
  for (const match of source.matchAll(
    /(?:aggregatedCharacteristics|aggregated)\.([A-Za-z_][A-Za-z0-9_]*)/g,
  )) {
    fields.add(match[1])
  }
  // Helpers that consume AC / HP / initiative aggregates
  if (source.includes("applyAcCharacteristics") || source.includes("resolveAggregatedAcFormula")) {
    for (const f of [
      "acFlatBonus",
      "acFlatBonusWhileArmored",
      "acFixed",
      "acAbilityMods",
      "acBase",
      "acIncludeProficiency",
      "acFormulaOptions",
    ]) {
      fields.add(f)
    }
  }
  if (source.includes("applyHpCharacteristics")) {
    fields.add("hpFlatBonus")
    fields.add("hpPerLevel")
  }
  if (source.includes("computeInitiative")) {
    for (const f of [
      "initiativeFlatBonus",
      "initiativeIncludeProficiency",
      "initiativeAbility",
      "initiativeAbilityBonus",
    ]) {
      fields.add(f)
    }
  }
  // Whole-object helpers used from compute-derived for attack/damage aggregation
  if (source.includes("sumAttackRollModifiers")) {
    fields.add("attackRollModifiers")
    fields.add("criticalHitMinimum")
    fields.add("criticalHitMinimumByLevel")
  }
  if (source.includes("sumDamageRollModifiers")) {
    fields.add("damageRollModifiers")
  }
  if (source.includes("buildSaveBonuses")) {
    fields.add("savingThrowAlternateAbilities")
    fields.add("auras")
  }
  return fields
}

/** result.<field> writes inside a case body. */
function extractResultFieldsWritten(caseBody: string): Set<string> {
  const fields = new Set<string>()
  for (const match of caseBody.matchAll(/result\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
    fields.add(match[1])
  }
  return fields
}

function extractExcludedCatalogTypes(source: string): Set<string> {
  const match = source.match(
    /EXCLUDED_PASSIVE_CATALOG_TYPES\s*=\s*new\s+Set\(\[([^\]]*)\]\)/,
  )
  if (!match) return new Set()
  return new Set([...match[1].matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1]))
}

function extractQuotedCases(source: string): Set<string> {
  return new Set([...source.matchAll(/case\s+"([a-z0-9_]+)"\s*:/g)].map((m) => m[1]))
}

function extractAiMechanicKinds(source: string): Set<string> {
  const start = source.indexOf("export const AI_MECHANIC_KINDS")
  if (start < 0) return new Set()
  const asConst = source.indexOf("] as const", start)
  if (asConst < 0) return new Set()
  const block = source.slice(start, asConst)
  return new Set([...block.matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1]))
}

/** Types emitted as `type: "…"` in detector rule factories. */
function extractDetectorEmittedTypes(source: string): Set<string> {
  // Prefer matches inside FEATURE_*_RULES arrays, but type: "x" on CharacteristicModifier
  // creations is distinctive enough across this file.
  return new Set(
    [...source.matchAll(/\btype:\s*"([a-z0-9_]+)"\s*(?:as\s+const\s*)?,/g)].map((m) => m[1]),
  )
}

function listTestFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "dist" || name === ".git") continue
      listTestFiles(full, out)
      continue
    }
    if (!/__tests__/.test(full)) continue
    if (!/\.(ts|tsx|js|mjs)$/.test(name)) continue
    out.push(full)
  }
  return out
}

function collectTestedTypes(types: string[]): Set<string> {
  const tested = new Set<string>()
  const testFiles = listTestFiles(join(repoRoot(), "lib")).filter(
    (path) => !path.endsWith(`${join("audit-modifier-catalog.test.ts")}`),
  )
  const contents = testFiles.map((path) => ({
    path: relative(repoRoot(), path),
    text: readFileSync(path, "utf8"),
  }))

  for (const type of types) {
    const patterns = [
      new RegExp(`type:\\s*"${type}"`),
      new RegExp(`type:\\s*'${type}'`),
      new RegExp(`\\.type\\s*===\\s*"${type}"`),
      new RegExp(`\\.type\\s*===\\s*'${type}'`),
      new RegExp(`createCharacteristicModifier\\(\\s*"${type}"\\s*\\)`),
      new RegExp(`cat_char_${type}\\b`),
    ]
    for (const file of contents) {
      if (patterns.some((re) => re.test(file.text))) {
        tested.add(type)
        break
      }
    }
  }
  return tested
}

function stripCommentsAndWhitespace(body: string): string {
  return body
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/** True when the case only forwards the whole modifier into an aggregated array. */
function isPassthroughPushBody(body: string): boolean {
  const normalized = stripCommentsAndWhitespace(body)
    .replace(/;?\s*break;?$/, "")
    .trim()
  return /^result\.[A-Za-z_][A-Za-z0-9_]*\.push\(mod\)$/.test(normalized)
}

/**
 * Near-identical pushUnique(result.X, values-like) bodies that differ only by target field
 * and value expression shape.
 */
function isPushUniqueValuesBody(body: string): boolean {
  const normalized = stripCommentsAndWhitespace(body)
    .replace(/;?\s*break;?$/, "")
    .trim()
  return (
    /^pushUnique\(\s*result\.[A-Za-z_][A-Za-z0-9_]*\s*,/.test(normalized) &&
    !normalized.includes("if (") &&
    normalized.length < 120
  )
}

function findDuplicateGroups(
  caseBodies: Map<string, string>,
  fallthroughGroups: string[][],
): string[][] {
  const groups: string[][] = []
  const claimed = new Set<string>()

  for (const group of fallthroughGroups) {
    groups.push([...group].sort())
    for (const type of group) claimed.add(type)
  }

  // Exact body match (field names kept) — true copy-paste candidates
  const byExact = new Map<string, string[]>()
  for (const [type, body] of caseBodies) {
    if (claimed.has(type)) continue
    const normalized = stripCommentsAndWhitespace(body)
    if (!normalized || normalized === "break" || normalized === "break;") continue
    const list = byExact.get(normalized) ?? []
    list.push(type)
    byExact.set(normalized, list)
  }
  for (const list of byExact.values()) {
    if (list.length > 1) {
      groups.push(list.sort())
      for (const type of list) claimed.add(type)
    }
  }

  // Structural families (candidates only)
  const passthrough: string[] = []
  const pushUniqueFamily: string[] = []
  for (const [type, body] of caseBodies) {
    if (claimed.has(type)) continue
    if (isPassthroughPushBody(body)) passthrough.push(type)
    else if (isPushUniqueValuesBody(body)) pushUniqueFamily.push(type)
  }
  if (passthrough.length > 1) groups.push(passthrough.sort())
  if (pushUniqueFamily.length > 1) groups.push(pushUniqueFamily.sort())

  const unique = new Map<string, string[]>()
  for (const group of groups) {
    unique.set(group.join("|"), group)
  }
  return [...unique.values()].sort((a, b) => a[0].localeCompare(b[0]))
}

export function auditModifierCatalog(): ModifierCatalogAuditResult {
  const characteristicSource = readRepoFile("lib/compendium/characteristic-modifiers.ts")
  const derivedSource = readRepoFile("lib/character/compute-derived.ts")
  const catalogMetaSource = readRepoFile("lib/compendium/class-feature-metadata.ts")
  const editorSource = readRepoFile("components/characteristic-modifiers-editor.tsx")
  const effectListSource = existsSync(
    join(repoRoot(), "components/compendium/feature-effect-list.tsx"),
  )
    ? readRepoFile("components/compendium/feature-effect-list.tsx")
    : ""
  const wiringSource = readRepoFile("lib/import/modifier-wiring-registry.ts")
  const detectorSource = readRepoFile("lib/import/detect-feature-modifier-rules.ts")

  const types = extractDefinedModifierTypes(characteristicSource)
  const { handled, caseBodies, fallthroughGroups } =
    extractAggregateHandledTypes(characteristicSource)
  const derivedFields = extractDerivedAggregatedFields(derivedSource)
  const excludedCatalog = extractExcludedCatalogTypes(catalogMetaSource)
  const editorCases = extractQuotedCases(editorSource)
  const effectListCases = extractQuotedCases(effectListSource)
  const aiKinds = extractAiMechanicKinds(wiringSource)
  const detectorTypes = extractDetectorEmittedTypes(detectorSource)
  const testedTypes = collectTestedTypes(types)

  const rows: ModifierCatalogAuditRow[] = types.map((type) => {
    const applied = handled.has(type)
    const written = extractResultFieldsWritten(caseBodies.get(type) ?? "")
    const derivedConsumes =
      applied &&
      (written.size === 0
        ? false
        : [...written].some((field) => derivedFields.has(field)))
    const inCatalog = !excludedCatalog.has(type)
    const hasEditor = editorCases.has(type) || effectListCases.has(type)
    const inAiKinds = aiKinds.has(type)
    const inDetectorRules = detectorTypes.has(type)
    const importable = inAiKinds || inDetectorRules
    const authorable = inCatalog && hasEditor
    const tested = testedTypes.has(type)

    return {
      type,
      applied,
      derivedConsumes,
      authorable,
      inCatalog,
      hasEditor,
      importable,
      inAiKinds,
      inDetectorRules,
      tested,
    }
  })

  const dead = rows.filter((row) => !row.applied).map((row) => row.type).sort()
  const unreachable = rows
    .filter((row) => row.applied && !row.authorable && !row.importable)
    .map((row) => row.type)
    .sort()
  const untested = rows.filter((row) => !row.tested).map((row) => row.type).sort()
  const duplicates = findDuplicateGroups(caseBodies, fallthroughGroups)

  return {
    rows,
    summary: { dead, unreachable, untested, duplicates },
  }
}

function yn(value: boolean): string {
  return value ? "yes" : "no"
}

export function formatModifierCatalogAudit(result: ModifierCatalogAuditResult): string {
  const headers = [
    "TYPE",
    "APPLIED",
    "DERIVED",
    "AUTHORABLE",
    "IMPORTABLE",
    "TESTED",
  ] as const
  const tableRows = result.rows.map((row) => [
    row.type,
    yn(row.applied),
    yn(row.derivedConsumes),
    yn(row.authorable),
    yn(row.importable),
    yn(row.tested),
  ])

  const widths = headers.map((header, i) =>
    Math.max(header.length, ...tableRows.map((row) => row[i].length)),
  )
  const pad = (cells: string[]) =>
    cells.map((cell, i) => cell.padEnd(widths[i])).join("  ")

  const lines: string[] = [
    pad([...headers]),
    pad(widths.map((w) => "-".repeat(w))),
    ...tableRows.map((row) => pad(row)),
    "",
    `Types: ${result.rows.length}`,
    "",
    "DEAD (defined but never applied):",
    ...(result.summary.dead.length
      ? result.summary.dead.map((type) => `  - ${type}`)
      : ["  (none)"]),
    "",
    "UNREACHABLE (applied but not authorable and not importable):",
    ...(result.summary.unreachable.length
      ? result.summary.unreachable.map((type) => `  - ${type}`)
      : ["  (none)"]),
    "",
    "UNTESTED (no lib/**/__tests__ reference):",
    ...(result.summary.untested.length
      ? result.summary.untested.map((type) => `  - ${type}`)
      : ["  (none)"]),
    "",
    "DUPLICATES (near-identical application logic — candidates only):",
    ...(result.summary.duplicates.length
      ? result.summary.duplicates.map((group) => `  - ${group.join(", ")}`)
      : ["  (none)"]),
  ]

  return lines.join("\n")
}
