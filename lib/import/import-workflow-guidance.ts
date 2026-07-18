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
  "Happy path: usually two LLM extracts, then one import. (1) Supporting library — disciplines, exploits, full spell write-ups. (2) Class chapter — core class + every archetype in the same JSON (classes[] + subclasses[]), including Spell/School/Special list stubs when present. Paste both as a JSON array in Step 2 for one staged review (Dump Stat auto-orders libraries before the class even if you paste them reversed). Use page ranges to skip other classes — not to split a class from its own subclasses. Use content type Subclasses only when adding archetypes to a class already in your compendium."

export const JSON_ARRAY_IMPORT_TIP =
  "Paste a JSON array in Step 2 — e.g. [{\"abilities\": [...]}, {\"classes\": [...], \"subclasses\": [...]}] — and Dump Stat merges it into one batch before wiring. Libraries are auto-sorted ahead of the class chapter; keep archetypes in the same object as classes[] (not a later separate pass)."

export const IMPORT_WORKFLOWS: ImportWorkflow[] = [
  {
    id: "spellcasting-class",
    title: "Spellcasting classes",
    summary:
      "Import full homebrew spell write-ups first when needed, then one Class + subclasses pass for the class chapter (core + every archetype + spell list when present). Include Spell/School/Special tables in that same pass.",
    examples: ["Kibbles Witch", "Kibbles Inventor", "homebrew full/half/third casters", "Artificer-style class lists"],
    steps: [
      {
        label: "Full spell write-ups first (if any)",
        hint: "Non-SRD spells that have their own descriptions (content type Spells). Skip if everything is SRD-seeded. Do not use this step for class spell list tables — those go with the class chapter.",
        contentType: "spells",
      },
      {
        label: "Class chapter (core + subclasses + spell list)",
        hint: "One PDF/text pass with content type Class + subclasses — put every archetype in subclasses[] beside classes[]. Include Spell/School/Special list tables in the same paste when present (spell_list + spells[] stubs). Staged review covers class then subclasses.",
        contentType: "classes",
      },
      {
        label: "Extra custom ability menus (only if separate)",
        hint: "Rare: ability pickers that live outside the class PDF — import as abilities[] / feats[] after the class if they were not in the chapter pass",
        contentType: "abilities",
      },
    ],
    notes: [
      "SRD spells do not need a separate full import if your compendium is SRD-seeded; list stubs only need to tag the class name on each spell.",
      "Upload spell lists with the class (Class + subclasses content type). Do not import a list-only stub after the full class — that can overwrite features.",
      "An empty subclasses[] means no archetypes in the builder — always extract them with the class chapter unless you are intentionally adding later.",
      "Cantrips bundled in a subclass-only file’s spells[] array are still merged when you use Subclasses only for add-ons.",
      "One class per pass — page-range out any other classes in the same book.",
    ],
  },
  {
    id: "psion-disciplines",
    title: "Psionic classes (with separated powers)",
    summary:
      "Two extracts, one import: disciplines/powers library, then Psion class + all archetypes. Paste both JSON objects as an array in Step 2 (auto-ordered) so features wire to disciplines in one review.",
    examples: ["KibblesTasty Psion"],
    steps: [
      {
        label: "Disciplines & powers extract",
        hint: "Point the LLM at the Psionic Disciplines / powers section — abilities[], related spells[], and import_proposals.custom_abilities.",
        contentType: "abilities",
      },
      {
        label: "Psion class chapter extract (core + all archetypes)",
        hint: "Psi Points, Psi Limit, Psionic Disciplines feature, and every archetype in subclasses[]. Do not leave archetypes for a later pass.",
        contentType: "classes",
      },
      {
        label: "One Step 2 paste",
        hint: "Paste [library, classChapter] (or either order — Dump Stat sorts libraries first). Optional: discipline feats as a third array object if separate.",
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
      "Same pattern as Psion: extract the exploit / maneuver library first, then one Classes pass for the class chapter (level table + every subclass).",
    examples: ["Laserllama Alternate Fighter", "MCDM classes with technique lists"],
    steps: [
      {
        label: "Exploit / maneuver library first",
        hint: "Custom abilities[] or feats[] for individual exploits — even when they appear later in the PDF than the class",
        contentType: "abilities",
      },
      {
        label: "Class chapter (level table + all subclasses)",
        hint: "Exploit Dice columns, Martial Exploits feature, and every subclass in the same Classes JSON after the library exists",
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
    title: "Artificer-style upgrade classes",
    summary:
      "Homebrew spell write-ups first when needed, then one Classes pass for the Inventor chapter with its subclasses and spell list included. Upgrade pickers that ship as a separate library should come before the class when possible.",
    examples: ["Kibbles Inventor"],
    steps: [
      {
        label: "Full spell write-ups (if any)",
        hint: "Non-SRD spells your Inventor features rely on — class Spell/School/Special list tables go with the class pass, not here",
        contentType: "spells",
      },
      {
        label: "Upgrade / companion library (if separate)",
        hint: "abilities[] with companion_stat_block or upgrade pickers that are not inside the class chapter",
        contentType: "abilities",
      },
      {
        label: "Inventor class chapter (core + subclasses + spell list)",
        hint: "Content type Class + subclasses — upgrades resource, specialization choices, every subclass feature, and the class spell list in the same pass",
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
