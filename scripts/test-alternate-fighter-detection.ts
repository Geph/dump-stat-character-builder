/**
 * Report mechanical modifier detection on Alternate Fighter sample features.
 * Run: npx tsx scripts/test-alternate-fighter-detection.ts
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { enrichImportContentModifiers } from "../lib/import/enrich-import-modifiers"
import { collectImportModifierPreviews } from "../lib/import/import-modifier-previews"
import type { ImportContent } from "../lib/import/content-schema"

const SAMPLE_FEATURES = [
  {
    level: 5,
    name: "Extra Attack",
    description:
      "Beginning at 5th level, you can attack twice, instead of once, whenever you take the Attack action on your turn.",
  },
  {
    level: 1,
    name: "Archery",
    description: "You gain a +2 bonus to attack rolls with ranged weapons.",
  },
  {
    level: 1,
    name: "Classical Swordplay",
    description:
      "While wielding a single finesse weapon, no shield, and not wearing heavy armor, you gain a +2 bonus to attack rolls with that weapon and a +1 bonus to your Armor Class.",
  },
  {
    level: 1,
    name: "Defensive Fighting",
    description:
      "When you are wearing medium armor, heavy armor, or a shield you gain a +1 bonus to your Armor Class.",
  },
  {
    level: 10,
    name: "Tactical Reposition",
    description:
      "Whenever you use your Second Wind, you gain the benefits of the Disengage action and your speed increases by 10 feet until the end of your current turn.",
  },
  {
    level: 10,
    name: "Inscrutable Mind",
    description: "You gain resistance to psychic damage.",
  },
  {
    level: 3,
    name: "Combat Theorist",
    description: "You gain proficiency in History.",
  },
  {
    level: 6,
    name: "Action Surge",
    description:
      "Once during your turn, you can choose to take one additional action. After you do so, you must finish a short or long rest before you can use this feature again.",
  },
  {
    level: 1,
    name: "Brawling",
    description: "Prerequisite: proficiency in Athletics",
  },
] as const

function main() {
  const pdfTextPath = resolve(process.cwd(), "agent-tools-alt-fighter.txt")
  let pdfChars = 0
  try {
    pdfChars = readFileSync(pdfTextPath, "utf8").length
  } catch {
    console.warn(`Note: ${pdfTextPath} not found; using built-in feature samples only.\n`)
  }

  const content: ImportContent = {
    classes: [
      {
        name: "Alternate Fighter",
        description: pdfChars ? `Extracted sample from ${pdfChars.toLocaleString()} character PDF text.` : null,
        hit_die: 10,
        primary_ability: ["Strength", "Dexterity"],
        features: SAMPLE_FEATURES.map((feature) => ({ ...feature })),
      },
    ],
  }

  const enriched = enrichImportContentModifiers(content)
  const previews = collectImportModifierPreviews(enriched)

  console.log(`Alternate Fighter detection report (${previews.length} modifiers)\n`)
  if (pdfChars) {
    console.log(`Source PDF text available: ${pdfChars.toLocaleString()} characters\n`)
  }

  for (const feature of SAMPLE_FEATURES) {
    const featurePreviews = previews.filter((entry) => entry.featureName === feature.name)
    console.log(`## L${feature.level} ${feature.name}`)
    if (!featurePreviews.length) {
      console.log("  (no auto-wired modifiers)")
    } else {
      for (const entry of featurePreviews) {
        console.log(
          `  - ${entry.summary} [${entry.confidence}, ${entry.source}] "${entry.matchedPhrase}"`,
        )
      }
    }
    console.log()
  }

  const unmatched = SAMPLE_FEATURES.filter(
    (feature) => !previews.some((entry) => entry.featureName === feature.name),
  )
  if (unmatched.length) {
    console.log(`Features without detection (${unmatched.length}):`)
    for (const feature of unmatched) {
      console.log(`  L${feature.level} ${feature.name}`)
    }
  }
}

main()
