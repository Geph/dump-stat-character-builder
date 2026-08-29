import { describe, expect, it } from "vitest"
import { readFileSync } from "fs"
import { computeDerivedCharacter } from "@/lib/character/compute-derived"
import { baseInputs } from "@/lib/character/__tests__/fixtures"
import { CUSTOM_FEAT_MODIFIER_PRESETS } from "@/lib/compendium/custom-feat-modifier-presets"
import { enrichCustomFeatRow } from "@/lib/compendium/enrich-custom-feats"
import { normalizeFeatRow } from "@/lib/compendium/normalize-feats"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { SINGLE_ABILITY_ASI_PHRASE } from "@/lib/import/detect-feature-modifier-rules"
import type { ImportContent } from "@/lib/import/content-schema"
import {
  hasHomebrewFixture,
  homebrewFixturePath,
} from "@/lib/import/__tests__/homebrew-fixture-path"
import type {
  AbilityScoreKey,
  AbilityScoresCharacteristic,
} from "@/lib/compendium/characteristic-modifiers"

const PHB = "Player's Handbook"
const ALIAS_FEAT_NAMES = new Set(["Innovators Upgrade", "Aquatic Adaption"])

const ABILITY_FROM_WORD: Record<string, AbilityScoreKey> = {
  strength: "strength",
  dexterity: "dexterity",
  constitution: "constitution",
  intelligence: "intelligence",
  wisdom: "wisdom",
  charisma: "charisma",
}

type FixedAsiFeat = { name: string; ability: AbilityScoreKey; amount: number }

function collectFixedSingleAbilityFeats(): FixedAsiFeat[] {
  const out: FixedAsiFeat[] = []
  for (const [name, preset] of Object.entries(CUSTOM_FEAT_MODIFIER_PRESETS)) {
    if (ALIAS_FEAT_NAMES.has(name)) continue
    const asiList = (preset.linkedModifiers ?? [])
      .flatMap((instance) => instance.characteristics ?? [])
      .filter((mod): mod is AbilityScoresCharacteristic => mod.type === "ability_scores")
      .filter((mod) => mod.mode === "fixed")
    if (asiList.length !== 1) continue
    const bonuses = Object.entries(asiList[0].bonuses ?? {}).filter(
      ([, value]) => typeof value === "number" && value !== 0,
    )
    if (bonuses.length !== 1) continue
    out.push({
      name,
      ability: bonuses[0][0] as AbilityScoreKey,
      amount: bonuses[0][1] as number,
    })
  }
  return out
}

function featChars(row: Record<string, unknown>) {
  const linked = (row.linked_modifiers ?? row.linkedModifiers ?? []) as {
    characteristics?: { type?: string; mode?: string; bonuses?: Record<string, number> }[]
  }[]
  return linked.flatMap((instance) => instance.characteristics ?? [])
}

