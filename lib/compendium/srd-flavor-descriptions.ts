import { isSrdSource } from "@/lib/srd/source"

/** Short flavor summaries for SRD compendium cards (not stat-block filler). */
export const SRD_SPECIES_DESCRIPTIONS: Record<string, string> = {
  Aasimar:
    "Mortals touched by celestial power, often radiating a faint inner light and capable of channeling radiant energy.",
  Dragonborn:
    "Descendants of dragons with scaled skin and a draconic breath weapon tied to their ancestry's elemental type.",
  Dwarf:
    "Hardy, long-lived folk known for resilience, craftsmanship, and a deep connection to stone and tradition.",
  Elf:
    "Graceful, long-lived people with keen senses and a natural affinity for magic or the wilds, depending on their lineage.",
  Gnome:
    "Small, inventive folk with a knack for tinkering, illusion, or both, and an irrepressible curiosity.",
  Goliath:
    "Towering, mountain-bred people with great physical resilience and a culture built around endurance and competition.",
  Halfling:
    "Small, nimble, and famously lucky folk known for their bravery in the face of danger and their love of comfort.",
  Human:
    "Versatile and adaptable, humans make up for a lack of innate magic with sheer breadth of skill and ambition.",
  Orc:
    "Strong, driven people with great stamina and a fierce reputation, often shaped by perseverance against adversity.",
  Tiefling:
    "Mortals bearing a fiendish heritage, marked by infernal features and an innate spark of otherworldly magic.",
}

export const SRD_BACKGROUND_DESCRIPTIONS: Record<string, string> = {
  Acolyte:
    "Raised in service to a temple or faith, skilled in religious knowledge and ritual.",
  Artisan:
    "Trained in a craft trade, skilled with tools and the business of making things.",
  Charlatan:
    "A practiced trickster skilled in deception, disguise, and reading people.",
  Criminal:
    "Someone who's lived outside the law, comfortable with stealth and shady connections.",
  Entertainer:
    "A performer skilled at captivating a crowd, whether through music, acrobatics, or showmanship.",
  Farmer:
    "Raised working the land, hardy and practical with a good understanding of animals and tools.",
  Guard:
    "Trained to watch, protect, and enforce order, often with military-adjacent discipline.",
  Guide:
    "Experienced in wilderness travel, skilled at navigation and survival.",
  Hermit:
    "Someone who spent long periods in isolation, often gaining insight into medicine, religion, or themselves.",
  Merchant:
    "Skilled in trade and negotiation, with a good head for persuasion and commerce.",
  Noble:
    "Raised with wealth and status, skilled in etiquette, history, and the art of persuasion.",
  Sage:
    "A devoted scholar with deep book learning and a thirst for arcane or historical knowledge.",
  Sailor:
    "Seasoned by life at sea, skilled in athletics, navigation, and rough-and-tumble survival.",
  Scribe:
    "Trained in careful writing and record-keeping, with sharp attention to detail.",
  Soldier:
    "Trained for war, skilled in tactics, athletics, and the discipline of military life.",
  Wayfarer:
    "A streetwise traveler skilled at slipping by unnoticed and surviving on wit alone.",
}

export const SRD_CLASS_DESCRIPTIONS: Record<string, string> = {
  Barbarian:
    "You crash in first, riding a Rage that is instinct as much as anger. Pain dulls, senses sharpen, and the fight stays on your terms while allies move behind you.",
  Bard:
    "You treat every room like a stage: magic rides on music, jokes, and well-timed words. You keep the party sharp, rattle enemies, and solve problems that a sword cannot.",
  Cleric:
    "You reach past the material world and pull down miracles—healing, wards, and searing judgment. Temples may have raised you, but adventure is where that gift gets tested.",
  Druid:
    "You speak for weather, beasts, and old groves, shifting shape or calling the elements when talk fails. Guarding the balance often means walking into the threat yourself.",
  Fighter:
    "You are the all-purpose soldier: the right weapon, the right armor, and a plan for the next exchange. Specialization comes later; competence is the baseline.",
  Monk:
    "Training turns breath and focus into speed, iron hands, and uncanny defense. You treat the next fight as another test of the weapon you are making of yourself.",
  Paladin:
    "An oath—not a paycheck—puts you on the line against ruin. Steel matters, but the real edge is the magic that heals friends and burns what you swore to stop.",
  Ranger:
    "You read country the way others read a map, then hunt what should not be there. Stealth, tracking, and a thread of primal magic keep monsters off the road.",
  Rogue:
    "You win by noticing the gap—locks, lies, a turned back—and striking once where it counts. Brute force is a last resort; timing is the whole job.",
  Sorcerer:
    "The magic was already in you; the work is surviving it and aiming it. Each day you wrestle a gift that wants out, then spend it in sudden, personal bursts.",
  Warlock:
    "You bargained for power and now spend it in sharp, limited doses—invocations, a pact, a patron who is never just a footnote. Knowledge is the hunger; the deal is the cost.",
  Wizard:
    "You earned every spell the hard way: books, theories, and a kit of prepared formulas. When the map runs out, you go looking for the magic nobody living still teaches.",
}

