import type { ImportContent } from "@/lib/import/content-schema"
import type { EnrichmentPreset } from "@/lib/import/enrichment-presets/types"

const FEROCITY_DESCRIPTION = `<p>Companions are dangerous creatures. Though often more docile than their wild counterparts, they aren't fully domesticated. Each companion's ferocity is a measure of their tenacity and fury, and of how those things build in battle. As a companion's ferocity increases, they gain access to powerful new features, but they also become more difficult for a caregiver to control.</p>
<p><strong>Building Ferocity.</strong> If a companion isn't incapacitated at the start of their and their caregiver's turn, their ferocity increases by 1d4 + the number of hostile creatures within 5 feet of the companion that they can see or hear. For building ferocity, a group of creatures that share a single stat block (such as a swarm of rats) count as one creature. Ferocity builds round after round during combat, and there is no maximum to the level of ferocity a companion can gain.</p>
<p><strong>Rampage.</strong> After rolling to increase ferocity at the start of their turn, if a companion has 10 ferocity or more and is not incapacitated, they run the risk of entering a rampage. The companion's caregiver can make a Wisdom (Animal Handling) check (no action required) to try to stop the companion from entering a rampage (DC 5 + the companion's ferocity). The caregiver must not be incapacitated, and the companion must be able to see or hear the caregiver. On a failure, or if the caregiver doesn't make the check, the companion enters a rampage: they immediately move up to their speed toward the nearest creature and attack with their signature attack, dealing extra damage equal to half their ferocity on a hit. If ally and enemy are equidistant, roll any die — odd attacks an ally, even an enemy. When the rampage action resolves or the turn ends, ferocity drops to 0.</p>
<p><strong>Reducing Ferocity.</strong> Companions spend ferocity on ferocity actions in their stat block (caregiver level must meet the action's level). Ferocity actions use the companion's action and can't be used during a rampage. When combat ends and the companion isn't dying, they regain hit points equal to their ferocity and ferocity drops to 0.</p>
<p>This pool belongs to the companion (tracked for the Beastheart's companion), not a class-level spendable table.</p>`

const PRIMAL_EXPLOITS_BY_LEVEL = [
  { level: 2, count: 3 },
  { level: 10, count: 5 },
  { level: 17, count: 7 },
] as const

const SUBCLASS_EXPLOIT_BY_LEVEL = [
  { level: 3, count: 1 },
  { level: 11, count: 2 },
] as const

type Row = Record<string, unknown>

function asRecord(value: unknown): Row | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : null
}

function normalizeOrdinalPrerequisite(text: string | null | undefined): string | null | undefined {
  if (!text) return text
  return text
    .replace(/\b(\d+)th-level\b/gi, (_, n: string) => {
      const num = Number(n)
      const suf = num % 10 === 1 && num % 100 !== 11 ? "st" : num % 10 === 2 && num % 100 !== 12 ? "nd" : num % 10 === 3 && num % 100 !== 13 ? "rd" : "th"
      return `${num}${suf}-level`
    })
    .replace(/\b(\d+)th level\b/gi, (_, n: string) => {
      const num = Number(n)
      const suf = num % 10 === 1 && num % 100 !== 11 ? "st" : num % 10 === 2 && num % 100 !== 12 ? "nd" : num % 10 === 3 && num % 100 !== 13 ? "rd" : "th"
      return `${num}${suf} level`
    })
}

function fixSignatureAction(action: Row): Row {
  const name = String(action.name ?? "")
  const m = name.match(/^(.*?)\s*\(\s*Signature Attack\s*\)\s*$/i)
  if (!m) return action
  return {
    ...action,
    name: m[1].trim(),
    tag: action.tag || "Signature Attack",
  }
}

function abilityToOption(ability: Row): { name: string; description: string; prerequisite?: string | null } {
  return {
    name: String(ability.name ?? ""),
    description: String(ability.description ?? ""),
    prerequisite: (ability.prerequisite as string | null | undefined) ?? null,
  }
}

