import {
  normalizeModifierCatalog,
  type ModifierCatalogEntry,
} from "@/lib/compendium/modifier-catalog"

/** System-owned Metamagic option templates (PHB pp. 66–67). */
export const METAMAGIC_OPTIONS_CATALOG_ID = "00000000-0000-4000-8000-000000000002"

export const METAMAGIC_OPTIONS_CATALOG_NAME = "Metamagic Options"

export const METAMAGIC_OPTIONS_CATALOG_INFO =
  "Reusable Metamagic option templates for the Sorcerer. Link from the Metamagic class feature or spend Sorcery Points via Font of Magic."

/** System-owned Eldritch Invocation templates (PHB pp. 72–74). */
export const ELDRITCH_INVOCATIONS_CATALOG_ID = "00000000-0000-4000-8000-000000000003"

export const ELDRITCH_INVOCATIONS_CATALOG_NAME = "Eldritch Invocations"

export const ELDRITCH_INVOCATIONS_CATALOG_INFO =
  "Reusable Eldritch Invocation templates for the Warlock. Link from the Eldritch Invocations class feature via grant-feat or option picks."

export const SYSTEM_OPTION_CATALOG_IDS = [
  METAMAGIC_OPTIONS_CATALOG_ID,
  ELDRITCH_INVOCATIONS_CATALOG_ID,
] as const

function optionEntry(
  id: string,
  name: string,
  summary: string,
  description: string,
  group = "Options",
): ModifierCatalogEntry {
  return {
    id,
    name,
    group,
    summary,
    description: `<p>${description}</p>`,
    characteristics: [],
    activation: null,
  }
}

export function buildDefaultMetamagicOptions(): ModifierCatalogEntry[] {
  const entries: Omit<ModifierCatalogEntry, "id">[] = [
    {
      name: "Careful Spell",
      group: "Metamagic",
      summary: "Cost: 1 SP · Allies auto-succeed on saves for your spell",
      description:
        "When you cast a spell that forces other creatures to make a saving throw, you can protect some of those creatures. Spend 1 Sorcery Point and choose a number of creatures up to your Charisma modifier. Those creatures automatically succeed on their saves.",
    },
    {
      name: "Distant Spell",
      group: "Metamagic",
      summary: "Cost: 1 SP · Double range or touch → 30 ft.",
      description:
        "When you cast a spell that has a range of at least 5 feet, you can spend 1 Sorcery Point to double the range. Or when you cast a spell that has a range of touch, you can spend 1 Sorcery Point to make its range 30 feet.",
    },
    {
      name: "Empowered Spell",
      group: "Metamagic",
      summary: "Cost: 1 SP · Reroll damage dice",
      description:
        "When you roll damage for a spell, you can spend 1 Sorcery Point to reroll a number of the damage dice up to your Charisma modifier, and you must use the new rolls.",
    },
    {
      name: "Extended Spell",
      group: "Metamagic",
      summary: "Cost: 1 SP · Double duration (up to 24 hours)",
      description:
        "When you cast a spell that has a duration of 1 minute or longer, you can spend 1 Sorcery Point to double its duration, to a maximum of 24 hours.",
    },
    {
      name: "Seeking Spell",
      group: "Metamagic",
      summary: "Cost: 2 SP · Negate disadvantage on spell attack",
      description:
        "If you make an attack roll for a spell and have Disadvantage, you can spend 2 Sorcery Points to cancel the Disadvantage.",
    },
    {
      name: "Subtle Spell",
      group: "Metamagic",
      summary: "Cost: 1 SP · Cast without verbal or somatic components",
      description:
        "When you cast a spell, you can spend 1 Sorcery Point to cast it without Verbal or Somatic components.",
    },
    {
      name: "Transmuted Spell",
      group: "Metamagic",
      summary: "Cost: 1 SP · Change spell damage type",
      description:
        "When you cast a spell that deals damage, you can spend 1 Sorcery Point to change the damage type to Acid, Cold, Fire, Lightning, Poison, or Thunder.",
    },
    {
      name: "Twinned Spell",
      group: "Metamagic",
      summary: "Cost: spell level SP · Target a second creature",
      description:
        "When you cast a spell that can target only one creature and doesn't have a range of self, you can spend Sorcery Points equal to the spell's level to target a second creature within range.",
    },
  ]
  return entries.map((entry, index) =>
    optionEntry(`cat_metamagic_${index}`, entry.name, entry.summary!, entry.description!, entry.group as string),
  )
}

