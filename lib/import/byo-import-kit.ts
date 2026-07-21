import { buildImportSystemPrompt } from "@/lib/import/import-system-prompt"
import type { ImportContentTypeHint } from "@/lib/import/content-type-hints"
import type { CustomSystemsImportHints } from "@/lib/import/custom-systems-import-hints"
import type { SubclassMatchImportHint } from "@/lib/import/subclass-match-import-hints"
import {
  PASTED_SOURCE_TEXT_MAX_CHARS,
  SPELLS_PDF_MAX_PAGES,
  maxPdfPagesForContentTypeHint,
} from "@/lib/import/import-source-limits"

export const CLEAN_SOURCE_TEXT_GUIDELINES = `Preparing clean source text (from PDF or web)

For best extraction results, your source text should:
- One class per pass only (that class + its subclasses is OK). Never extract multiple unrelated classes in one JSON
- Libraries before class: full homebrew spell write-ups, psionic disciplines/powers, exploit lists, and similar pickers first — then the class chapter. Include that class's Spell / School / Special list in the same class pass when present (spell_list + spells[] stubs)
- Prefer one class chapter per class pass: the core class and its subclasses together in the same JSON (staged review covers them in order). Do not leave archetypes for a later Subclasses-only pass unless the parent class is already imported
- Happy path for multi-file kits: extract the library, extract the class chapter, then paste both as one JSON array in Step 2 (libraries are auto-sorted before the class)
- Keep level progression tables in the source so the importer can read features and class_resources[] from them
- Do NOT paste HTML level tables into classes[].description — put rules prose only; features go in features[] and pools (Ki, Rage, Sorcery Points, etc.) in class_resources[]
- Keep feature headings with their full description paragraphs (e.g. "Fighting Style" followed by rules text)
- Preserve mechanical sentences in descriptions (proficiencies, AC formulas, resistances, limited uses, feat grants) so Common Modifiers auto-wire; add mechanics[] when phrasing is non-standard
- Omit chapter running heads, page numbers, and nav ribbons from pasted text when you can — never leave them in description fields
- Preserve HTML <table> blocks for subclass spell lists in feature descriptions when present. If the source text lost its whitespace/line breaks (common with PDF copy-paste, e.g. "Cleric LevelPrepared Spells3Aid, Bless, Cure Wounds5Mass Healing Word..." with no gap between the level number and the spell names), reconstruct it into a real <table> with one <tr> per class level rather than pasting the squished run of text — the importer cannot reliably re-split a level number from a spell name without a delimiter
- Use a single class or subclass name consistently (match SRD names when importing into an SRD-seeded compendium; for homebrew use the source's own header name, not a designer-prefixed invention)
- Avoid mixing unrelated chapters (equipment tables + feats + multiple unrelated classes in one paste)
- Stay under ${PASTED_SOURCE_TEXT_MAX_CHARS.toLocaleString()} characters of pasted source text so Plus-tier ChatGPT, Claude, and Gemini can take the combined prompt (about one class chapter or a short spell batch)

Schema fit — stop and warn the user (plain language, not JSON) when the upload will not extract cleanly:
- Whole-book / multi-class PDF for a focused content type → ask them to page-range one class chapter or one library section
- Full spell write-ups embedded in a Class extract (beyond list stubs) → ask them to extract Spells separately first, then the class chapter with list stubs only
- Weapons + homebrew masteries + feats mashed together → ask them to split: masteries as Custom Abilities / Weapon Mastery Properties, then Equipment
- Image-only scanned PDF without OCR → ask for OCR text or a vector PDF paste
- Do not invent oversized JSON that crams mismatched chapters into one schema

PDF tips:
- Copy text from a vector PDF when possible; scanned images need OCR first
- Page headers/footers are OK — importers strip obvious boilerplate
- Page ranges: skip other classes, or isolate a library section (e.g. Psionic Disciplines) before the class chapter — do not use them to split a class from its own subclasses
- Spell PDF imports: at most ${SPELLS_PDF_MAX_PAGES} pages per pass
- Class PDFs with a level table plus feature sections often parse with zero AI when structure is clean
- Some homebrew PDFs (notably LaserLlama) paste ALL-CAPS labels with every letter doubled — e.g. "S ST T R R" / "T TR RA AI IT TS S". Prefer fixing those in the paste when you notice them; the extraction prompt also tells the LLM to collapse them to "STR" / "TRAITS" (ALL-CAPS runs only)
- KibblesTasty and similar sources often mark custom entries with a superscript letter (commonly K) that pastes as a trailing capital on the name — e.g. "Returning WeaponK". Fix or let the LLM strip those before import; check spell/feat/feature names especially

Multi-file homebrew (spellcasters, psionics, martial exploits, and similar):
- Happy path: two extracts → one Step 2 paste (JSON array). Import supporting libraries before the class that references them, then one class chapter (core + all subclasses), then any leftover custom systems — or paste library + class objects together and let Dump Stat auto-order
- Warmage: import Warmage-exclusive cantrips (full write-ups are fine) before or with Tricks so prereqs like "Force Buckler cantrip" resolve — names must exist in the library; stubs are not required if the spell entry is complete
- Same-name classes (e.g. Mage Hand Press Warden vs KibblesTasty Warden): keep the source header name in JSON; Dump Stat's collision UI will ask the user what to rename the class to (suggestion shown as a placeholder) — do not invent a designer prefix in the LLM extract
- Homebrew weapon masteries (Parry, Shift, Explode, …): extract as a separate Custom Abilities pass that extends Weapon Mastery Properties, then import weapons with properties.mastery set to those names
- You can paste a JSON array of import objects in one run — Dump Stat merges them before wiring modifiers (libraries sorted first; keep subclasses[] with the class object)
- SRD spell names resolve from your seeded compendium; only import homebrew spells for non-SRD names`

