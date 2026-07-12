import { buildImportSystemPrompt } from "@/lib/import/import-system-prompt"
import type { ImportContentTypeHint } from "@/lib/import/content-type-hints"
import type { CustomSystemsImportHints } from "@/lib/import/custom-systems-import-hints"
import type { SubclassMatchImportHint } from "@/lib/import/subclass-match-import-hints"

export const CLEAN_SOURCE_TEXT_GUIDELINES = `Preparing clean source text (from PDF or web)

For best extraction results, your source text should:
- One class per pass only (that class + its subclasses is OK). Never extract multiple unrelated classes in one JSON
- Libraries before class: non-SRD spells, psionic disciplines/powers, exploit lists, and similar pickers first — then the class chapter
- Prefer one class chapter per class pass: the core class and its subclasses together (staged review covers them in order)
- Keep level progression tables in the source so the importer can read features and class_resources[] from them
- Do NOT paste HTML level tables into classes[].description — put rules prose only; features go in features[] and pools (Ki, Rage, Sorcery Points, etc.) in class_resources[]
- Keep feature headings with their full description paragraphs (e.g. "Fighting Style" followed by rules text)
- Preserve mechanical sentences in descriptions (proficiencies, AC formulas, resistances, limited uses, feat grants) so Common Modifiers auto-wire; add mechanics[] when phrasing is non-standard
- Omit chapter running heads, page numbers, and nav ribbons from pasted text when you can — never leave them in description fields
- Preserve HTML <table> blocks for subclass spell lists in feature descriptions when present
- Use a single class or subclass name consistently (match SRD names when importing into an SRD-seeded compendium; for homebrew use the source's own header name, not a designer-prefixed invention)
- Avoid mixing unrelated chapters (equipment tables + feats + multiple unrelated classes in one paste)

PDF tips:
- Copy text from a vector PDF when possible; scanned images need OCR first
- Page headers/footers are OK — importers strip obvious boilerplate
- Page ranges: skip other classes, or isolate a library section (e.g. Psionic Disciplines) before the class chapter — do not use them to split a class from its own subclasses
- Class PDFs with a level table plus feature sections often parse with zero AI when structure is clean

Multi-file homebrew (spellcasters, psionics, martial exploits, and similar):
- Import supporting libraries before the class that references them, then the class chapter, then any leftover custom systems
- You can paste a JSON array of import objects in one run — Dump Stat merges them before wiring modifiers (put library objects first)
- SRD spell names resolve from your seeded compendium; only import homebrew spells for non-SRD names`

const JSON_OUTPUT_RULES = `Output format (required)

Return ONLY valid JSON — no markdown fences, no commentary before or after.
Use null for optional fields you do not have data for.
Omit empty top-level arrays entirely, or set them to null.
Do NOT output linkedModifiers or modifierRefs — Dump Stat wires Common Modifiers at import from description phrasing (and optional mechanics[]) on features, traits, feats, equipment, and abilities.
Optionally add mechanics[] on features, traits, feats, or abilities for explicit modifier hints when phrasing is non-standard (see Common Modifier wiring).
When extracting from a PDF, add source_page (integer, 1-based PDF page) on features[], traits[], spells[], feats[], and abilities[] when identifiable. Omit when unknown.`

const CONTENT_TYPE_JSON_FOCUS: Partial<Record<ImportContentTypeHint, string>> = {
  classes:
    "Focus on classes[] and class_resources[] when present. Include hit_die, proficiencies, and features[] with level, name, description. Put flavor/rules prose in description only — not the level progression table (features and resource columns are extracted separately). Wire Common Modifiers via description phrasing and optional mechanics[] on each feature.",
  subclasses:
    "Focus on subclasses[] with class_name, features[] by level, and spell tables in feature descriptions when present.",
  species: "Focus on species[] with traits[] (name, description; isChoice + choices when applicable).",
  backgrounds:
    "Focus on backgrounds[] with skill_proficiencies, proficiencies (tools, languages), starting_equipment, starting_gold, feat_granted, ability_bonuses, and feature. Legacy pre-2024 backgrounds use ability_bonuses: null and feat_granted: null.",
  spells:
    "Focus on spells[] with level, school, casting_time, range, components, duration, concentration, description. Preserve novel/homebrew schools as written (e.g. Duromancy, Chronomancy, Void Magic, Blood Magic / Sangromancy); do not invent schools for ordinary SRD spells.",
  spell_lists:
    "Focus on class spell list tables (Spell / School / Special columns). Populate classes[] with spell_list (all spell names) and spells[] with level, school, concentration, components (M when Special includes M), and classes set to the list's class name. Preserve novel school names from the School column when present.",
  feats: "Focus on feats[] with category (Origin, General, Fighting Style, Epic Boon) when known.",
  equipment:
    "Focus on equipment[] with category (Weapon, Armor, Adventuring Gear, Tool, Mount, Vehicle, Trade Good, or Other for magic items without a mundane type), magic_item_category (Wondrous Item, Ring, Potion, etc.), rarity, requires_attunement, cost { amount, unit } or null when no price, weight, and properties (weapon/armor stats only — put rarity and attunement on top-level fields, not in properties).",
  abilities:
    "Focus on custom ability libraries and class_resources[]. Split hierarchy (do not mash): category label (not a row) → mid-level packages → leaf powers / class_talent rows + nested Discipline Talents in choices. Prefer import_proposals.custom_abilities[] for discipline packages (ability_role discipline), psionic powers (ability_role psionic_power — NOT spells[]), class-level/feat-gated talents (ability_role class_talent), exploits, and upgrades. Distinguish Discipline Talents vs Class Talents category/resourceKey. Set source_type and source_name consistently. Keep spend phrasing (expend N psi points, expend one Exploit Die). See Custom ability library structure examples.",
  all: "Extract any content types present. Prefer one primary type per response when the source is focused.",
}

