/**
 * Report BYO extraction prompt size per content type and the Common Modifier index breakdown.
 * Budget and design rules: docs/byo-prompt-design.md
 *
 *   pnpm prompts:measure
 */
import { BYO_LITE_PROMPT_MAX_CHARS, buildByoExtractionPrompt } from "@/lib/import/byo-import-kit"
import { PASTED_SOURCE_TEXT_MAX_CHARS } from "@/lib/import/import-source-limits"
import {
  DESCRIPTION_PHRASE_WIRING,
  FEATURE_NAME_WIRING,
  HOMEBREW_WIRING_PATTERNS,
  buildCommonModifiersImportHint,
  type ModifierWiringEntry,
} from "@/lib/import/modifier-wiring-registry"

const CONTENT_TYPES = [
  "classes",
  "subclasses",
  "species",
  "backgrounds",
  "spells",
  "feats",
  "creatures",
  "equipment",
  "abilities",
  "invocations_metamagic",
  "languages",
  "all",
]

const approxTokens = (chars: number) => Math.round(chars / 4)

const formatEntries = (entries: ModifierWiringEntry[]) =>
  entries
    .map(
      (entry) =>
        `- ${entry.ruleId}: ${entry.examples.map((text) => `"${text}"`).join(" | ")}${
          entry.notes ? `\n  → ${entry.notes}` : ""
        }`,
    )
    .join("\n").length

console.log(`Pasted source cap: ${PASTED_SOURCE_TEXT_MAX_CHARS.toLocaleString()} chars\n`)
console.log(`Instructions only (before source text). Lite budget: ${BYO_LITE_PROMPT_MAX_CHARS.toLocaleString()} chars`)
console.log(`  ${"content type".padEnd(24)} ${"full".padStart(9)}  ${"lite".padStart(9)}  lite ~tokens`)
for (const hint of CONTENT_TYPES) {
  const full = buildByoExtractionPrompt(hint).length
  const lite = buildByoExtractionPrompt(hint, { promptMode: "lite" }).length
  const flag = lite > BYO_LITE_PROMPT_MAX_CHARS ? "  OVER BUDGET" : ""
  console.log(
    `  ${hint.padEnd(24)} ${full.toLocaleString().padStart(9)}  ${lite.toLocaleString().padStart(9)}  ~${approxTokens(lite).toLocaleString()}${flag}`,
  )
}

const indexTotal = buildCommonModifiersImportHint().length
const phrase = formatEntries(DESCRIPTION_PHRASE_WIRING)
const name = formatEntries(FEATURE_NAME_WIRING)
const homebrew = HOMEBREW_WIRING_PATTERNS.map(
  (pattern) => `${pattern.source}:\n${pattern.guidance.map((line) => `- ${line}`).join("\n")}`,
).join("\n\n").length

console.log(`\nCommon Modifier wiring index: ${indexTotal.toLocaleString()} chars`)
console.log(`  Description phrases (${DESCRIPTION_PHRASE_WIRING.length} rules)  ${phrase.toLocaleString()}`)
console.log(`  Feature names (${FEATURE_NAME_WIRING.length} rules)          ${name.toLocaleString()}`)
console.log(`  Homebrew patterns (${HOMEBREW_WIRING_PATTERNS.length} blocks)     ${homebrew.toLocaleString()}`)
console.log(`  Cheat sheet + other            ${(indexTotal - phrase - name - homebrew).toLocaleString()}`)

console.log("\nLargest homebrew pattern blocks:")
for (const pattern of [...HOMEBREW_WIRING_PATTERNS]
  .sort((a, b) => b.guidance.join("").length - a.guidance.join("").length)
  .slice(0, 8)) {
  console.log(`  ${pattern.guidance.join("").length.toLocaleString().padStart(6)}  ${pattern.source}`)
}
