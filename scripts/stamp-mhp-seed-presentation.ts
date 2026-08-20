/**
 * Stamp curated MHP presentation + Warden (source) collision labels onto bundled seed JSON
 * without rebuilding enrichment from Drive.
 *
 * Usage: node scripts/run-vite-node.mjs scripts/stamp-mhp-seed-presentation.ts
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { ImportContent } from "@/lib/import/content-schema"
import {
  MHP_CLASS_PRESENTATION,
  MHP_CLASSES_STRIP_DESCRIPTION_ONLY,
  MHP_WARDEN_CARD_IMAGE_SLUG,
  MHP_WARDEN_CREATOR_URL,
  mhpClassCardImageUrl,
} from "@/lib/seed-packs/mage-hand-press/class-presentation"
import { MHP_CLASS_COMPLEXITY_BY_NAME } from "@/lib/compendium/class-complexity"

const ROOT = join(process.cwd(), "lib/seed-packs")

function applyMhpPresentation(content: ImportContent): ImportContent {
  if (!content.classes?.length) return content
  return {
    ...content,
    classes: content.classes.map((cls) => {
      const name = cls.name?.trim() ?? ""
      const baseName = name.replace(/\s*\(.*\)\s*$/, "").trim() || name
      const presentation = MHP_CLASS_PRESENTATION[baseName]
      if (presentation) {
        return {
          ...cls,
          icon: presentation.icon,
          card_blurb: presentation.card_blurb,
          complexity: MHP_CLASS_COMPLEXITY_BY_NAME[baseName] ?? cls.complexity,
          creator_url: presentation.creator_url,
          description: presentation.description,
          card_image_url: mhpClassCardImageUrl(presentation.card_image_slug),
        }
      }
      if ((MHP_CLASSES_STRIP_DESCRIPTION_ONLY as readonly string[]).includes(baseName)) {
        return {
          ...cls,
          description: null,
          complexity: MHP_CLASS_COMPLEXITY_BY_NAME[baseName] ?? cls.complexity,
          creator_url: MHP_WARDEN_CREATOR_URL,
          card_image_url: mhpClassCardImageUrl(MHP_WARDEN_CARD_IMAGE_SLUG),
        }
      }
      return cls
    }),
  }
}

/** Rename class labels only — keep resource_key values so feature modifiers still resolve. */
function renameClassDisplayName(content: ImportContent, from: string, to: string): ImportContent {
  if (from === to) return content
  const next: ImportContent = { ...content }
  if (content.classes?.length) {
    next.classes = content.classes.map((row) => (row.name === from ? { ...row, name: to } : row))
  }
  if (content.subclasses?.length) {
    next.subclasses = content.subclasses.map((row) =>
      row.class_name === from ? { ...row, class_name: to } : row,
    )
  }
  if (content.class_resources?.length) {
    next.class_resources = content.class_resources.map((row) =>
      row.class_name === from ? { ...row, class_name: to } : row,
    )
  }
  if (content.spells?.length) {
    next.spells = content.spells.map((row) => ({
      ...row,
      classes: row.classes?.map((c) => (c === from ? to : c)) ?? row.classes,
    }))
  }
  const abilities = (content as { abilities?: { source_name?: string | null }[] }).abilities
  if (abilities?.length) {
    ;(next as { abilities?: typeof abilities }).abilities = abilities.map((row) => ({
      ...row,
      source_name: row.source_name === from ? to : row.source_name,
    }))
  }
  if (content.import_proposals?.class_resources?.length || content.import_proposals?.custom_abilities?.length) {
    next.import_proposals = {
      ...content.import_proposals,
      class_resources: (content.import_proposals.class_resources ?? []).map((row) =>
        row.class_name === from ? { ...row, class_name: to } : row,
      ),
      custom_abilities: (content.import_proposals.custom_abilities ?? []).map((row) => ({
        ...row,
        source_name: row.source_name === from ? to : row.source_name,
      })),
    }
  }
  return next
}

function labelWarden(content: ImportContent, source: string): ImportContent {
  const cls = content.classes?.[0]
  const name = cls?.name?.trim() ?? ""
  if (!/^warden$/i.test(name)) return content
  return renameClassDisplayName(content, name, `Warden (${source})`)
}

function stampFile(path: string, transform: (c: ImportContent) => ImportContent) {
  const content = JSON.parse(readFileSync(path, "utf8")) as ImportContent
  const next = transform(content)
  writeFileSync(path, `${JSON.stringify(next)}\n`, "utf8")
  const cls = next.classes?.[0]
  if (cls) {
    console.log(
      `  ${path.split(/[/\\]/).pop()}: ${cls.name} complexity=${(cls as { complexity?: string }).complexity ?? "—"} icon=${(cls as { icon?: string }).icon ?? "—"} blurb=${cls.card_blurb ? "yes" : "no"} descLen=${(cls.description ?? "").length}`,
    )
  } else {
    console.log(`  ${path.split(/[/\\]/).pop()}: (no class)`)
  }
}

const mhpDir = join(ROOT, "mage-hand-press")
const kibblesDir = join(ROOT, "kibbles-tasty")

console.log("Stamping Mage Hand Press class presentation…")
for (const file of readdirSync(mhpDir).filter((f) => f.endsWith("-class.json"))) {
  stampFile(join(mhpDir, file), (c) => labelWarden(applyMhpPresentation(c), "Mage Hand Press"))
}

console.log("\nLabeling Kibbles Tasty Warden collision…")
stampFile(join(kibblesDir, "kibbles-warden-class.json"), (c) => labelWarden(c, "Kibbles Tasty"))

console.log("\nDone.")