export type ByoPdfPageScope =
  | { mode: "all" }
  | { mode: "range"; start: number; end: number }

export type ByoExtractionPromptOptions = {
  /** Include PDF upload workflow instructions and page scope. */
  pdfUpload?: boolean
  pageScope?: ByoPdfPageScope
  /** Optional labels for custom ability libraries and class resource pools. */
  customSystems?: CustomSystemsImportHints
  /** Optional match to an existing subclass (locks class_name / name in the prompt). */
  subclassMatch?: SubclassMatchImportHint | null
}

function formatPdfUploadBlock(pageScope?: ByoPdfPageScope): string {
  const scopeLine =
    pageScope?.mode === "range"
      ? `Page scope: Prefer extracting from PDF pages ${pageScope.start}–${pageScope.end} (1-based, inclusive). If that span is a class chapter, include the core class and its subclasses together. Tighten the range only when you intentionally want a subset (e.g. one subclass) or to exclude a different class.`
      : "Page scope: Extract from the uploaded PDF. Prefer one class chapter at a time when the book has multiple classes; include that class and its subclasses in the same extraction."

  return `PDF upload workflow

Upload the source PDF to your LLM together with this prompt (attach the file in ChatGPT, Claude, Gemini, etc.).

${scopeLine}

Include source_page (1-based PDF page number) on each feature, trait, spell, feat, ability, and similar entry when you can identify the page. Omit source_page when unknown.`
}