const JSON_OUTPUT_RULES = `Output format (required)

If the source does not fit this content type / schema (whole book, multi-class PDF, spell chapter inside a class pass, etc.), do NOT invent JSON — reply in plain language telling the user how to split or re-scope the upload.
Otherwise return ONLY valid JSON — no markdown fences, no commentary before or after.
Use null for optional fields you do not have data for.
Omit empty top-level arrays entirely, or set them to null.
Do NOT output linkedModifiers or modifierRefs — Dump Stat wires Common Modifiers at import from description phrasing (and optional mechanics[]) on features, traits, feats, equipment, and abilities.
Optionally add mechanics[] on features, traits, feats, or abilities for explicit modifier hints when phrasing is non-standard (see Common Modifier wiring).
When extracting from a PDF, add source_page (integer, 1-based PDF page) on features[], traits[], spells[], feats[], and abilities[] when identifiable. Omit when unknown.`

const CONTENT_TYPE_JSON_FOCUS: Partial<Record<ImportContentTypeHint, string>> = {
  classes:
    "Focus on classes[] and class_resources[] when present. Always include that class's subclasses/archetypes/paths in subclasses[] in the same JSON (class_name must match classes[].name). Use top-level armor_proficiencies and weapon_proficiencies arrays — never nest them under a proficiencies object (that field is ignored on classes). Include hit_die, saving_throws, and skill_choices from the Skills line (count + options; use fixed for always-granted skills like Psionics). Put flavor/rules prose in description only — not the level progression table (features and resource columns are extracted separately). Archetype unlock features (Psionic Archetype, Martial Archetype, etc.) are short unlock prose only — do NOT put isChoice stub options listing archetype names; real archetypes go in subclasses[]. Secondary/Third Discipline (Psion) must be isChoice with choices.category \"Psionic Discipline\" and empty options[] (optionsSource is filled on import). Psionic Talents uses choices.category \"Psionic Talent\" and empty options[] — do not set optionsSource to class_talents. Wire Common Modifiers via description phrasing and optional mechanics[] on each feature. If the source includes a dedicated class spell list (Spell / School / Special tables), also populate that class's spell_list and matching spells[] stubs in the same JSON (school string required — use \"Unknown\" when the list has no school column; concentration boolean required — default false).",
  subclasses:
    "Use this focus only when adding archetypes to a parent class that is already in the compendium (or when the user explicitly asked for subclasses alone). Prefer extracting a full class chapter with content type Class + subclasses instead — core class and archetypes in one JSON. Focus on subclasses[] with class_name matching the parent classes[].name exactly, features[] by level for EVERY archetype named in the chapter (do not omit optional/appendix minds), and spell tables in feature descriptions when present. When a feature offers mutually exclusive subtype spell lists (Circle of the Land land types, similar circles/domains), emit isChoice + one option per subtype with that subtype's HTML spell table in the option description. For Elemental Mind Primordial Aspect, emit new_toggles with primordial_aspect_cold, primordial_aspect_fire, and primordial_aspect_lightning — never a single primordial_aspect key.",
  species: "Focus on species[] with traits[] (name, description; isChoice + choices when applicable).",
  backgrounds:
    "Focus on backgrounds[] with skill_proficiencies, tool_proficiencies / proficiencies.languages, starting_equipment_groups for Choose A/B (one group with description + options[{label,items}], never a flat [{label,items}] array), prerequisite_rules for campaign gates, feat_granted, ability_bonuses, optional source, and feature. For Dark Gift backgrounds keep feat_granted phrasing like \"Choose one Dark Gift feat\" or \"Survivor or a Dark Gift feat of your choice\" (never collapse the or-choice; never null out Dark Gift-only grants when ASI is present). For a fixed skill plus a faction/unrestricted fallback, include \"One skill of your choice\" in skill_proficiencies and preserve the faction table in description. ability_bonuses keys must be only strength|dexterity|constitution|intelligence|wisdom|charisma (never invent keys like desktop). Keep skill/tool/language choice phrasing (Dump Stat wires pickers). Legacy pre-2024 backgrounds use ability_bonuses: null and feat_granted: null.",
  spells:
    "Focus on spells[] with level, school, casting_time, range, components, duration, concentration, description. Preserve novel/homebrew schools as written (e.g. Duromancy, Chronomancy, Void Magic, Blood Magic / Sangromancy); do not invent schools for ordinary SRD spells.",
  feats: "Focus on feats[] with category (Origin, Dark Gift, General, Fighting Style, Epic Boon, Planar Pact) when known. Ravenloft Dark Gifts → Dark Gift, never Planar Pact.",
  creatures:
    "Focus on creatures[] (Creatures & Companions) using schema v2.0 when possible. Set category to \"creature\" (fixed CR/XP/PB) or \"companion\" (scales with a caregiver/owner level — no CR). For creatures populate cr, xp, proficiency_bonus, numeric ac/hp strings, ability_scores with mod/save strings, senses object, and traits/actions arrays. For companions set scaling: { scales_with, notes }, keep formula text in ac/hp (e.g. \"15 plus PB\", \"7 + 7 times caregiver's level\"), and use unlock_level_label/unlock_level_number/tag on leveled actions. Prefer Creatures terminology (never \"monsters\" as the section name). Features that grant a companion should also emit mechanics: [{ kind: \"grant_creature\", creatureNames: [\"Wolf\"] }].",
  equipment:
    "Focus on equipment[] with category (Weapon, Armor, Adventuring Gear, Tool, Mount, Vehicle, Trade Good, or Other for magic items without a mundane type), magic_item_category (Wondrous Item, Ring, Potion, etc.), rarity, requires_attunement, cost { amount, unit } or null when no price, weight, and properties (weapon/armor stats only — put rarity and attunement on top-level fields, not in properties). Weapons: set properties.mastery to the mastery name string (Cleave, Explode, …). Switch/transforming weapons: properties.forms[] with one object per form (name, damage, properties, mastery). Novel non-SRD weapon properties (Firearm, Reload, Misfire, …) go as string tags in properties.properties[] — Dump Stat stores them as tags for display without full structured simulation. Homebrew masteries should be imported separately first as Custom Abilities that extend the Weapon Mastery Properties catalog so sheet tooltips resolve; if only weapons are imported, non-SRD mastery names still show on items but may lack rule text until that catalog pass.",
  abilities:
    "Focus on custom ability libraries and class_resources[]. Split hierarchy (do not mash): category label (not a row) → mid-level packages → leaf powers / class_talent rows + nested Discipline Talents in choices. Prefer import_proposals.custom_abilities[] for discipline packages (ability_role discipline), psionic powers (ability_role psionic_power — NOT spells[]), class-level/feat-gated talents (ability_role class_talent), exploits, and upgrades. Distinguish Discipline Talents vs Class Talents category/resourceKey. Set source_type and source_name consistently. Keep spend phrasing (expend N psi points, expend one Exploit Die). Psionic power bodies (ability_role psionic_power): keep the augment gate sentence verbatim ('You can spend psi points up to your per-use limit to add multiple modifiers') and each augment as a '<strong>Name (N psi points):</strong> …' list item — the importer parses those into selectable augments; do NOT add a base psi cost to augmented powers (base use is free) and do not expect passive modifier wiring from a power's own effect text. Talent/discipline rows DO phrase-wire: keep sentences like 'You can cast X by expending N psi points', 'The X and Y spells are added to your … Alternate Effects list', 'Once you do, you can't do so again until you finish a long rest' intact. Default Alternate Effects tables MUST stay as HTML <table> with columns 'Point Cost' | 'Alternate Effects' (spell names comma-separated) — the importer wires every listed spell as known (cast via psi points). Specializations that replace Alternate Effects: prefer specialization_choices with one option per specialization and that option's replacement HTML table in its description (keep talents in choices). Fallback: Specializations heading + bold names + replacement tables/prose cost lists in the package description. See Custom ability library structure examples. Homebrew weapon masteries (Parry, Shift, Explode, …): emit one custom_abilities[] / import_proposals.custom_abilities[] row per mastery with name + rule description so they merge into the Weapon Mastery Properties catalog — do this in a separate pass before (or with) the Equipment weapons table; do not bury mastery write-ups only inside weapon rows.",
  invocations_metamagic:
    "Focus on Eldritch Invocation, Metamagic, Warmage Tricks, and similar pick-from-a-list option libraries. Route through the same custom abilities pipeline: one import_proposals.custom_abilities[] row per option (not section headers). Prefer ability_role knack when the class selects from a known pool (wire granting features with optionsSource class_knacks); otherwise omit ability_role. Always put Prerequisite/Prerequisites lines into prerequisite (cantrips, Level N+ class, subclass names, prior options) — Dump Stat gates picks against known spells, level, and subclass. Do not put these in feats[] or spells[].",
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
  /** Content-type hint used for page caps (e.g. spells → 15 pages). */
  contentTypeHint?: string | null
}

