/** Player-facing class/subclass overlay copy: flavor only, never “Becoming a…” checklists. */

import { srdFlavorDescription } from "@/lib/compendium/srd-flavor-descriptions"
import { KIBBLES_CLASS_FLAVOR, KIBBLES_SUBCLASS_FLAVOR } from "@/lib/seed-packs/kibbles-tasty/class-flavor"
import { MHP_CLASS_PRESENTATION } from "@/lib/seed-packs/mage-hand-press/class-presentation"
import { MHP_SUBCLASS_FLAVOR } from "@/lib/seed-packs/mage-hand-press/subclass-flavor"

function toPlain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(?:p|li|h[1-6]|div|tr)>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\*\*|__|_/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

const BECOMING_HTML_RE =
  /(?:<p[^>]*>\s*)?<strong>\s*Becoming\s+an?\s+[^<]+<\/strong>\s*<\/p>\s*(?:<p[^>]*>\s*<em>\s*As a (?:Level 1|Multiclass) Character\s*<\/em>\s*<\/p>\s*<ul[\s\S]*?<\/ul>\s*)+/gi

const BECOMING_PLAIN_RE =
  /Becoming\s+an?\s+[^\n.]+\.?\s*(?:As a Level 1 Character[\s\S]*?)(?:As a Multiclass Character[\s\S]*?)(?=\n[A-Z][a-z]|$)/gi

const CORE_TRAITS_TABLE_RE =
  /(?:<p[^>]*>)?\s*(?:\*\*)?Core\s+[\w'()]+(?:\s+[\w'()]+)*\s+Traits(?:\*\*)?\s*(?:<\/p>)?[\s\S]*?<table[\s\S]*?<\/table>/gi

const CORE_TRAITS_PLAIN_RE = /(?:\*\*)?Core\s+[\w'()]+(?:\s+[\w'()]+)*\s+Traits(?:\*\*)?[\s\S]*?(?=\n\n[A-Z]|$)/gi

/** Drop “Becoming a…” checklists and Core Traits tables from a class/subclass description. */
export function stripClassSelectionBoilerplate(description: string | null | undefined): string {
  if (!description?.trim()) return ""
  let next = description
  next = next.replace(BECOMING_HTML_RE, " ")
  next = next.replace(CORE_TRAITS_TABLE_RE, " ")
  next = next.replace(BECOMING_PLAIN_RE, " ")
  next = next.replace(CORE_TRAITS_PLAIN_RE, " ")
  next = next.replace(/^\s*<p[^>]*>\s*You (?:gain|have) (?:proficiency|training)[^<]{0,180}<\/p>\s*/i, " ")
  return next.replace(/\s+/g, " ").replace(/(<p>\s*<\/p>)/gi, "").trim()
}

export function isClassSelectionBoilerplate(description: string | null | undefined): boolean {
  if (!description?.trim()) return true
  return !isMeaningfulFlavor(stripClassSelectionBoilerplate(description))
}

function isMeaningfulFlavor(text: string): boolean {
  const plain = toPlain(text)
  if (plain.length < 40) return false
  if (/^core\s+\w+/i.test(plain)) return false
  if (/^becoming\s+an?\b/i.test(plain)) return false
  if (/^as a (?:level 1|multiclass) character\b/i.test(plain)) return false
  if (
    /^you (?:gain|have) (?:proficiency|training)\b/i.test(plain) &&
    plain.length < 180 &&
    !/[.!].+\w/.test(plain.slice(plain.indexOf(".") + 1))
  ) {
    return false
  }
  return true
}

function classNameBase(name: string): string {
  return name.replace(/\s*\(.*\)\s*$/, "").trim() || name
}

function curatedClassFlavor(name: string): string | undefined {
  const trimmed = name.trim()
  const base = classNameBase(trimmed)
  return (
    srdFlavorDescription("class", trimmed) ??
    srdFlavorDescription("class", base) ??
    MHP_CLASS_PRESENTATION[base]?.description ??
    KIBBLES_CLASS_FLAVOR[trimmed] ??
    KIBBLES_CLASS_FLAVOR[base]
  )
}

function curatedSubclassFlavor(name: string, className?: string | null): string | undefined {
  const trimmed = name.trim()
  const classBase = className ? classNameBase(className) : ""
  const keyed = classBase ? `${classBase}::${trimmed}` : ""
  return (
    (keyed ? MHP_SUBCLASS_FLAVOR[keyed] : undefined) ??
    (keyed ? KIBBLES_SUBCLASS_FLAVOR[keyed] : undefined) ??
    srdFlavorDescription("subclass", trimmed) ??
    MHP_SUBCLASS_FLAVOR[trimmed] ??
    KIBBLES_SUBCLASS_FLAVOR[trimmed]
  )
}

export type DetailFlavorItem = {
  name?: string | null
  description?: string | null
  class_name?: string | null
}

/** Flavor for “How it feels to play” / “What this path offers”. */
export function getCompendiumDetailFlavor(
  item: DetailFlavorItem,
  kind: "class" | "subclass" = "class",
): string {
  const stripped = stripClassSelectionBoilerplate(item.description)
  if (isMeaningfulFlavor(stripped)) return stripped
  const name = item.name?.trim() ?? ""
  if (!name) return ""
  const curated =
    kind === "subclass"
      ? curatedSubclassFlavor(name, item.class_name)
      : curatedClassFlavor(name)
  return curated?.trim() ?? ""
}