export const IMPORT_JSON_TEMPLATES: Record<ImportContentTypeHint, object> = {
  all: {
    classes: [
      {
        name: "Fighter",
        description: "A master of weapons and armor.",
        hit_die: 10,
        primary_ability: ["Strength", "Dexterity"],
        saving_throws: ["Strength", "Constitution"],
        armor_proficiencies: ["All armor", "Shields"],
        weapon_proficiencies: ["Simple weapons", "Martial weapons"],
        skill_choices: { count: 2, options: ["Athletics", "Perception"] },
        features: [
          {
            level: 1,
            name: "Fighting Style",
            description:
              "You gain a Fighting Style feat of your choice. If you choose a feat that requires a melee weapon, you can use it with ranged weapons.",
            mechanics: [
              {
                kind: "grant_feat",
                featCategories: ["Fighting Style"],
                featCount: 1,
                sourcePhrase: "You gain a Fighting Style feat of your choice.",
                confidence: "high",
              },
            ],
          },
        ],
      },
    ],
  },
  classes: {
    classes: [
      {
        name: "Fighter",
        description: null,
        hit_die: 10,
        primary_ability: ["Strength", "Dexterity"],
        saving_throws: ["Strength", "Constitution"],
        features: [{ level: 1, name: "Second Wind", description: "Regain hit points as a bonus action." }],
      },
    ],
    class_resources: [
      {
        class_name: "Fighter",
        resource_key: "second_wind",
        name: "Second Wind",
        description: "Uses per rest from the class table.",
        uses: { type: "at_level", atLevelMode: "tier", atLevelTable: [{ level: 1, count: 1 }] },
      },
    ],
  },
  subclasses: {
    subclasses: [
      {
        name: "Champion",
        class_name: "Fighter",
        description: "A simple martial subclass.",
        features: [
          {
            level: 3,
            name: "Improved Critical",
            description: "Your weapon attacks score a critical hit on a roll of 19 or 20.",
          },
        ],
      },
    ],
  },
  species: {
    species: [
      {
        name: "Elf",
        description: "An agile people of otherworldly grace.",
        speed: 30,
        size: "Medium",
        traits: [{ name: "Darkvision", description: "You can see in dim light within 60 feet." }],
      },
    ],
  },
  backgrounds: {
    backgrounds: [
      {
        name: "Soldier",
        description: "You served in an army.",
        skill_proficiencies: ["Athletics", "Intimidation"],
        feat_granted: "Savage Attacker",
        ability_bonuses: { strength: 0, constitution: 0 },
        feature: { name: "Military Rank", description: "You have a rank from your service." },
      },
      {
        name: "Tinker",
        description: "You build and repair contraptions.",
        skill_proficiencies: ["Investigation", "Persuasion"],
        tool_proficiencies: ["Tinker's tools"],
        feat_granted: null,
        ability_bonuses: null,
        proficiencies: { languages: ["One language of your choice"] },
        starting_gold: 10,
        starting_equipment: [
          { name: "Tinker's tools", quantity: 1 },
          { name: "Pack horse", quantity: 1 },
        ],
        feature: { name: "Tinker", description: "You can repair devices." },
      },
    ],
  },
  spells: {
    spells: [
      {
        name: "Fireball",
        level: 3,
        school: "Evocation",
        casting_time: "1 action",
        range: "150 feet",
        components: ["V", "S", "M"],
        duration: "Instantaneous",
        concentration: false,
        description: "A bright streak flashes to a point you choose within range.",
        classes: ["Sorcerer", "Wizard"],
      },
      {
        name: "Temporal Stitch",
        level: 2,
        school: "Chronomancy",
        casting_time: "1 action",
        range: "Touch",
        components: ["V", "S"],
        duration: "Concentration, up to 1 minute",
        concentration: true,
        description: "You briefly rewind a wound on a creature you touch.",
        classes: ["Wizard"],
      },
    ],
  },
  spell_lists: {
    classes: [
      {
        name: "Artificer",
        description: null,
        hit_die: 8,
        spell_list: ["Acid Splash", "Cure Wounds", "Mending"],
      },
    ],
    spells: [
      {
        name: "Acid Splash",
        level: 0,
        school: "Evocation",
        concentration: false,
        components: null,
        classes: ["Artificer"],
      },
      {
        name: "Cure Wounds",
        level: 1,
        school: "Abjuration",
        concentration: false,
        components: null,
        classes: ["Artificer"],
      },
    ],
  },
  feats: {
    feats: [
      {
        name: "Archery",
        description: "You gain a +2 bonus to attack rolls with ranged weapons.",
        prerequisite: "Dexterity 13 or higher",
        category: "Fighting Style",
      },
    ],
  },
  equipment: {
    equipment: [
      {
        name: "Longsword",
        category: "Weapon",
        subcategory: "Martial Melee",
        description: null,
        cost: { amount: 15, unit: "GP" },
        weight: 3,
        properties: { damage: "1d8 slashing", properties: ["Versatile"] },
      },
      {
        name: "Amulet of Retributive Healing",
        category: "Other",
        magic_item_category: "Wondrous Item",
        rarity: "Rare",
        requires_attunement: true,
        subcategory: null,
        description:
          "This amulet has 3 charges and regains 1d3 expended charges daily at dawn. When you restore Hit Points to one other creature, you can expend 1 charge to regain the same amount of Hit Points.",
        cost: null,
        weight: null,
        properties: null,
      },
    ],
  },
  abilities: {
    import_proposals: {
      custom_abilities: [
        {
          proposal_id: "enhancement_discipline",
          name: "Enhancement Discipline",
          ability_role: "discipline",
          definition:
            "Discipline package with Enhancing Skill; talent options; Alternate Effects. Power: Enhancing Surge (separate row).",
          description:
            "<p>Enhancement is the ability to interact with a creature's nature and abilities with your psionic power.</p><p><strong>Enhancing Skill:</strong> Whenever you make an ability check using Strength or Dexterity, you can add 1d4 to the result.</p>",
          choices: {
            category: "Discipline Talents",
            count: 1,
            options: [
              {
                name: "Body Control",
                prerequisite: "5th-level Psion",
                description: "You can cast alter self at will, without expending a spell slot or psi points.",
              },
              {
                name: "Enhanced Regrowth",
                description: "You gain the cure wounds spell, and can cast it by expending psi points.",
              },
            ],
          },
          source_type: "class",
          source_name: "Psion",
          level_requirement: 1,
        },
        {
          proposal_id: "enhancing_surge",
          name: "Enhancing Surge",
          ability_role: "psionic_power",
          definition: "Psionic power from Enhancement Discipline.",
          description:
            "<p>You empower the body of a target creature you can see with your psionics.</p><p>You can spend psi points up to your per use limit to add the following modifiers to Enhancing Surge (you can add multiple modifiers).</p><ul><li><strong>Fortifying (1+ psi points):</strong> The target gains an extra 1d6 temporary hit points for each point spent.</li><li><strong>Resilient (3 psi points):</strong> The target gains resistance to all damage until the start of your next turn.</li></ul>",
          casting_time: "1 action",
          range: "60 feet",
          components: ["S"],
          duration: "1 round",
          concentration: false,
          source_type: "class",
          source_name: "Psion",
          level_requirement: 1,
        },
        {
          proposal_id: "inland_eye",
          name: "Inland Eye",
          ability_role: "class_talent",
          definition: "Class-level talent (not gated by a specific discipline).",
          description: "<p>You gain blindsight out to a short range while concentrating on a psionic power.</p>",
          prerequisite: "5th-level Psion",
          source_type: "class",
          source_name: "Psion",
          level_requirement: 5,
        },
        {
          proposal_id: "crushing_grip",
          name: "Crushing Grip",
          definition: "1st-degree exploit. Expend one Exploit Die on a successful Grapple.",
          description:
            "<p><strong>Execution:</strong> On a successful Grapple</p><p><strong>Prerequisites:</strong> Strength 11, Athletics</p><p>When you Grapple a target, you can expend one Exploit Die to enhance your grip…</p>",
          execution: "On a successful Grapple",
          prerequisite: "Strength 11, Athletics",
          eligible_classes: ["Barbarian", "Fighter"],
          source_type: "compendium",
          source_name: null,
          level_requirement: 2,
        },
        {
          proposal_id: "gadgetsmith_airburst_mine",
          name: "Airburst Mine",
          ability_role: "upgrade",
          definition: "Gadgetsmith unrestricted upgrade gadget.",
          description:
            "You create a mechanical device capable of producing a devastating blast. Once used, this gadget can't be used again until you finish a short or long rest.",
          source_type: "subclass",
          source_name: "Gadgetsmith",
          level_requirement: 3,
          repeatable: false,
        },
      ],
    },
    class_resources: [
      {
        class_name: "Psion",
        resource_key: "psi_points",
        name: "Psi Points",
        description: "Spendable pool for psionic powers and alternate effects.",
        uses: {
          type: "at_level",
          atLevelMode: "tier",
          atLevelTable: [{ level: 1, count: 1 }],
          recharges: ["short_rest", "long_rest"],
        },
      },
      {
        class_name: "Psion",
        resource_key: "psi_limit",
        name: "Psi Limit",
        description: "Maximum psi points you can spend on a single use.",
        uses: {
          type: "special",
          atLevelMode: "tier",
          atLevelTable: [{ level: 1, count: 1 }],
        },
      },
    ],
  },
}