/**
 * Sanitize MCDM Beastheart imports:
 * - Ferocity is a companion-owned special tracker (no class level table)
 * - Primal Exploits = class_knacks; Infernal/Nature exploits must not pollute that pool
 * - Companion signature attacks use tag "Signature Attack"
 * - Strip bogus spellcasting_ability from Primal Exploits (WIS is exploit save DC only)
 */
export function sanitizeBeastheartImportContent(content: ImportContent): ImportContent {
  const hasBeastheart = (content.classes ?? []).some((cls) => /^beastheart$/i.test(cls.name ?? ""))
  if (!hasBeastheart) return content

  let next: ImportContent = { ...content }

  const ferocityRow = {
    class_name: "Beastheart",
    resource_key: "ferocity",
    name: "Ferocity",
    description: FEROCITY_DESCRIPTION,
    uses: { type: "special" as const },
  }
  const primalKnownRow = {
    class_name: "Beastheart",
    resource_key: "primal_exploits_known",
    name: "Primal Exploits Known",
    description: "Number of Primal Exploits the Beastheart knows (special choice count).",
    uses: {
      type: "special" as const,
      atLevelMode: "tier" as const,
      atLevelTable: [...PRIMAL_EXPLOITS_BY_LEVEL],
    },
  }

  const resources = [...(next.class_resources ?? [])]
  const without = resources.filter(
    (r) => r.resource_key !== "ferocity" && r.resource_key !== "primal_exploits_known",
  )
  next = { ...next, class_resources: [...without, ferocityRow, primalKnownRow] }

  const abilities = [...(next.import_proposals?.custom_abilities ?? [])]
  const infernal = abilities.filter(
    (a) =>
      a.source_type === "subclass" &&
      /^infernal bond$/i.test(a.source_name ?? "") &&
      (a.ability_role === "knack" || /infernal exploit/i.test(String(a.definition ?? ""))),
  )
  const nature = abilities.filter(
    (a) =>
      a.source_type === "subclass" &&
      /^primordial bond$/i.test(a.source_name ?? "") &&
      (a.ability_role === "knack" || /nature exploit/i.test(String(a.definition ?? ""))),
  )

  if (abilities.length) {
    next = {
      ...next,
      import_proposals: {
        ...next.import_proposals,
        custom_abilities: abilities.map((ability) => {
          const isSubclassExploit =
            ability.source_type === "subclass" &&
            (/^infernal bond$/i.test(ability.source_name ?? "") ||
              /^primordial bond$/i.test(ability.source_name ?? "")) &&
            ability.ability_role === "knack"
          if (isSubclassExploit) {
            const { ability_role: _role, ...rest } = ability
            return {
              ...rest,
              prerequisite: normalizeOrdinalPrerequisite(ability.prerequisite) ?? ability.prerequisite,
            }
          }
          return {
            ...ability,
            ability_role: ability.ability_role ?? "knack",
            prerequisite: normalizeOrdinalPrerequisite(ability.prerequisite) ?? ability.prerequisite,
            source_type: ability.source_type ?? "class",
            source_name: ability.source_name || "Beastheart",
          }
        }),
      },
    }
  }

  if (next.classes?.length) {
    next = {
      ...next,
      classes: next.classes.map((cls) => {
        if (!/^beastheart$/i.test(cls.name ?? "")) return cls
        const features = (cls.features ?? []).map((feat) => {
          if (/^primal exploits$/i.test(feat.name ?? "")) {
            const mechanics = Array.isArray(feat.mechanics)
              ? feat.mechanics.filter((m) => asRecord(m)?.kind !== "spellcasting_ability")
              : []
            const prior = feat.choices
            return {
              ...feat,
              isChoice: true,
              mechanics,
              choices: {
                category: "Primal Exploit",
                count: prior?.count ?? 3,
                options: prior?.options ?? [],
                resourceKey: "primal_exploits_known",
                optionsSource: "class_knacks" as const,
                swappableOnRest: false,
                choiceCountByLevel:
                  prior &&
                  "choiceCountByLevel" in prior &&
                  Array.isArray((prior as { choiceCountByLevel?: unknown }).choiceCountByLevel)
                    ? (prior as { choiceCountByLevel: { level: number; count: number }[] })
                        .choiceCountByLevel
                    : [...PRIMAL_EXPLOITS_BY_LEVEL],
              },
            }
          }
          if (/^companion bond$/i.test(feat.name ?? "")) {
            const { isChoice: _i, choices: _c, ...rest } = feat
            return rest
          }
          return feat
        })
        return { ...cls, features }
      }),
    }
  }

  if (next.subclasses?.length) {
    next = {
      ...next,
      subclasses: next.subclasses.map((sc) => {
        const features = (sc.features ?? []).map((feat) => {
          if (/^infernal exploits$/i.test(feat.name ?? "") && /^infernal bond$/i.test(sc.name ?? "")) {
            const prior = feat.choices
            return {
              ...feat,
              isChoice: true,
              choices: {
                category: "Infernal Exploit",
                count: prior?.count ?? 1,
                options: infernal.map((a) => abilityToOption(a as unknown as Row)),
                swappableOnRest: false,
                choiceCountByLevel:
                  prior &&
                  "choiceCountByLevel" in prior &&
                  Array.isArray((prior as { choiceCountByLevel?: unknown }).choiceCountByLevel)
                    ? (prior as { choiceCountByLevel: { level: number; count: number }[] })
                        .choiceCountByLevel
                    : [...SUBCLASS_EXPLOIT_BY_LEVEL],
              },
            }
          }
          if (/^nature exploits$/i.test(feat.name ?? "") && /^primordial bond$/i.test(sc.name ?? "")) {
            const prior = feat.choices
            return {
              ...feat,
              isChoice: true,
              choices: {
                category: "Nature Exploit",
                count: prior?.count ?? 1,
                options: nature.map((a) => abilityToOption(a as unknown as Row)),
                swappableOnRest: false,
                choiceCountByLevel:
                  prior &&
                  "choiceCountByLevel" in prior &&
                  Array.isArray((prior as { choiceCountByLevel?: unknown }).choiceCountByLevel)
                    ? (prior as { choiceCountByLevel: { level: number; count: number }[] })
                        .choiceCountByLevel
                    : [...SUBCLASS_EXPLOIT_BY_LEVEL],
              },
            }
          }
          if (/^undying protector$/i.test(feat.name ?? "")) {
            const desc = String(feat.description ?? "").replace(
              /<p><em>Note: this feature's text was interleaved[\s\S]*?<\/em><\/p>/i,
              "",
            )
            return { ...feat, description: desc.trim() }
          }
          return feat
        })
        return { ...sc, features }
      }),
    }
  }

  if (next.creatures?.length) {
    next = {
      ...next,
      creatures: next.creatures.map((creature) => {
        const row = creature as unknown as Row & { category?: string; actions?: Row[] }
        const actions = Array.isArray(row.actions) ? row.actions.map(fixSignatureAction) : undefined
        return {
          ...creature,
          ...(row.category == null ? { category: "companion" } : {}),
          ...(actions ? { actions } : {}),
        } as typeof creature
      }),
    }
  }

  return next
}

export const BEASTHEART_PRESETS: EnrichmentPreset[] = [
  {
    id: "beastheart.class.companion",
    pack: "beastheart",
    target: "class_feature",
    match: { className: /beastheart/i, name: /^companion$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Companion is grant_creature with creatureChoiceOptions for all imported companion creatures[]. Ferocity / rampage / signature attacks live on the companion, not as Beastheart spell slots.",
      },
    ],
  },
  {
    id: "beastheart.class.primal_exploits",
    pack: "beastheart",
    target: "class_feature",
    match: { className: /beastheart/i, name: /^primal exploits$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Primal Exploits use optionsSource class_knacks + class_resources.primal_exploits_known (special). Spend companion ferocity to use an exploit. WIS sets exploit save DC — do not set classes[].spellcasting from this feature. Infernal/Nature exploits are separate subclass pickers (not knacks).",
      },
    ],
  },
  {
    id: "beastheart.class.companion_bond",
    pack: "beastheart",
    target: "class_feature",
    match: { className: /beastheart/i, name: /^companion bond$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Companion Bond is the subclass unlock (Ferocious, Hunter, Infernal, Primordial, Protector). Short blurb only — real features live in subclasses[].",
      },
    ],
  },
]
