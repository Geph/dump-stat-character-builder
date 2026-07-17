import { describe, expect, it } from "vitest"
import {
  grantCreatureCharacteristic,
  grantCreaturesFromLinkedModifiers,
  creatureNamesFromFeature,
} from "@/lib/compendium/grant-creature-catalog"
import { createModifierInstanceId } from "@/lib/compendium/linked-modifiers"
import { GRANT_CREATURE_CATALOG_ID } from "@/lib/compendium/grant-creature-catalog"
import type { Feature } from "@/lib/types"
import { collectCompanionCandidatesFromClasses } from "@/lib/character/resolve-companions"
import { buildCreatureTemplateLookup } from "@/lib/character/resolve-companions"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import type { Creature } from "@/lib/types"

describe("grant_creature modifier", () => {
  it("resolves creature names from linked modifiers", () => {
    const characteristic = grantCreatureCharacteristic(["Wolf", "Basilisk Companion"])
    const grants = grantCreaturesFromLinkedModifiers(
      [],
      [
        {
          instanceId: createModifierInstanceId(),
          catalogRefId: GRANT_CREATURE_CATALOG_ID,
          characteristics: [characteristic],
        },
      ],
    )
    expect(grants).toHaveLength(1)
    expect(grants[0].creatureNames).toEqual(["Wolf", "Basilisk Companion"])
  })

  it("merges companion_creature_names and grant_creature modifiers on a feature", () => {
    const feature = {
      level: 3,
      name: "Animal Companion",
      description: "",
      companion_creature_names: ["Wolf"],
      linkedModifiers: [
        {
          instanceId: "inst_1",
          catalogRefId: GRANT_CREATURE_CATALOG_ID,
          characteristics: [grantCreatureCharacteristic(["Basilisk Companion"])],
        },
      ],
    } as Feature

    expect(creatureNamesFromFeature(feature)).toEqual(["Wolf", "Basilisk Companion"])
  })

  it("feeds resolve-companions via grant_creature on a class feature", () => {
    const wolf: Creature = {
      id: "c1",
      name: "Wolf",
      description: null,
      creature_type: "Beast",
      size: "Medium",
      alignment: "Unaligned",
      cr: "1/4",
      stat_block: {
        name: "Wolf",
        ac: { parts: [{ type: "fixed", value: 12 }] },
        hp: { parts: [{ type: "fixed", value: 11 }] },
        traits: [],
        actions: [],
      },
      icon: null,
      source: "SRD",
      creator_url: null,
      created_at: "",
    }

    const detail = {
      row: { class_id: "ranger", level: 3, subclass_id: null },
      class: {
        name: "Ranger",
        features: [
          {
            level: 3,
            name: "Animal Companion",
            description: "You gain a companion.",
            linkedModifiers: [
              {
                instanceId: "inst_1",
                catalogRefId: GRANT_CREATURE_CATALOG_ID,
                characteristics: [grantCreatureCharacteristic(["Wolf"])],
              },
            ],
          },
        ],
      },
      subclass: null,
    } as unknown as CharacterClassDetail

    const lookup = buildCreatureTemplateLookup([wolf])
    const candidates = collectCompanionCandidatesFromClasses([detail], lookup)
    expect(candidates.map((c) => c.template.name)).toContain("Wolf")
  })
})
