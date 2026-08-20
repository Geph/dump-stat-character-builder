import { describe, expect, it } from "vitest"
import {
  defaultAbilityIconForItem,
  inferAbilityOwnerClassName,
  stampAbilityDefaultIcons,
} from "@/lib/compendium/ability-icons-defaults"
import { getCompendiumItemIcon } from "@/lib/compendium/content-types"
import { HOMEBREW_CLASS_ICONS_BY_NAME, SRD_CLASS_ICONS_BY_NAME } from "@/lib/compendium/class-icons-defaults"

describe("ability icon defaults", () => {
  it("uses the single eligible class icon when no icon is assigned", () => {
    expect(
      defaultAbilityIconForItem({
        name: "Blitz",
        eligible_classes: ["Warmage"],
      }),
    ).toBe(HOMEBREW_CLASS_ICONS_BY_NAME.Warmage)
    expect(
      getCompendiumItemIcon("abilities", {
        name: "Blitz",
        eligible_classes: ["Warmage"],
      }),
    ).toBe(HOMEBREW_CLASS_ICONS_BY_NAME.Warmage)
  })

  it("uses attached class name when resolvable", () => {
    expect(
      defaultAbilityIconForItem({
        name: "Gadget Pack",
        attached_to_type: "class",
        attached_to_id: "Inventor",
      }),
    ).toBe(HOMEBREW_CLASS_ICONS_BY_NAME.Inventor)
    expect(
      defaultAbilityIconForItem({
        name: "Rage Power",
        attached_to_type: "class",
        attached_to_id: "Barbarian",
        source: "D&D Homebrew",
      }),
    ).toBe(SRD_CLASS_ICONS_BY_NAME.Barbarian)
  })

  it("resolves class from source_name / source labels", () => {
    expect(inferAbilityOwnerClassName({ source_name: "Occultist" })).toBe("Occultist")
    expect(
      defaultAbilityIconForItem({
        name: "Hex",
        source_name: "Occultist",
        attached_to_type: "class",
        attached_to_id: "some-uuid-not-a-class-name",
      }),
    ).toBe(HOMEBREW_CLASS_ICONS_BY_NAME.Occultist)
    expect(
      defaultAbilityIconForItem({
        name: "Psionic Talent",
        source: "KibblesTasty Psion",
      }),
    ).toBe(HOMEBREW_CLASS_ICONS_BY_NAME.Psion)
  })

  it("maps subclass-owned Kibbles abilities to their parent class icon", () => {
    expect(
      defaultAbilityIconForItem({
        name: "Airburst Mine",
        ability_role: "upgrade",
        source_type: "subclass",
        source_name: "Gadgetsmith",
      }),
    ).toBe(HOMEBREW_CLASS_ICONS_BY_NAME.Inventor)
    expect(
      defaultAbilityIconForItem({
        name: "Animate Broom",
        ability_role: "knack",
        source_type: "subclass",
        source_name: "Witch",
      }),
    ).toBe(HOMEBREW_CLASS_ICONS_BY_NAME.Occultist)
    expect(
      defaultAbilityIconForItem({
        name: "Bone Construct",
        source_type: "subclass",
        source_name: "Bone Binder",
      }),
    ).toBe(HOMEBREW_CLASS_ICONS_BY_NAME.Warden)
  })

  it("keeps Mage Hand Press Witch class abilities on witch-flight", () => {
    expect(
      defaultAbilityIconForItem({
        name: "Hex",
        source_type: "class",
        source_name: "Witch",
      }),
    ).toBe(HOMEBREW_CLASS_ICONS_BY_NAME.Witch)
  })

  it("uses the Psion class icon for owned disciplines", () => {
    expect(
      defaultAbilityIconForItem({
        name: "Psychokinesis Discipline",
        ability_role: "discipline",
        source_type: "class",
        source_name: "Psion",
      }),
    ).toBe(HOMEBREW_CLASS_ICONS_BY_NAME.Psion)
    expect(
      defaultAbilityIconForItem({
        name: "Blitz",
        eligible_classes: ["Warmage"],
        icon: "fire-silhouette",
      }),
    ).toBe("fire-silhouette")
  })

  it("keeps psychic-waves only for unowned discipline shells", () => {
    expect(
      defaultAbilityIconForItem({
        name: "Psychokinesis Discipline",
        ability_role: "discipline",
      }),
    ).toBe("psychic-waves")
  })

  it("does not guess a class icon for shared multi-class libraries", () => {
    expect(
      inferAbilityOwnerClassName({
        name: "Mighty Leap",
        eligible_classes: ["Barbarian", "Fighter", "Rogue"],
      }),
    ).toBeNull()
    expect(
      getCompendiumItemIcon("abilities", {
        name: "Mighty Leap",
        ability_role: "knack",
        eligible_classes: ["Barbarian", "Fighter", "Rogue"],
      }),
    ).toBe("magic-trident")
  })

  it("falls back to the generic ability icon when no class is known", () => {
    expect(
      getCompendiumItemIcon("abilities", {
        name: "Mind Leech",
        ability_role: "psionic_power",
      }),
    ).toBe("magic-trident")
  })

  it("stamps pack subclass parents onto ability icons", () => {
    const stamped = stampAbilityDefaultIcons({
      classes: [{ name: "Inventor" }],
      subclasses: [{ name: "Gadgetsmith", class_name: "Inventor" }],
      abilities: [
        {
          name: "Airburst Mine",
          source_type: "subclass",
          source_name: "Gadgetsmith",
          ability_role: "upgrade",
        },
      ],
    })
    expect((stamped.abilities?.[0] as { icon?: string } | undefined)?.icon).toBe(
      HOMEBREW_CLASS_ICONS_BY_NAME.Inventor,
    )
  })
})
