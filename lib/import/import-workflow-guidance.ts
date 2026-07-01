/** User-facing import order guidance for multi-file homebrew workflows. */

export type ImportWorkflowStep = {
  label: string
  hint?: string
  contentType?: string
}

export type ImportWorkflow = {
  id: string
  title: string
  summary: string
  examples: string[]
  steps: ImportWorkflowStep[]
  notes?: string[]
}

export const MULTI_FILE_IMPORT_TIP =
  "Import supporting libraries before the class and subclass files that reference them. SRD spells resolve from your seeded compendium — you only need homebrew spell JSON for non-SRD names."

export const JSON_ARRAY_IMPORT_TIP =
  "You can paste a JSON array of import objects in Step 2 — e.g. [{\"spells\": [...]}, {\"classes\": [...]}, {\"subclasses\": [...]}] — and Dump Stat will merge them into one batch before wiring."

export const IMPORT_WORKFLOWS: ImportWorkflow[] = [
  {
    id: "spellcasting-class",
    title: "Spellcasting classes (Witch, Inventor, full casters)",
    summary:
      "Subclass always-prepared tables and class spell lists need spell definitions available when modifiers are wired.",
    examples: ["Kibbles Witch", "Kibbles Inventor", "homebrew full/half/third casters"],
    steps: [
      {
        label: "Homebrew spell libraries",
        hint: "Third-party or author spell JSON (e.g. kibbles-spells-parsed.json, valdas-spells-201-231.json)",
        contentType: "spells",
      },
      {
        label: "Class spell list (PHB table)",
        hint: "Paste an \"Artificer Spell List\" section with Spell / School / Special columns — use content type Class Spell Lists for zero-AI parsing",
        contentType: "spell_lists",
      },
      {
        label: "Class spell list stub (optional)",
        hint: "Spell list JSON with class name tags when split from the class PDF",
        contentType: "spells",
      },
      {
        label: "Class",
        hint: "Core features, spellcasting, and class_resources[] pools",
        contentType: "classes",
      },
      {
        label: "Subclasses",
        hint: "Subclass features with HTML spell tables in descriptions",
        contentType: "subclasses",
      },
      {
        label: "Choice options (if separate)",
        hint: "Grand hex options, invocations, etc. as abilities[] or feats[]",
        contentType: "abilities",
      },
    ],
    notes: [
      "SRD spells (Burning Hands, Fireball, etc.) do not need a separate import if your compendium is SRD-seeded.",
      "Hex cantrips and similar entries bundled in a subclass file’s spells[] array are merged automatically.",
    ],
  },
  {
    id: "psion-disciplines",
    title: "Psionic classes (KibblesTasty Psion)",
    summary:
      "Discipline packages, discipline powers, and psi-point pools are often split across multiple JSON files.",
    examples: ["KibblesTasty Psion", "psion-disciplines.json + psion-class.json"],
    steps: [
      {
        label: "Disciplines & powers",
        hint: "Discipline passive features, psionic powers (spells[]), and import_proposals.custom_abilities",
        contentType: "abilities",
      },
      {
        label: "KibblesTasty Psion class",
        hint: "Psi Points, Psi Limit, Psionic Disciplines feature, archetype choices",
        contentType: "classes",
      },
      {
        label: "Archetypes / subclasses (if separate)",
        contentType: "subclasses",
      },
      {
        label: "Discipline feats (if bundled separately)",
        contentType: "feats",
      },
    ],
    notes: [
      "Psi-point augment options (Fortifying, Savage, etc.) are parsed into psionic_augments on each discipline power at import.",
      "On the character sheet, open a psionic power to pick augments before casting; total psi cost is logged with the cast.",
      "Base activation costs like “expend 2 psi points” auto-wire to the psi_points resource when phrasing matches.",
    ],
  },
  {
    id: "martial-exploits",
    title: "Martial exploit classes (Laserllama Alt Fighter, etc.)",
    summary:
      "Exploit dice on the level table, exploit techniques, and the core class are easiest to wire when imported in dependency order.",
    examples: ["Laserllama Alternate Fighter", "MCDM classes with technique lists"],
    steps: [
      {
        label: "Exploit / maneuver library (if separate)",
        hint: "Custom abilities[] entries or feats[] for individual exploits",
        contentType: "abilities",
      },
      {
        label: "Class with level table",
        hint: "Exploit Dice, Exploit Die size, Exploits Known columns + Martial Exploits feature",
        contentType: "classes",
      },
      {
        label: "Subclasses (if separate)",
        contentType: "subclasses",
      },
    ],
    notes: [
      "Battle Master maneuvers and Martial Exploits with isChoice + choices[] are detected as custom ability proposals.",
      "Exploit dice pools wire from the class level table and “expend an exploit die” phrasing in feature text.",
    ],
  },
  {
    id: "inventor-upgrades",
    title: "Artificer-style upgrade classes (Inventor)",
    summary: "Upgrade pickers and companion stat blocks may ship separately from the core class.",
    examples: ["Kibbles Inventor"],
    steps: [
      {
        label: "Spell list / homebrew spells (if any)",
        contentType: "spells",
      },
      {
        label: "Inventor class",
        hint: "Upgrades resource, specialization choices",
        contentType: "classes",
      },
      {
        label: "Subclasses + upgrade features",
        hint: "Golem Companion and similar abilities[] with companion_stat_block",
        contentType: "subclasses",
      },
    ],
  },
]

export function formatWorkflowSteps(workflow: ImportWorkflow): string {
  const lines = workflow.steps.map((step, index) => {
    const hint = step.hint ? ` — ${step.hint}` : ""
    return `${index + 1}. ${step.label}${hint}`
  })
  return lines.join("\n")
}