function formatPdfUploadBlock(
  pageScope?: ByoPdfPageScope,
  contentTypeHint?: string | null,
): string {
  const maxPages = maxPdfPagesForContentTypeHint(contentTypeHint)
  const scopeLine =
    pageScope?.mode === "range"
      ? `Page scope: Prefer extracting from PDF pages ${pageScope.start}–${pageScope.end} (1-based, inclusive). If that span is a class chapter, include the core class and its subclasses together. Tighten the range only when you intentionally want a subset (e.g. one subclass) or to exclude a different class.${
          maxPages != null
            ? ` Do not process more than ${maxPages} pages in this pass (${pageScope.end - pageScope.start + 1} pages selected).`
            : ""
        }`
      : maxPages != null
        ? `Page scope: Spell imports are limited to ${maxPages} pages per pass. Extract only a contiguous ${maxPages}-page window (or fewer); do not process the entire PDF if it is longer.`
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
    // Homebrew class kit: library slots + class chapter in one object (or paste
    // [libraryObject, thisObject] — Dump Stat merges and auto-orders).
    abilities: [],
    import_proposals: { custom_abilities: [], class_resources: [] },
    spells: [],
    classes: [
      {
        name: "Fighter",
        description: null,
        hit_die: 10,
        primary_ability: ["Strength", "Dexterity"],
        saving_throws: ["Strength", "Constitution"],
        skill_choices: {
          count: 2,
          options: ["Acrobatics", "Athletics", "History", "Insight", "Perception", "Survival"],
        },
        features: [{ level: 1, name: "Second Wind", description: "Regain hit points as a bonus action." }],
      },
    ],
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
        tool_proficiencies: ["Choose one kind of Gaming Set"],
        feat_granted: "Savage Attacker",
        ability_bonuses: { strength: 0, dexterity: 0, constitution: 0 },
        starting_equipment_groups: [
          {
            description: "Choose A or B:",
            options: [
              {
                label: "A",
                items: [
                  { name: "Spear", quantity: 1 },
                  { name: "Gaming Set", quantity: 1 },
                  { name: "Traveler's Clothes", quantity: 1 },
                  { name: "Gold Pieces", quantity: 14 },
                ],
              },
              {
                label: "B",
                items: [{ name: "Gold Pieces", quantity: 50 }],
              },
            ],
          },
        ],
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
  creatures: {
    creatures: [
      {
        name: "Wolf",
        creature_type: "Beast",
        size: "Medium",
        alignment: "Unaligned",
        category: "creature",
        cr: "1/4",
        xp: 50,
        proficiency_bonus: "+2",
        scaling: null,
        ac: "12",
        ac_note: null,
        initiative_modifier: "+2",
        initiative_passive: 12,
        hp: "11",
        hit_dice: "2d8 + 2",
        speed: { walk: 40, fly: null, swim: null, climb: null, burrow: null, notes: null },
        ability_scores: {
          str: { score: 14, mod: "+2", save: "+2" },
          dex: { score: 15, mod: "+2", save: "+2" },
          con: { score: 12, mod: "+1", save: "+1" },
          int: { score: 3, mod: "-4", save: "-4" },
          wis: { score: 12, mod: "+1", save: "+1" },
          cha: { score: 6, mod: "-2", save: "-2" },
        },
        skills: "Perception +5, Stealth +4",
        proficiencies: null,
        gear: null,
        resistances: null,
        damage_immunities: null,
        condition_immunities: null,
        vulnerabilities: null,
        senses: {
          darkvision: 60,
          blindsight: null,
          tremorsense: null,
          truesight: null,
          passive_perception: 15,
        },
        languages: "None",
        traits: [
          {
            unlock_level_label: null,
            unlock_level_number: null,
            name: "Pack Tactics",
            tag: null,
            text: "The wolf has Advantage on attack rolls against a creature if at least one of the wolf's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition.",
          },
        ],
        actions: [
          {
            unlock_level_label: null,
            unlock_level_number: null,
            name: "Bite",
            tag: null,
            text: "Melee Attack Roll: +4, reach 5 ft. Hit: 5 (1d6 + 2) Piercing damage.",
          },
        ],
        bonus_actions: null,
        reactions: null,
        legendary_actions: null,
        description:
          "Wolf\nMedium Beast, Unaligned\nAC 12 Initiative +2 (12)\nHP 11 (2d8 + 2)\nSpeed 40 ft.\nTraits\nPack Tactics. …\nActions\nBite. …",
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
          recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
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
  invocations_metamagic: {
    import_proposals: {
      custom_abilities: [
        {
          proposal_id: "agonizing_blast",
          name: "Agonizing Blast",
          definition: "Eldritch Invocation option.",
          description:
            "Choose one of your known warlock cantrips that deals damage. You can add your Charisma modifier to that spell's damage rolls.",
          source_type: "class",
          source_name: "Warlock",
          level_requirement: 1,
          prerequisite: "eldritch blast cantrip",
        },
        {
          proposal_id: "careful_spell",
          name: "Careful Spell",
          definition: "Metamagic option.",
          description:
            "When you cast a spell that forces other creatures to make a saving throw, you can protect some of those creatures from the spell's full force. To do so, you spend 1 sorcery point and choose a number of those creatures up to your Charisma modifier (minimum of one creature).",
          source_type: "class",
          source_name: "Sorcerer",
          level_requirement: 2,
        },
      ],
    },
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
    sections.push(
      "",
      formatPdfUploadBlock(options.pageScope, contentTypeHint ?? options.contentTypeHint),
    )
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
