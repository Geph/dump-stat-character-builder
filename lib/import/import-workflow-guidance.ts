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

/** Short rule shown outside collapsed panels. */
export const ONE_CLASS_AT_A_TIME_WARNING =
  "Import only one class per pass (that class plus its subclasses is fine). Multi-class PDFs or JSON with several classes[] entries are not likely to work — use a page range or split the extract."

export const MULTI_FILE_IMPORT_TIP =
  "Libraries before the class: non-SRD spells, psionic disciplines/powers, exploit/maneuver lists, and similar pickers should be extracted and imported first so the class can wire to them. Then do one class chapter (core + subclasses). Use page ranges to skip other classes — not to split a class from its own subclasses."

export const JSON_ARRAY_IMPORT_TIP =
  "You can paste a JSON array of import objects in Step 2 — e.g. [{\"abilities\": [...]}, {\"spells\": [...]}, {\"classes\": [...]}, {\"subclasses\": [...]}] — and Dump Stat will merge them into one batch before wiring. Put library objects before the class object when combining passes."

export const IMPORT_WORKFLOWS: ImportWorkflow[] = [
  {
    id: "spellcasting-class",
    title: "Spellcasting classes (Witch, full casters)",
    summary:
      "Import homebrew spells / class spell lists first, then one pass for the class chapter (core + subclasses). Subclass always-prepared tables wire cleanly when those spells already exist.",
    examples: ["Kibbles Witch", "Kibbles Inventor", "homebrew full/half/third casters"],
    steps: [
      {
        label: "Spells and class spell lists first",
        hint: "Non-SRD spells and class spell lists (content types Spells or Class Spell Lists). Skip if everything is SRD-seeded.",
        contentType: "spells",
      },
      {
        label: "Class chapter (core + subclasses)",
        hint: "One PDF/text pass for the class and its subclasses together — staged review covers both.",
        contentType: "classes",
      },
      {
        label: "Extra custom ability menus (only if separate)",
        hint: "Rare: ability pickers that live outside the class PDF — import as abilities[] / feats[] after the class if they were not in the chapter pass",
        contentType: "abilities",
      },
    ],
    notes: [
      "SRD spells do not need a separate import if your compendium is SRD-seeded.",
      "Cantrips bundled in a subclass file’s spells[] array are merged automatically.",
      "One class per pass — page-range out any other classes in the same book.",
    ],
  },
  {
    id: "psion-disciplines",
    title: "Psionic classes (KibblesTasty Psion)",
    summary:
      "Extract Psionic Disciplines and powers from the PDF first (even if they appear later in the book), import that library, then extract the Psion class + archetypes. Class features and psi costs wire to disciplines that already exist.",
    examples: ["KibblesTasty Psion"],
    steps: [
      {
        label: "Disciplines & powers first",
        hint: "Point the LLM at the Psionic Disciplines / powers section — abilities[], related spells[], and import_proposals.custom_abilities. Do this before the class chapter.",
        contentType: "abilities",
      },
      {
        label: "Psion class chapter (core + archetypes)",
        hint: "Psi Points, Psi Limit, Psionic Disciplines feature, and archetypes/subclasses — after the discipline library is in (or in the same JSON array after the library object)",
        contentType: "classes",
      },
      {
        label: "Discipline feats (if bundled separately)",
        contentType: "feats",
      },
    ],
    notes: [
      "In the Psion PDF, disciplines often follow the class text — still extract them as pass 1; use a page range or an explicit “disciplines only” instruction.",
      "Psi-point augment options are parsed into psionic_augments on each discipline power at import.",
      "On the character sheet, open a psionic power to pick augments before casting; total psi cost is logged with the cast.",
    ],
  },
  {
    id: "martial-exploits",
    title: "Martial exploit classes (Laserllama Alt Fighter, etc.)",
    summary:
      "Same pattern as Psion: extract the exploit / maneuver library first, then the class chapter (level table + subclasses).",
    examples: ["Laserllama Alternate Fighter", "MCDM classes with technique lists"],
    steps: [
      {
        label: "Exploit / maneuver library first",
        hint: "Custom abilities[] or feats[] for individual exploits — even when they appear later in the PDF than the class",
        contentType: "abilities",
      },
      {
        label: "Class chapter (level table + subclasses)",
        hint: "Exploit Dice columns, Martial Exploits feature, and subclasses after the library exists",
        contentType: "classes",
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
    summary:
      "Homebrew spells first when needed, then the Inventor class chapter. Upgrade pickers that ship as a separate library should come before the class when possible.",
    examples: ["Kibbles Inventor"],
    steps: [
      {
        label: "Spells and class spell lists (if any)",
        hint: "Non-SRD spells your Inventor features rely on",
        contentType: "spells",
      },
      {
        label: "Upgrade / companion library (if separate)",
        hint: "abilities[] with companion_stat_block or upgrade pickers that are not inside the class chapter",
        contentType: "abilities",
      },
      {
        label: "Inventor class chapter (core + subclasses)",
        hint: "Upgrades resource, specialization choices, and subclass features",
        contentType: "classes",
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
