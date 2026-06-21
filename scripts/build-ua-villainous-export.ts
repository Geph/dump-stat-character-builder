/**
 * Builds lib/import/examples/ua-villainous-options-export.json
 * Run: pnpm dlx tsx scripts/build-ua-villainous-export.ts
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { enrichSrdSubclassRow } from "@/lib/compendium/enrich-srd-subclasses"
import { buildBulkExportJson } from "@/lib/import/dump-stat-export-format"

const SOURCE = "UA 2026 Villainous Options"

function subclassRow(
  name: string,
  className: string,
  description: string,
  features: Array<{ level: number; name: string; description: string; isChoice?: boolean; choices?: unknown }>,
) {
  const enriched = enrichSrdSubclassRow(
    { name, description, features, source: SOURCE },
    className,
  )
  return {
    type: "dnd-subclass" as const,
    version: 1,
    data: {
      name,
      class_name: className,
      description,
      source: SOURCE,
      features: enriched.features,
    },
  }
}

const circleOfTheTitan = subclassRow(
  "Circle of the Titan",
  "Druid",
  "Druids who channel primordial titan power through Wild Shape.",
  [
    {
      level: 3,
      name: "Circle of the Titan Spells",
      description:
        "You always have certain spells prepared. At 3rd: Enlarge/Reduce, Thaumaturgy. At 5th: Thunderwave. At 7th: Fear. At 9th: Fire Shield. At 11th: Destructive Wave.",
    },
    {
      level: 3,
      name: "Titan Form",
      description:
        "As a Bonus Action, you expend a use of Wild Shape to assume a titan form (Behemoth, Leviathan, or Insectoid) instead of a beast form.",
      isChoice: true,
      choices: {
        category: "Titan Appearance",
        count: 1,
        options: [
          { name: "Behemoth", description: "Massive terrestrial titan." },
          { name: "Leviathan", description: "Aquatic titan form." },
          { name: "Insectoid", description: "Colossal insectoid titan." },
        ],
      },
    },
    {
      level: 6,
      name: "Dire Impact",
      description: "While in Titan Form, when you deal damage with an attack, you can knock the target prone.",
    },
    {
      level: 10,
      name: "Primal Havoc",
      description: "While in Titan Form, your attacks deal extra force damage.",
    },
    {
      level: 14,
      name: "Monstrous Appetite",
      description: "You can recover Wild Shape uses when you finish a Short Rest.",
    },
  ],
)

const hellKnight = subclassRow(
  "Hell Knight",
  "Fighter",
  "Fighters bound to infernal pacts who weaponize hellfire and lingering wounds.",
  [
    {
      level: 3,
      name: "Diabolical Gift",
      description: "You gain proficiency in one skill: Deception, Performance, or Sleight of Hand.",
      isChoice: true,
      choices: {
        category: "Skill",
        count: 1,
        options: [
          { name: "Deception", description: "" },
          { name: "Performance", description: "" },
          { name: "Sleight of Hand", description: "" },
        ],
      },
    },
    {
      level: 3,
      name: "Hell-Forged Weapon",
      description: "When you finish a Long Rest, you can touch a weapon and infuse it with hellfire.",
    },
    {
      level: 3,
      name: "Infernal Wound",
      description:
        "When you hit with a hell-forged weapon, you can inflict an infernal wound (Constitution modifier uses per Short Rest).",
    },
    {
      level: 7,
      name: "Advanced Wounds",
      description: "Your infernal wounds grow deadlier and harder to heal.",
    },
    {
      level: 7,
      name: "Infernal Equipment",
      description: "You can create infernal armor or a second hell-forged weapon when you finish a Long Rest.",
    },
    {
      level: 10,
      name: "Hellfire Surge",
      description: "As a Bonus Action, you can wreathe yourself in hellfire.",
    },
    {
      level: 15,
      name: "Devil's Misfortune",
      description: "When a creature within 60 feet fails a saving throw, you can use your Reaction to impose disadvantage on another save it makes before your next turn.",
    },
    {
      level: 18,
      name: "Infernal Bargain",
      description: "You can bargain with infernal power to cheat death.",
    },
  ],
)

const demonicSorcery = subclassRow(
  "Demonic Sorcery",
  "Sorcerer",
  "Sorcerers whose magic is torn from the Abyss.",
  [
    {
      level: 3,
      name: "Abyssal Rupture",
      description:
        "When you activate Innate Sorcery, you can open an abyssal rupture that enhances your magic for the duration.",
    },
    {
      level: 3,
      name: "Demonic Spells",
      description:
        "You always have certain spells prepared. At 3rd: Bane, Dissonant Whispers. At 5th: Spike Growth, Web. At 7th: Bestow Curse, Dispel Magic. At 9th: Giant Insect, Hallucinatory Terrain.",
    },
    {
      level: 6,
      name: "Abyssal Realm",
      description: "You can pull creatures into a fragment of the Abyss.",
    },
    {
      level: 14,
      name: "Abyssal Conduit",
      description: "Your abyssal magic grows stronger while Innate Sorcery is active.",
    },
    {
      level: 18,
      name: "Abyssal Explosion",
      description: "You can detonate abyssal energy in a devastating blast.",
    },
  ],
)

const items = [
  {
    type: "dnd-spell" as const,
    version: 1,
    data: {
      name: "Destructive Wave",
      level: 5,
      school: "Evocation",
      casting_time: "Action",
      range: "Self",
      components: ["V"],
      material: null,
      duration: "Instantaneous",
      concentration: false,
      ritual: false,
      description:
        "You strike the ground, creating a burst of divine energy that ripples outward from you. Each creature you choose within 30 feet of you must succeed on a Constitution saving throw or take 5d6 Thunder damage and 5d6 Radiant or Necrotic damage (your choice) and be knocked prone. A creature that succeeds on its saving throw takes half as much damage and isn't knocked prone.",
      higher_levels: null,
      classes: ["Druid", "Paladin"],
      source: SOURCE,
    },
  },
  circleOfTheTitan,
  hellKnight,
  demonicSorcery,
  ...[
    ["Atoner's Grace", "Origin"],
    ["Raised by Cultists", "Origin"],
    ["Trapper", "Origin"],
    ["Underhanded", "Origin"],
    ["Boon of the Bandit King", "Epic Boon"],
    ["Boon of the Cleansed Heart", "Epic Boon"],
    ["Boon of the Hunter's Eye", "Epic Boon"],
    ["Boon of Unwavering Devotion", "Epic Boon"],
  ].map(([name, category]) => ({
    type: "dnd-feat" as const,
    version: 1,
    data: {
      name,
      category,
      description: `${name} (${category}). Import full rules text from UA 2026 Villainous Options Revisited.`,
      prerequisite: category === "Epic Boon" ? "Level 19+" : null,
      source: SOURCE,
    },
  })),
]

const bundle = buildBulkExportJson("ua-villainous-options", items)
const outDir = join(process.cwd(), "lib/import/examples")
mkdirSync(outDir, { recursive: true })
const outPath = join(outDir, "ua-villainous-options-export.json")
writeFileSync(outPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8")
console.log(`Wrote ${items.length} items to ${outPath}`)