function derivedScoreForFeat(name: string, extras: Record<string, unknown> = {}) {
  const row = normalizeFeatRow({
    id: `feat_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    name,
    source: PHB,
    description: `${name} rules text.`,
    ...extras,
  })
  const derived = computeDerivedCharacter(
    baseInputs({
      selectedFeatIds: [row.id],
      feats: [row],
    }),
  )
  return { feat: row, derived }
}

describe("single-ability feat ASI", () => {
  const fixedFeats = collectFixedSingleAbilityFeats()

  it("has the expected half-feat set (PHB + Kibbles Expert*)", () => {
    expect(fixedFeats.map((row) => row.name).sort()).toEqual(
      [
        "Actor",
        "Aquatic Adaptation",
        "Crossbow Expert",
        "Defensive Duelist",
        "Durable",
        "Expert Blacksmith",
        "Expert Cook",
        "Expert Tinkerer",
        "Great Weapon Master",
        "Keen Mind",
        "Sharpshooter",
        "Shield Master",
        "Skulker",
      ].sort(),
    )
  })

  it("raises the named score on a live derived sheet for every fixed half-feat", () => {
    for (const { name, ability, amount } of fixedFeats) {
      const { feat, derived } = derivedScoreForFeat(name)
      const asi = featChars(feat as unknown as Record<string, unknown>).find(
        (mod) => mod.type === "ability_scores",
      )
      expect(asi, name).toMatchObject({
        mode: "fixed",
        bonuses: { [ability]: amount },
      })
      expect(derived.abilityScores[ability], name).toBe(10 + amount)
    }
  })

  it("repairs Expert Cook leftover tool wiring so Wisdom still increases", () => {
    const { feat, derived } = derivedScoreForFeat("Expert Cook", {
      linked_modifiers: [
        {
          instanceId: "leftover_tools",
          catalogRefId: "cat_char_tool_proficiencies",
          characteristics: [
            {
              id: "leftover_tools",
              type: "tool_proficiencies",
              values: ["Cook's Utensils"],
            },
          ],
        },
      ],
    })
    const chars = featChars(feat as unknown as Record<string, unknown>)
    expect(chars.some((mod) => mod.type === "tool_proficiencies")).toBe(true)
    expect(chars.find((mod) => mod.type === "ability_scores")).toMatchObject({
      mode: "fixed",
      bonuses: { wisdom: 1 },
    })
    expect(derived.abilityScores.wisdom).toBe(11)
  })

  it("replaces a leftover unrestricted pool on Actor with fixed Charisma", () => {
    const row = enrichCustomFeatRow({
      name: "Actor",
      source: PHB,
      description: "Actor",
      linked_modifiers: [
        {
          instanceId: "import_random_asi",
          catalogRefId: "cat_char_ability_scores",
          characteristics: [
            {
              id: "import_random_asi",
              type: "ability_scores",
              mode: "asi_pool",
              points: 1,
              bonuses: {},
            },
          ],
        },
      ],
    })
    expect(featChars(row).find((mod) => mod.type === "ability_scores")).toMatchObject({
      mode: "fixed",
      bonuses: { charisma: 1 },
    })
  })

  it("wires an unnamed homebrew feat from single-score phrasing", () => {
    const row = enrichCustomFeatRow({
      name: "Grandma's Kitchen",
      source: "Homebrew",
      description: "Your Wisdom ability score increases by 1, to a maximum of 20.",
    })
    expect(featChars(row).find((mod) => mod.type === "ability_scores")).toMatchObject({
      mode: "fixed",
      bonuses: { wisdom: 1 },
    })
    const feat = normalizeFeatRow({
      id: "feat_grandmas_kitchen",
      ...row,
    })
    const derived = computeDerivedCharacter(
      baseInputs({ selectedFeatIds: [feat.id], feats: [feat] }),
    )
    expect(derived.abilityScores.wisdom).toBe(11)
  })
})

describe("Drive feat extracts — single-ability ASI", () => {
  const fixtures = ["kibbles-crafting-feats", "phb-feats", "wotc-feats.json"] as const

  it.runIf(fixtures.some((name) => hasHomebrewFixture(name)))(
    "enriches every single-named-score feat as a fixed bonus that applies",
    () => {
      const failures: string[] = []
      for (const fixture of fixtures) {
        if (!hasHomebrewFixture(fixture)) continue
        const raw = JSON.parse(readFileSync(homebrewFixturePath(fixture) as string, "utf8")) as {
          feats?: { name: string; description?: string }[]
        }
        const singleScore = (raw.feats ?? []).flatMap((feat) => {
          const match = SINGLE_ABILITY_ASI_PHRASE.exec(feat.description ?? "")
          if (!match) return []
          const ability = ABILITY_FROM_WORD[match[1].toLowerCase()]
          const amount = Number.parseInt(match[2] ?? "", 10)
          if (!ability || !Number.isFinite(amount)) return []
          return [{ ...feat, ability, amount }]
        })
        const enriched = enrichImportContentModifiers({
          feats: singleScore,
        } as unknown as ImportContent)
        for (const feat of singleScore) {
          const imported = enriched.feats?.find((row) => row.name === feat.name)
          const chars = featChars((imported ?? {}) as Record<string, unknown>)
          const asi = chars.find((mod) => mod.type === "ability_scores")
          if (asi?.mode !== "fixed" || asi.bonuses?.[feat.ability] !== feat.amount) {
            failures.push(
              `${fixture} / ${feat.name}: expected fixed +${feat.amount} ${feat.ability}, got ${JSON.stringify(asi)}`,
            )
            continue
          }
          const normalized = normalizeFeatRow({
            id: `feat_${feat.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
            name: feat.name,
            source: PHB,
            description: feat.description,
          })
          const derived = computeDerivedCharacter(
            baseInputs({ selectedFeatIds: [normalized.id], feats: [normalized] }),
          )
          if (derived.abilityScores[feat.ability] !== 10 + feat.amount) {
            failures.push(
              `${fixture} / ${feat.name}: derived ${feat.ability} was ${derived.abilityScores[feat.ability]}`,
            )
          }
        }
      }
      expect(failures).toEqual([])
    },
  )
})
