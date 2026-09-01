/**
 * Card art that may be committed / pushed: SRD only, plus original species
 * portraits already on GitHub. Keep in sync with `scripts/bundled-card-art.mjs`
 * (optimizer / gitignore source of truth).
 *
 * Mage Hand Press and Kibbles Tasty art are local-only — import assigns them
 * when the PNG is present. Do not add new local portraits. Leftover copies
 * may remain in git history.
 */

const BUNDLED_CLASS_FILES = new Set([
  "barbarian.png",
  "bard.png",
  "cleric.png",
  "druid.png",
  "fighter.png",
  "monk.png",
  "paladin.png",
  "ranger.png",
  "rogue.png",
  "sorcerer.png",
  "warlock.png",
  "wizard.png",
])

const BUNDLED_BACKGROUND_FILES = new Set([
  "acolyte.png",
  "criminal.png",
  "sage.png",
  "soldier.png",
])

/** Already-shipped original species portraits. New slugs stay local-only. */
const BUNDLED_SPECIES_FILES = new Set([
  "aarakocra.png",
  "aasimar-2022.png",
  "aasimar-eberron.png",
  "aasimar.png",
  "air-genasi.png",
  "astral-elf.png",
  "autognome.png",
  "boggarts.png",
  "bugbear.png",
  "centaur.png",
  "changeling-2022.png",
  "changeling.png",
  "deep-gnome.png",
  "dhakaani-ghaaldar.png",
  "dhakaani-golindar.png",
  "dhakaani-guuldar.png",
  "dhampir.png",
  "dragonborn.png",
  "duergar.png",
  "dwarf.png",
  "earth-genasi.png",
  "eladrin.png",
  "elf.png",
  "fairy.png",
  "firbolg.png",
  "fire-genasi.png",
  "flamekin.png",
  "giff.png",
  "githyanki.png",
  "githzerai.png",
  "gnoll.png",
  "gnome.png",
  "goblin-2022.png",
  "goliath.png",
  "hadozee.png",
  "halfling.png",
  "hexblood.png",
  "human.png",
  "jhorguntaal.png",
  "kalamer-landwalker-merfolk.png",
  "kalashtar.png",
  "khoravar.png",
  "kithkin.png",
  "lorwyn-changeling.png",
  "lorwyn-elf.png",
  "lorwyn-fairy.png",
  "lupin.png",
  "orc.png",
  "plasmoid.png",
  "reborn.png",
  "rimekin.png",
  "ruinbound.png",
  "sahuagin.png",
  "shifter.png",
  "tabaxi.png",
  "thri-kreen.png",
  "tiefling.png",
  "warforged.png",
  "water-genasi.png",
])

const BUNDLED_SUBCLASS_FILES = new Set([
  "barbarian/path-of-the-berserker.png",
  "bard/college-of-lore.png",
  "cleric/life-domain.png",
  "druid/circle-of-the-land.png",
  "fighter/champion.png",
  "monk/warrior-of-the-open-hand.png",
  "paladin/oath-of-devotion.png",
  "ranger/hunter.png",
  "rogue/gadgeteer.png",
  "rogue/thief.png",
  "sorcerer/draconic-sorcery.png",
  "warlock/fiend-patron.png",
  "wizard/evoker.png",
])

/** SRD cantrips already on GitHub. Kibbles spells stay local-only. */
const BUNDLED_SPELL_FILES = new Set([
  "acid-splash.png",
  "blade-ward.png",
  "booming-blade.png",
  "chill-touch.png",
  "control-flames.png",
  "create-bonfire.png",
  "dancing-lights.png",
  "druidcraft.png",
  "eldritch-blast.png",
  "elementalism.png",
  "fire-bolt.png",
  "friends.png",
  "frostbite.png",
  "green-flame-blade.png",
  "guidance.png",
  "gust.png",
  "infestation.png",
  "light.png",
  "lightning-lure.png",
  "mage-hand.png",
  "magic-stone.png",
  "mending.png",
  "message.png",
  "mind-sliver.png",
  "minor-illusion.png",
  "mold-earth.png",
  "poison-spray.png",
  "prestidigitation.png",
  "primal-savagery.png",
  "produce-flame.png",
  "ray-of-frost.png",
  "resistance.png",
  "sacred-flame.png",
  "shape-water.png",
  "shillelagh.png",
  "shocking-grasp.png",
  "sorcerous-burst.png",
  "spare-the-dying.png",
  "starry-wisp.png",
  "sword-burst.png",
  "thaumaturgy.png",
  "toll-the-dead.png",
  "true-strike.png",
  "vicious-mockery.png",
  "word-of-radiance.png",
])

export function normalizeRepoPath(value: unknown): string {
  return String(value ?? "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
}

export function publicCardArtPathFromUrl(url: string | null | undefined): string | null {
  const idx = String(url ?? "").indexOf("/images/")
  if (idx < 0) return null
  return `public${url!.slice(idx)}`
}

export function isBundledPublicCardArtPath(repoRelative: string): boolean {
  const n = normalizeRepoPath(repoRelative)
  const classes = n.match(/^public\/images\/compendium\/classes\/([^/]+)$/)
  if (classes) return BUNDLED_CLASS_FILES.has(classes[1]!)
  const backgrounds = n.match(/^public\/images\/compendium\/backgrounds\/([^/]+)$/)
  if (backgrounds) return BUNDLED_BACKGROUND_FILES.has(backgrounds[1]!)
  const species = n.match(/^public\/images\/compendium\/species\/([^/]+)$/)
  if (species) return BUNDLED_SPECIES_FILES.has(species[1]!)
  const subclass = n.match(/^public\/images\/compendium\/subclasses\/(.+)$/)
  if (subclass) return BUNDLED_SUBCLASS_FILES.has(subclass[1]!)
  const spells = n.match(/^public\/images\/compendium\/spells\/([^/]+)$/)
  if (spells) return BUNDLED_SPELL_FILES.has(spells[1]!)
  return false
}