function resolveHint(contentTypeHint?: string | null): ImportContentTypeHint {
  if (
    contentTypeHint &&
    contentTypeHint in IMPORT_JSON_TEMPLATES &&
    contentTypeHint !== "all"
  ) {
    return contentTypeHint as ImportContentTypeHint
  }
  return "all"
}

export function buildByoExtractionPrompt(
  contentTypeHint?: string | null,
  options?: ByoExtractionPromptOptions,
): string {
  const hint = resolveHint(contentTypeHint)
  const focus = CONTENT_TYPE_JSON_FOCUS[hint] ?? CONTENT_TYPE_JSON_FOCUS.all ?? ""
  const template = JSON.stringify(IMPORT_JSON_TEMPLATES[hint], null, 2)

  const sections = [
    buildImportSystemPrompt(contentTypeHint, {
      customSystems: options?.customSystems,
      subclassMatch: options?.subclassMatch,
    }),
  ]

  if (options?.pdfUpload) {
    sections.push("", formatPdfUploadBlock(options.pageScope))
  }

  sections.push(
    "",
    CLEAN_SOURCE_TEXT_GUIDELINES,
    "",
    focus,
    "",
    JSON_OUTPUT_RULES,
    "",
    "Example JSON shape (fill with extracted content; adjust or omit arrays you do not need):",
    template,
  )

  return sections.join("\n")
}

export function buildByoFullPrompt(
  sourceText: string,
  contentTypeHint?: string | null,
  options?: ByoExtractionPromptOptions,
): string {
  const trimmed = sourceText.trim()
  const instructions = buildByoExtractionPrompt(contentTypeHint, options)
  if (!trimmed) return instructions
  return `${instructions}\n\n---\n\nSource text to extract:\n\n${trimmed}`
}

export function downloadTemplateFilename(contentTypeHint?: string | null): string {
  const hint = resolveHint(contentTypeHint)
  return `dump-stat-import-template-${hint}.json`
}

export function templateJsonString(contentTypeHint?: string | null): string {
  const hint = resolveHint(contentTypeHint)
  return JSON.stringify(IMPORT_JSON_TEMPLATES[hint], null, 2)
}
