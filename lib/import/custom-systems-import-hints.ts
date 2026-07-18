/** User-provided labels that guide LLM extraction of custom ability libraries and class resources. */

export type CustomSystemsImportHints = {
  /** Overall library name, e.g. "Psionic Disciplines", "Exploits", "Maneuvers", "Hexes". */
  abilityCategory?: string | null
  /**
   * Display names for class resource pools, comma- or newline-separated
   * (e.g. "Psi Points, Psi Limit" or "Exploit Dice").
   */
  classResourceLabels?: string | null
}

export function parseClassResourceLabelList(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(/[\n,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

/**
 * Organizational rules + mini-examples for library-style custom abilities.
 * Included for abilities imports and whenever Step 0 custom-system labels are set.
 */
export const CUSTOM_ABILITY_LIBRARY_STRUCTURE_HINT = `Custom ability library structure (required when the source uses packages, degrees, or upgrade lists)

Split layers. Do NOT mash an entire package/section into one ability description.

1) Overall category label — NOT its own ability row
   Examples: "Psionic Disciplines", "Exploits", "Upgrades"
   Use as a grouping label only (e.g. on class picker features). Never invent a custom ability whose only job is the library header.
   Import review will list mid-level packages and leaf powers as separate custom ability rows — that is expected.

2) Mid-level packages OR list headers
   - Psionic Disciplines: one import_proposals.custom_abilities[] row per Discipline (Enhancement Discipline, …) with ability_role "discipline".
     description = overview + passive package feature only (Enhancing Skill, Project Item, Flicker Step, …) + default Alternate Effects table.
     Do NOT put the Psionic power body or talent list prose into description — those are separate components (below).
   - Exploits: degree headers are NOT ability rows; each exploit is its own custom_ability.
   - Inventor upgrades: list headers are NOT ability rows; each upgrade is ability_role "upgrade".

3) Talent pools — three distinct patterns (do not conflate)
   a) Discipline-gated talents — picked only if you know a specific discipline.
      Nest in choices.options on that discipline's package row.
      Use category "Discipline Talents" when a class-level talent pool also exists; "Talents" alone is OK only if there is no separate class-level pool.
      These are NOT top-level custom_abilities and NOT spells.
   b) Class-level talents — a separate, larger list (often at the end of the class chapter), picked via a class feature with its own level-scaling count (e.g. a "Talents Known" column), not gated by discipline (entries may still require class level or subclass).
      One import_proposals.custom_abilities[] row per talent with ability_role: "class_talent".
      Wire the class feature with choices.category "Class Talents" (or similar) and a distinct resourceKey (e.g. class_talents_known) — never reuse the same category/"Talents"/resourceKey as the discipline-gated picker (same collision class as ASI/Archery/Slippery Mind name clashes).
      Put level/subclass gates in the row's prerequisite (e.g. "Prerequisite: Unleashed Mind subclass").
   c) Feat-gated / combo / fusion talents — unlocked by a feat; prerequisites often name multiple disciplines/talents.
      Also ability_role: "class_talent" with prerequisite naming the feat and required abilities using exact names (see Name and source matching), e.g. "Prerequisite: Psionic Synthesis feat, Transposition Discipline, Astral Swap Talent".

4) Specialization (one-time package sub-choice) + replacement spell lists
   If a discipline (or similar package) offers a mutually exclusive, optional/one-time sub-choice when the package is first gained — often labeled "Specialization" — and each option replaces a default Alternate Effects / spell table:
   - Prefer structured options with an HTML <table> (Point Cost | Alternate Effects) on each option's description so Dump Stat can wire spells_known per option.
   - When the package ALSO has Discipline Talents: keep talents in choices (category "Discipline Talents"); put Specialization in specialization_choices: { category: "Specialization", count: 1, options: [...] } — do NOT mix Specialization options into the talent choices.options list.
   - When Specialization is the package's only choices pool: choices: { category: "Specialization", count: 1, options: [...] } is fine.
   - Fallback: if you cannot emit structured specialization_choices, put each specialization under a clear "Specializations" heading in the package description with bold option names and either an HTML replacement table or a prose cost list ("1—spell a, spell b; 2—…"). Keep only the default/base Alternate Effects table outside those specialization sections. The importer recovers structured choices from that prose.

5) Leaf components (must be separate — completeness checklist)
   Psion — for EVERY discipline in the source, extract ALL of:
   a) Discipline package row (ability_role "discipline") as above.
      Do NOT propose Primary/Secondary/Third Discipline class features as custom abilities — the archetype grants the first discipline; Secondary/Third are separate class_disciplines picks that also feed known_discipline_talents.
   b) EVERY discipline-gated talent → choices on the discipline (see pattern 3a).
      Put "(Prerequisite: …)" into options[].prerequisite when present; keep full rules in options[].description.
      Do not stop after a few talents — walk the full list under that discipline until the next discipline begins.
      The class feature "Psionic Talents" stays a class feature (optionsSource known_discipline_talents) — not a custom ability.
   c) EVERY entry labeled "Psionic power" (or equivalent casting-header block: Casting Time / Range / Components / Duration) → its own import_proposals.custom_abilities[] row with ability_role "psionic_power".
      Do NOT put psionic powers in spells[] — they are not spells (even though they look similar).
      Keep casting headers as fields when possible (casting_time, range, components, duration, concentration) and full rules + augment list in description.
      Keep the augment gate sentence and each "Name (N psi points): …" as its own <li> — never collapse to "Modifiers: A, B, C".
      In definition, note the parent discipline (e.g. "Psionic power from Enhancement Discipline").
   d) Default Alternate Effects tables stay on the discipline description (HTML table is fine).
   e) Class-level and feat-gated talents as ability_role "class_talent" rows (patterns 3b–3c) — do not nest those under a discipline.
   f) Innate Psionics / Innate Psionic Ability stay as class features (spells_known / uses modifiers) — not custom abilities.

   Exploits — one proposal per exploit; keep "expend one Exploit Die" phrasing when present.
   Inventor — one proposal per upgrade option.

6) Section-intro rules propagate to every leaf
   When a section, chapter, or tier intro states a rule that applies to every entry beneath it — a recharge cadence, a resource cost, a level prerequisite, an activation constraint — that rule must be captured on each individual leaf entry's own fields (uses / mechanics[] usesRecharge, prerequisite, level_requirement, execution, etc.), not left implicit in the section header. Re-read the section intro before finalizing each leaf in that section and confirm inherited rules were applied. This is easy to miss because the source states it once for readability; the extraction still needs it on every row.
   Example: "3rd-degree Exploits can only be used once per short or long rest" in a degree intro → every 3rd-degree exploit leaf gets that recharge on its own uses / mechanics[], even though the individual exploit text never repeats it.

7) execution (optional string) — activation cost/timing
   Every exploit/maneuver/technique-style leaf that has a labeled "Execution:", "Activation:", or "Trigger:" line should set execution to that line's value verbatim (e.g. "1 action", "On hit (weapon attack)", "1 reaction", "On a successful Grapple"). This is structurally equivalent to casting_time on psionic powers but is its own field — do not put Execution text only into casting_time. Keeping the same line in description prose is fine and expected; execution is the structured duplicate for querying.

8) eligible_classes (optional string[]) — multi-class library entries
   When the source lists one or more classes that can learn the ability (e.g. "Classes: Barbarian, Brawler, Fighter, …"), put every named class in eligible_classes. Do not collapse multiple class names into source_name or prerequisite.
   - Single-class libraries (Psionic Disciplines → Psion): keep using source_type "class" and source_name "Psion" as today; eligible_classes is optional there.
   - Shared / compendium-style libraries not owned by one originating class: source_type "compendium", source_name null, and eligible_classes listing every named class.

9) Crafted-consumable abilities (bombs, traps, poisons, oils)
   Stay as a single custom_abilities row describing both crafting and the consumable's own rules — do not split into a separate equipment[] entry unless the target schema treats player-crafted consumables as inventory items (deliberate modeling choice).
   When spending a resource to craft locks that resource "until this [item] is spent or destroyed," set mechanics[] uses with usesRecharge: "until_item_consumed" and note in description what resolves the lock.

Placement rules:
- Prefer import_proposals.custom_abilities[] for disciplines, psionic_power leaves, class_talent rows, exploits, upgrades, and knacks.
- Do NOT duplicate the same entry in both abilities[] and import_proposals.custom_abilities[].
- Do NOT invent thin proposal stubs that only summarize packages already fully extracted.
- Do NOT emit spells[] rows for content labeled Psionic power / psionic discipline powers.
- Class resources go in class_resources[] / import_proposals.class_resources[].
- Keep spend phrasing (expend N psi points, expend one Exploit Die). Do not invent linkedModifiers.
- Same ability named twice (brief grant + full write-up): one row, fuller description — see Duplicate references / same-ability merge.
- prerequisite holds real prerequisites only (ability scores, skill/tool proficiencies, level) — not Classes: lists or Execution: lines.

Illustrative mini-shapes (adapt names/text from the source; omit unused arrays):

Psionic Disciplines → discipline packages + nested Discipline Talents + separate psionic_power rows (NOT spells[]):
{
  "import_proposals": {
    "custom_abilities": [
      {
        "proposal_id": "enhancement_discipline",
        "name": "Enhancement Discipline",
        "ability_role": "discipline",
        "definition": "Discipline package: Enhancing Skill passive; Discipline Talent options; Alternate Effects. Power: Enhancing Surge (separate row).",
        "description": "<p>Enhancement is…</p><p><strong>Enhancing Skill:</strong> …</p><table>…default Alternate Effects…</table>",
        "choices": {
          "category": "Discipline Talents",
          "count": 1,
          "options": [
            {
              "name": "Body Control",
              "prerequisite": "5th-level Psion",
              "description": "You can cast alter self at will…"
            },
            {
              "name": "Enhanced Regrowth",
              "description": "You gain the cure wounds spell…"
            }
          ]
        },
        "specialization_choices": {
          "category": "Specialization",
          "count": 1,
          "options": [
            {
              "name": "Cryokinetic",
              "description": "<p>Cold-only Elemental Blast…</p><table><tr><td>Point Cost</td><td>Alternate Effects</td></tr><tr><td>1</td><td>arctic breath, entomb</td></tr></table>"
            }
          ]
        },
        "source_type": "class",
        "source_name": "Psion",
        "level_requirement": 1
      },
      {
        "proposal_id": "enhancing_surge",
        "name": "Enhancing Surge",
        "ability_role": "psionic_power",
        "definition": "Psionic power from Enhancement Discipline.",
        "description": "<p>You empower the body…</p><p>You can spend psi points up to your per use limit to add the following modifiers to Enhancing Surge (you can add multiple modifiers).</p><ul><li><strong>Fortifying (1+ psi points):</strong> …</li><li><strong>Resilient (3 psi points):</strong> …</li></ul>",
        "casting_time": "1 action",
        "range": "60 feet",
        "components": ["S"],
        "duration": "1 round",
        "concentration": false,
        "source_type": "class",
        "source_name": "Psion",
        "level_requirement": 1
      },
      {
        "proposal_id": "inland_eye",
        "name": "Inland Eye",
        "ability_role": "class_talent",
        "definition": "Class-level talent (not gated by a specific discipline).",
        "description": "<p>…</p>",
        "prerequisite": "5th-level Psion",
        "source_type": "class",
        "source_name": "Psion",
        "level_requirement": 5
      }
    ]
  },
  "class_resources": [
    { "class_name": "Psion", "resource_key": "psi_points", "name": "Psi Points", "uses": { "type": "at_level", "atLevelMode": "tier", "atLevelTable": [{ "level": 1, "count": 1 }], "recharges": [{ "rest": "short_rest" }, { "rest": "long_rest" }] } },
    { "class_name": "Psion", "resource_key": "psi_limit", "name": "Psi Limit", "uses": { "type": "special", "atLevelMode": "tier", "atLevelTable": [{ "level": 1, "count": 1 }] } }
  ]
}

Exploits → one proposal per exploit (degree headers are not abilities; shared multi-class library):
{
  "import_proposals": {
    "custom_abilities": [{
      "proposal_id": "crushing_grip",
      "name": "Crushing Grip",
      "definition": "1st-degree exploit. Expend one Exploit Die on a successful Grapple.",
      "description": "<p><strong>Execution:</strong> On a successful Grapple</p><p><strong>Prerequisites:</strong> Strength 11, Athletics</p><p>When you Grapple a target, you can expend one Exploit Die to enhance your grip…</p>",
      "execution": "On a successful Grapple",
      "prerequisite": "Strength 11, Athletics",
      "eligible_classes": ["Barbarian", "Fighter"],
      "source_type": "compendium",
      "source_name": null,
      "level_requirement": 2
    }]
  },
  "class_resources": [
    { "class_name": "Fighter", "resource_key": "exploit_dice", "name": "Exploit Dice", "uses": { "type": "at_level", "atLevelMode": "tier", "atLevelTable": [{ "level": 2, "count": 2 }], "recharges": ["short_rest", "long_rest"] } }
  ]
}

Inventor subclass upgrades → one proposal per upgrade (list headers are not abilities):
{
  "import_proposals": {
    "custom_abilities": [{
      "proposal_id": "gadgetsmith_airburst_mine",
      "name": "Airburst Mine",
      "ability_role": "upgrade",
      "definition": "Gadgetsmith unrestricted upgrade gadget.",
      "description": "You create a mechanical device capable of producing a devastating blast. You can use this device to cast shatter or thunderburst mine without expending a spell slot. Once used, this gadget can't be used again until you finish a short or long rest.",
      "source_type": "subclass",
      "source_name": "Gadgetsmith",
      "level_requirement": 3,
      "repeatable": false
    }]
  }
}`

export function formatCustomSystemsImportHint(
  hints: CustomSystemsImportHints | null | undefined,
): string {
  const category = hints?.abilityCategory?.trim() ?? ""
  const resources = parseClassResourceLabelList(hints?.classResourceLabels)
  if (!category && resources.length === 0) return ""

  const lines: string[] = [
    "Custom ability systems (user-provided labels — use these to find and group content)",
    "",
  ]

  if (category) {
    lines.push(`Ability category: ${category}`)
  } else {
    lines.push("Ability category: (none provided — do not invent a library category)")
  }

  if (resources.length > 0) {
    lines.push(`Class resources to look for: ${resources.join("; ")}`)
  } else {
    lines.push("Class resources: (none provided — only extract pools the text clearly defines)")
  }

  lines.push(
    "",
    "How to apply these labels:",
    "- After by-level class features, look for a higher-rank section header matching the ability category (or a close synonym). That section is the custom ability library.",
    "- Map that library onto the split hierarchy in the structure examples below (category label → packages → leaf powers / nested talents / class_talent rows).",
    `- When an ability category is provided, use "${category || "the category name"}" as the library grouping label on class picker features only. Discipline talent pickers use choices.category "Discipline Talents" (or "Talents" only if no class-level pool exists); class-level talent pickers use a distinct category such as "Class Talents". Do not create a row named only "${category || "the category name"}".`,
    "- Prefer ability_role \"discipline\" for discipline packages, \"psionic_power\" for each Psionic power leaf (not spells[]), \"class_talent\" for class-level / feat-gated talents, \"upgrade\" for Inventor upgrades; Exploits as one custom_ability per option with execution + eligible_classes when the source lists them.",
    "- Class resources named above should become class_resources[] / import_proposals.class_resources[] with those display names (resource_key = lowercase snake_case).",
    "- Keep spend/recharge phrasing in leaf descriptions (Dump Stat wires Common Modifiers at import — do not invent linkedModifiers). Propagate section/tier intro recharge rules onto every leaf.",
    "- Do not invent abilities or resources that are absent from the source. Leave blank user fields mean skip inventing that layer.",
    "",
    CUSTOM_ABILITY_LIBRARY_STRUCTURE_HINT,
  )

  return lines.join("\n")
}