export function buildDefaultEldritchInvocations(): ModifierCatalogEntry[] {
  const names = [
    ["Agonizing Blast", "Add Charisma modifier to Eldritch Blast damage"],
    ["Armor of Shadows", "Cast Mage Armor at will without a spell slot"],
    ["Devil's Sight", "See through magical and nonmagical darkness 120 ft."],
    ["Eldritch Mind", "Advantage on Constitution saves to maintain Concentration"],
    ["Eldritch Spear", "Eldritch Blast range +300 ft."],
    ["Fiendish Vigor", "Cast False Life at will (1d4 + level temp HP)"],
    ["Mask of Many Faces", "Cast Disguise Self at will"],
    ["Misty Visions", "Cast Silent Image at will"],
    ["Repelling Blast", "Push target 10 ft. on Eldritch Blast hit"],
    ["Thirsting Blade", "Extra Attack with pact weapon"],
    ["Trickster's Escape", "Cast Invisibility as a Reaction when hit"],
    ["Visions of Distant Realms", "Cast Arcane Eye at will"],
  ] as const
  return names.map(([name, summary], index) =>
    optionEntry(
      `cat_invocation_${index}`,
      name,
      summary,
      `${name}: ${summary}. Configure full rules in the description when linking to a Warlock feature.`,
      "Invocations",
    ),
  )
}

export function getSystemCatalogMeta(id: string): { name: string; info: string } | null {
  if (id === METAMAGIC_OPTIONS_CATALOG_ID) {
    return { name: METAMAGIC_OPTIONS_CATALOG_NAME, info: METAMAGIC_OPTIONS_CATALOG_INFO }
  }
  if (id === ELDRITCH_INVOCATIONS_CATALOG_ID) {
    return { name: ELDRITCH_INVOCATIONS_CATALOG_NAME, info: ELDRITCH_INVOCATIONS_CATALOG_INFO }
  }
  return null
}

export function isSystemCatalogEditor(id: string): boolean {
  return SYSTEM_OPTION_CATALOG_IDS.includes(id as (typeof SYSTEM_OPTION_CATALOG_IDS)[number])
}

export function isSystemOptionCatalogId(id: string): boolean {
  return (SYSTEM_OPTION_CATALOG_IDS as readonly string[]).includes(id)
}

export function buildMetamagicOptionsCatalogRow(): Record<string, unknown> {
  return {
    id: METAMAGIC_OPTIONS_CATALOG_ID,
    name: METAMAGIC_OPTIONS_CATALOG_NAME,
    description: `<p>${METAMAGIC_OPTIONS_CATALOG_INFO}</p>`,
    characteristics: [],
    modifier_catalog: buildDefaultMetamagicOptions(),
    prerequisites: null,
    attached_to_type: null,
    attached_to_id: null,
    uses: null,
    show_in_builder: false,
    is_system: true,
    icon: "sparkles",
    source: "System",
    creator_url: null,
    enabled: true,
  }
}

export function buildEldritchInvocationsCatalogRow(): Record<string, unknown> {
  return {
    id: ELDRITCH_INVOCATIONS_CATALOG_ID,
    name: ELDRITCH_INVOCATIONS_CATALOG_NAME,
    description: `<p>${ELDRITCH_INVOCATIONS_CATALOG_INFO}</p>`,
    characteristics: [],
    modifier_catalog: buildDefaultEldritchInvocations(),
    prerequisites: null,
    attached_to_type: null,
    attached_to_id: null,
    uses: null,
    show_in_builder: false,
    is_system: true,
    icon: "sparkles",
    source: "System",
    creator_url: null,
    enabled: true,
  }
}

export async function ensureSystemOptionCatalogs(
  db: ReturnType<typeof import("@/lib/db/client").createClient>,
): Promise<void> {
  const rows = [
    { id: METAMAGIC_OPTIONS_CATALOG_ID, build: buildMetamagicOptionsCatalogRow, defaults: buildDefaultMetamagicOptions },
    { id: ELDRITCH_INVOCATIONS_CATALOG_ID, build: buildEldritchInvocationsCatalogRow, defaults: buildDefaultEldritchInvocations },
  ] as const

  for (const { id, build, defaults } of rows) {
    const { data: existing } = await db.from("custom_abilities").select("*").eq("id", id).maybeSingle()
    const existingRow = existing as Record<string, unknown> | null
    const defaultEntries = defaults()

    if (!existingRow) {
      await db.from("custom_abilities").insert([build()])
      continue
    }

    const catalog = normalizeModifierCatalog(existingRow.modifier_catalog)
    const byId = new Map(catalog.map((entry) => [entry.id, entry]))
    for (const entry of defaultEntries) {
      if (!byId.has(entry.id)) byId.set(entry.id, entry)
    }
    const merged = [...byId.values()]

    if (merged.length !== catalog.length || !existingRow.is_system) {
      await db
        .from("custom_abilities")
        .update({
          is_system: true,
          show_in_builder: false,
          modifier_catalog: merged,
          description: build().description,
        })
        .eq("id", id)
    }
  }
}