/** Original PHB-path summaries for builder overlays (not book prose). */
export const SRD_SUBCLASS_DESCRIPTIONS: Record<string, string> = {
  "Path of the Berserker":
    "Rage becomes a weapon you lean into—harder hits when you abandon caution, and a habit of answering pain with another swing.",
  "Path of the Wild Heart":
    "You borrow the aspect of beasts: tougher hides, keener senses, and primal options you can retune as the wild demands.",
  "Path of the World Tree":
    "Roots and branches answer you in a fight—you pin foes, yank allies to safety, and hold a patch of ground like living timber.",
  "Path of the Zealot":
    "Divine fury rides your Rage. You smite as you swing and are notoriously hard to keep dead when the cause still needs you.",
  "College of Dance":
    "Footwork is the spell. You slip through the melee, set the tempo for allies, and turn motion itself into protection and harm.",
  "College of Glamour":
    "Fey charm does the heavy lifting—you dazzle a room, drag attention where you want it, and make friends look like legends.",
  "College of Lore":
    "You collect other people's tricks: extra skills, stolen spells, and a cutting remark that can wreck a roll at the worst time.",
  "College of Valor":
    "You stay in the scrum with a blade and a song, handing out inspiration while you take and give hits like a skirmish captain.",
  "Life Domain":
    "Every heal you throw goes further. You are the reason the front line stands back up, and the one who stretches a slot into a save.",
  "Light Domain":
    "You fight with glare and fire—burning out the dark, searing clusters of foes, and daring anyone to look straight at you.",
  "Trickery Domain":
    "You bless the lie: duplicates, stealth, and misdirection that let the party vanish or strike from the wrong silhouette.",
  "War Domain":
    "You bless the charge. Extra attacks, divine steel, and a cleric who is happy to stand in the second rank with a real weapon.",
  "Circle of the Land":
    "You prepare the land's own spell list, then spend Wild Shape to wring extra slots and a burst of thorns or sanctuary from the soil.",
  "Circle of the Moon":
    "Wild Shape is the whole plan—you become the beast in the doorway and stay there, hitting like a monster instead of a caster.",
  "Circle of the Sea":
    "Storm and surf cling to you. You fight in a churning aura, shove the field around, and stay dangerous in the drink.",
  "Circle of the Stars":
    "You wear constellations like armor—omen forms, guiding light, and a starry map that turns study into battlefield control.",
  Champion:
    "You chase the critical hit and the athletic edge. Fewer moving parts, more times the dice just decide someone is done.",
  "Battle Master":
    "Maneuvers turn each attack into a choice: trip, goad, rally, or riposte. You spend superiority like a tactician spends ink.",
  "Eldritch Knight":
    "A few wizard spells ride on a fighter's chassis—shields, damage cantrips, and a bonded weapon that never stays lost.",
  "Psi Warrior":
    "Telekinetic force coats your blade and your cover. You spend psi to shove, shield, and strike without dropping the martial loop.",
  "Warrior of Mercy":
    "You decide who lives in the scrum—healing hands for allies, a precise ending for enemies, all through the same disciplined touch.",
  "Warrior of Shadow":
    "Darkness is a hallway. You step through gloom, vanish, and arrive already swinging.",
  "Warrior of the Elements":
    "Ki becomes weather on your fists—reach, bursts, and elemental riders that make unarmed strikes feel like a storm front.",
  "Warrior of the Open Hand":
    "You wrestle the body: knocks, trips, and a well-timed palm that can stop a heart or restore your own.",
  "Oath of Devotion":
    "Knight-errant honesty. Your aura and smites punish the wicked, and your weapon can light up like a vow made steel.",
  "Oath of Glory":
    "You chase the highlight reel—speed, leaps, and a presence that makes the whole party look like a legend in progress.",
  "Oath of the Ancients":
    "You keep the light of the old world alive: nature's wards, a softening aura, and smites that feel like summer refusing to die.",
  "Oath of Vengeance":
    "One target, no mercy. You hunt a marked foe across the field and spend everything to finish that hunt.",
  "Beast Master":
    "A primal companion fights in lockstep with you—you spend your bonus action on the beast, not a second sword.",
  "Fey Wanderer":
    "A little Feywild clings to you. Charm, misdirection, and a disquieting grace that works in court and in the kill.",
  "Gloom Stalker":
    "You own the first round in the dark: extra reach into ambush, grim accuracy, and a habit of ending scouts before they shout.",
  Hunter:
    "You pick the right answer for the prey in front of you—slayer tricks, defensive reads, and a kit built to delete monsters.",
  "Arcane Trickster":
    "Mage hand and a short wizard list turn burglary into a spell. You steal, trip, and vanish with an extra layer of mischief.",
  Assassin:
    "The opening is the whole character. You arrange surprise, disguise, and a first hit that is supposed to end the argument.",
  Soulknife:
    "Psionic blades form in your grip. You throw them, recall them, and spend psi to turn a miss into a second chance.",
  Thief:
    "Hands faster than the room. Climb, palm, use the object, and take an extra turn's worth of mischief when it matters.",
  "Aberrant Sorcery":
    "Something alien leased you a mind. Telepathy, warped space, and spells that feel like a thought leaking into reality.",
  "Clockwork Sorcery":
    "You sand down chaos. Restore a failed roll, tidy a mess of conditions, and spend sorcery to make the math behave.",
  "Draconic Sorcery":
    "Dragon-blood resilience and matching elemental punch, with wings or a scaled companion when the bloodline fully wakes.",
  "Wild Magic Sorcery":
    "Every surge is a coin flip you learned to love. You lean into the surge table and turn accidents into extra fuel.",
  "Archfey Patron":
    "Whimsical terror. You charm, frighten, and step away like a storybook trickster who always has one more exit.",
  "Celestial Patron":
    "A spark of the Upper Planes rides your pact—radiant heals, light cantrips, and a warlock who can still patch the party.",
  "Fiend Patron":
    "Lower-Planes bargains pay in temporary hit points and nasty luck. You get harder to kill the more you send others down.",
  "Great Old One Patron":
    "Thoughts are a battlefield. You whisper into minds, shrug off charm, and spend the pact on psychic pressure.",
  Abjurer:
    "You build the ward first. Absorbed hits, banished problems, and a specialty in making the party survive the next mistake.",
  Diviner:
    "You keep a few rolls in your pocket. Portent dice rewrite the scene, and scrying tells you which fight not to take.",
  Evoker:
    "You sculpt the blast so friends stay standing. Cantrips punch up, and you can overchannel when subtle is off the table.",
  Illusionist:
    "What people see is your raw material. You thicken phantasms, swap spaces, and win fights that never become fair.",
}

export type SrdFlavorCategory = "species" | "background" | "class" | "subclass"

const DESCRIPTIONS_BY_CATEGORY: Record<SrdFlavorCategory, Record<string, string>> = {
  species: SRD_SPECIES_DESCRIPTIONS,
  background: SRD_BACKGROUND_DESCRIPTIONS,
  class: SRD_CLASS_DESCRIPTIONS,
  subclass: SRD_SUBCLASS_DESCRIPTIONS,
}

export function srdFlavorDescription(
  category: SrdFlavorCategory,
  name: string,
): string | undefined {
  return DESCRIPTIONS_BY_CATEGORY[category][name]
}

/** Apply SRD flavor summary when this row is from the bundled SRD seed. */
export function applySrdFlavorDescription(
  row: Record<string, unknown>,
  category: SrdFlavorCategory,
): Record<string, unknown> {
  if (!isSrdSource(row.source as string | null | undefined)) return row
  const name = String(row.name ?? "").trim()
  if (!name) return row
  const flavor = srdFlavorDescription(category, name)
  if (!flavor) return row
  return { ...row, description: flavor }
}
