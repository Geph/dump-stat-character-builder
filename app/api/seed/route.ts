import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// SRD 5.2 Content - Core classes, species, backgrounds, spells, and equipment
const SRD_CLASSES = [
  {
    name: "Barbarian",
    description: "A fierce warrior who can enter a battle rage",
    hit_die: 12,
    primary_ability: ["Strength"],
    saving_throws: ["Strength", "Constitution"],
    armor_proficiencies: ["Light armor", "Medium armor", "Shields"],
    weapon_proficiencies: ["Simple weapons", "Martial weapons"],
    skill_choices: { count: 2, options: ["Animal Handling", "Athletics", "Intimidation", "Nature", "Perception", "Survival"] },
    features: [
      { level: 1, name: "Rage", description: "In battle, you fight with primal ferocity. On your turn, you can enter a rage as a bonus action." },
      { level: 1, name: "Unarmored Defense", description: "While you are not wearing any armor, your Armor Class equals 10 + your Dexterity modifier + your Constitution modifier." },
      { level: 2, name: "Reckless Attack", description: "You can throw aside all concern for defense to attack with fierce desperation." },
      { level: 2, name: "Danger Sense", description: "You have advantage on Dexterity saving throws against effects that you can see." },
    ],
    source: "SRD",
  },
  {
    name: "Bard",
    description: "An inspiring magician whose power echoes the music of creation",
    hit_die: 8,
    primary_ability: ["Charisma"],
    saving_throws: ["Dexterity", "Charisma"],
    armor_proficiencies: ["Light armor"],
    weapon_proficiencies: ["Simple weapons", "Hand crossbows", "Longswords", "Rapiers", "Shortswords"],
    skill_choices: { count: 3, options: ["Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception", "History", "Insight", "Intimidation", "Investigation", "Medicine", "Nature", "Perception", "Performance", "Persuasion", "Religion", "Sleight of Hand", "Stealth", "Survival"] },
    spellcasting: { ability: "Charisma", cantrips: 2, spells_known: 4 },
    features: [
      { level: 1, name: "Bardic Inspiration", description: "You can inspire others through stirring words or music." },
      { level: 1, name: "Spellcasting", description: "You have learned to untangle and reshape the fabric of reality in harmony with your wishes and music." },
    ],
    source: "SRD",
  },
  {
    name: "Cleric",
    description: "A priestly champion who wields divine magic in service of a higher power",
    hit_die: 8,
    primary_ability: ["Wisdom"],
    saving_throws: ["Wisdom", "Charisma"],
    armor_proficiencies: ["Light armor", "Medium armor", "Shields"],
    weapon_proficiencies: ["Simple weapons"],
    skill_choices: { count: 2, options: ["History", "Insight", "Medicine", "Persuasion", "Religion"] },
    spellcasting: { ability: "Wisdom", cantrips: 3, prepared: true },
    features: [
      { level: 1, name: "Spellcasting", description: "As a conduit for divine power, you can cast cleric spells." },
      { level: 1, name: "Divine Domain", description: "Choose one domain related to your deity." },
      { level: 2, name: "Channel Divinity", description: "You gain the ability to channel divine energy directly from your deity." },
    ],
    source: "SRD",
  },
  {
    name: "Druid",
    description: "A priest of the Old Faith, wielding the powers of nature and adopting animal forms",
    hit_die: 8,
    primary_ability: ["Wisdom"],
    saving_throws: ["Intelligence", "Wisdom"],
    armor_proficiencies: ["Light armor", "Medium armor", "Shields (druids will not wear armor or use shields made of metal)"],
    weapon_proficiencies: ["Clubs", "Daggers", "Darts", "Javelins", "Maces", "Quarterstaffs", "Scimitars", "Sickles", "Slings", "Spears"],
    skill_choices: { count: 2, options: ["Arcana", "Animal Handling", "Insight", "Medicine", "Nature", "Perception", "Religion", "Survival"] },
    spellcasting: { ability: "Wisdom", cantrips: 2, prepared: true },
    features: [
      { level: 1, name: "Druidic", description: "You know Druidic, the secret language of druids." },
      { level: 1, name: "Spellcasting", description: "Drawing on the divine essence of nature itself, you can cast spells." },
      { level: 2, name: "Wild Shape", description: "You can use your action to magically assume the shape of a beast." },
    ],
    source: "SRD",
  },
  {
    name: "Fighter",
    description: "A master of martial combat, skilled with a variety of weapons and armor",
    hit_die: 10,
    primary_ability: ["Strength", "Dexterity"],
    saving_throws: ["Strength", "Constitution"],
    armor_proficiencies: ["All armor", "Shields"],
    weapon_proficiencies: ["Simple weapons", "Martial weapons"],
    skill_choices: { count: 2, options: ["Acrobatics", "Animal Handling", "Athletics", "History", "Insight", "Intimidation", "Perception", "Survival"] },
    features: [
      { level: 1, name: "Fighting Style", description: "You adopt a particular style of fighting as your specialty." },
      { level: 1, name: "Second Wind", description: "You have a limited well of stamina that you can draw on to protect yourself from harm." },
      { level: 2, name: "Action Surge", description: "You can push yourself beyond your normal limits for a moment." },
    ],
    source: "SRD",
  },
  {
    name: "Monk",
    description: "A master of martial arts, harnessing the power of the body in pursuit of physical and spiritual perfection",
    hit_die: 8,
    primary_ability: ["Dexterity", "Wisdom"],
    saving_throws: ["Strength", "Dexterity"],
    armor_proficiencies: [],
    weapon_proficiencies: ["Simple weapons", "Shortswords"],
    skill_choices: { count: 2, options: ["Acrobatics", "Athletics", "History", "Insight", "Religion", "Stealth"] },
    features: [
      { level: 1, name: "Unarmored Defense", description: "While you are wearing no armor and not wielding a shield, your AC equals 10 + your Dexterity modifier + your Wisdom modifier." },
      { level: 1, name: "Martial Arts", description: "Your practice of martial arts gives you mastery of combat styles that use unarmed strikes and monk weapons." },
      { level: 2, name: "Ki", description: "Your training allows you to harness the mystic energy of ki." },
    ],
    source: "SRD",
  },
  {
    name: "Paladin",
    description: "A holy warrior bound to a sacred oath",
    hit_die: 10,
    primary_ability: ["Strength", "Charisma"],
    saving_throws: ["Wisdom", "Charisma"],
    armor_proficiencies: ["All armor", "Shields"],
    weapon_proficiencies: ["Simple weapons", "Martial weapons"],
    skill_choices: { count: 2, options: ["Athletics", "Insight", "Intimidation", "Medicine", "Persuasion", "Religion"] },
    spellcasting: { ability: "Charisma", prepared: true, starts_at: 2 },
    features: [
      { level: 1, name: "Divine Sense", description: "The presence of strong evil registers on your senses like a noxious odor." },
      { level: 1, name: "Lay on Hands", description: "Your blessed touch can heal wounds." },
      { level: 2, name: "Fighting Style", description: "You adopt a particular style of fighting as your specialty." },
      { level: 2, name: "Divine Smite", description: "When you hit a creature with a melee weapon attack, you can expend one spell slot to deal radiant damage." },
    ],
    source: "SRD",
  },
  {
    name: "Ranger",
    description: "A warrior who combats threats on the edges of civilization",
    hit_die: 10,
    primary_ability: ["Dexterity", "Wisdom"],
    saving_throws: ["Strength", "Dexterity"],
    armor_proficiencies: ["Light armor", "Medium armor", "Shields"],
    weapon_proficiencies: ["Simple weapons", "Martial weapons"],
    skill_choices: { count: 3, options: ["Animal Handling", "Athletics", "Insight", "Investigation", "Nature", "Perception", "Stealth", "Survival"] },
    spellcasting: { ability: "Wisdom", spells_known: 2, starts_at: 2 },
    features: [
      { level: 1, name: "Favored Enemy", description: "You have significant experience studying, tracking, hunting, and even talking to a certain type of enemy." },
      { level: 1, name: "Natural Explorer", description: "You are particularly familiar with one type of natural environment." },
    ],
    source: "SRD",
  },
  {
    name: "Rogue",
    description: "A scoundrel who uses stealth and trickery to overcome obstacles and enemies",
    hit_die: 8,
    primary_ability: ["Dexterity"],
    saving_throws: ["Dexterity", "Intelligence"],
    armor_proficiencies: ["Light armor"],
    weapon_proficiencies: ["Simple weapons", "Hand crossbows", "Longswords", "Rapiers", "Shortswords"],
    skill_choices: { count: 4, options: ["Acrobatics", "Athletics", "Deception", "Insight", "Intimidation", "Investigation", "Perception", "Performance", "Persuasion", "Sleight of Hand", "Stealth"] },
    features: [
      { level: 1, name: "Expertise", description: "Choose two of your skill proficiencies. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies." },
      { level: 1, name: "Sneak Attack", description: "You know how to strike subtly and exploit a foe's distraction." },
      { level: 1, name: "Thieves' Cant", description: "You have learned thieves' cant, a secret mix of dialect, jargon, and code." },
    ],
    source: "SRD",
  },
  {
    name: "Sorcerer",
    description: "A spellcaster who draws on inherent magic from a gift or bloodline",
    hit_die: 6,
    primary_ability: ["Charisma"],
    saving_throws: ["Constitution", "Charisma"],
    armor_proficiencies: [],
    weapon_proficiencies: ["Daggers", "Darts", "Slings", "Quarterstaffs", "Light crossbows"],
    skill_choices: { count: 2, options: ["Arcana", "Deception", "Insight", "Intimidation", "Persuasion", "Religion"] },
    spellcasting: { ability: "Charisma", cantrips: 4, spells_known: 2 },
    features: [
      { level: 1, name: "Spellcasting", description: "An event in your past, or in the life of a parent or ancestor, left an indelible mark on you, infusing you with arcane magic." },
      { level: 1, name: "Sorcerous Origin", description: "Choose a sorcerous origin, which describes the source of your innate magical power." },
      { level: 2, name: "Font of Magic", description: "You tap into a deep wellspring of magic within yourself." },
    ],
    source: "SRD",
  },
  {
    name: "Warlock",
    description: "A wielder of magic that is derived from a bargain with an extraplanar entity",
    hit_die: 8,
    primary_ability: ["Charisma"],
    saving_throws: ["Wisdom", "Charisma"],
    armor_proficiencies: ["Light armor"],
    weapon_proficiencies: ["Simple weapons"],
    skill_choices: { count: 2, options: ["Arcana", "Deception", "History", "Intimidation", "Investigation", "Nature", "Religion"] },
    spellcasting: { ability: "Charisma", cantrips: 2, spells_known: 2, pact_magic: true },
    features: [
      { level: 1, name: "Otherworldly Patron", description: "You have struck a bargain with an otherworldly being of your choice." },
      { level: 1, name: "Pact Magic", description: "Your arcane research and the magic bestowed on you by your patron have given you facility with spells." },
      { level: 2, name: "Eldritch Invocations", description: "In your study of occult lore, you have unearthed eldritch invocations." },
    ],
    source: "SRD",
  },
  {
    name: "Wizard",
    description: "A scholarly magic-user capable of manipulating the structures of reality",
    hit_die: 6,
    primary_ability: ["Intelligence"],
    saving_throws: ["Intelligence", "Wisdom"],
    armor_proficiencies: [],
    weapon_proficiencies: ["Daggers", "Darts", "Slings", "Quarterstaffs", "Light crossbows"],
    skill_choices: { count: 2, options: ["Arcana", "History", "Insight", "Investigation", "Medicine", "Religion"] },
    spellcasting: { ability: "Intelligence", cantrips: 3, spellbook: true },
    features: [
      { level: 1, name: "Spellcasting", description: "As a student of arcane magic, you have a spellbook containing spells that show the first glimmerings of your true power." },
      { level: 1, name: "Arcane Recovery", description: "You have learned to regain some of your magical energy by studying your spellbook." },
      { level: 2, name: "Arcane Tradition", description: "You choose an arcane tradition, shaping your practice of magic." },
    ],
    source: "SRD",
  },
]

const SRD_SPECIES = [
  {
    name: "Dwarf",
    description: "Bold and hardy, dwarves are known as skilled warriors, miners, and workers of stone and metal.",
    speed: 25,
    size: "Medium",
    traits: [
      { name: "Darkvision", description: "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light." },
      { name: "Dwarven Resilience", description: "You have advantage on saving throws against poison, and you have resistance against poison damage." },
      { name: "Dwarven Combat Training", description: "You have proficiency with the battleaxe, handaxe, light hammer, and warhammer." },
      { name: "Stonecunning", description: "Whenever you make an Intelligence (History) check related to the origin of stonework, you are considered proficient and add double your proficiency bonus." },
    ],
    source: "SRD",
  },
  {
    name: "Elf",
    description: "Elves are a magical people of otherworldly grace, living in the world but not entirely part of it.",
    speed: 30,
    size: "Medium",
    traits: [
      { name: "Darkvision", description: "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light." },
      { name: "Keen Senses", description: "You have proficiency in the Perception skill." },
      { name: "Fey Ancestry", description: "You have advantage on saving throws against being charmed, and magic can't put you to sleep." },
      { name: "Trance", description: "Elves don't need to sleep. Instead, they meditate deeply for 4 hours a day." },
    ],
    source: "SRD",
  },
  {
    name: "Halfling",
    description: "The diminutive halflings survive in a world full of larger creatures by avoiding notice or, barring that, avoiding offense.",
    speed: 25,
    size: "Small",
    traits: [
      { name: "Lucky", description: "When you roll a 1 on the d20 for an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll." },
      { name: "Brave", description: "You have advantage on saving throws against being frightened." },
      { name: "Halfling Nimbleness", description: "You can move through the space of any creature that is of a size larger than yours." },
    ],
    source: "SRD",
  },
  {
    name: "Human",
    description: "Humans are the most adaptable and ambitious people among the common races. Whatever drives them, humans are the innovators, the achievers, and the pioneers of the worlds.",
    speed: 30,
    size: "Medium",
    traits: [
      { name: "Resourceful", description: "You gain Heroic Inspiration whenever you finish a Long Rest." },
      { name: "Skillful", description: "You gain proficiency in one skill of your choice." },
      { name: "Versatile", description: "You gain an Origin feat of your choice." },
    ],
    source: "SRD",
  },
  {
    name: "Dragonborn",
    description: "Dragonborn look very much like dragons standing erect in humanoid form, though they lack wings or a tail.",
    speed: 30,
    size: "Medium",
    traits: [
      { name: "Draconic Ancestry", description: "You have draconic ancestry. Choose one type of dragon from the Draconic Ancestry table." },
      { name: "Breath Weapon", description: "You can use your action to exhale destructive energy. Your draconic ancestry determines the size, shape, and damage type of the exhalation." },
      { name: "Damage Resistance", description: "You have resistance to the damage type associated with your draconic ancestry." },
    ],
    source: "SRD",
  },
  {
    name: "Gnome",
    description: "A gnome's energy and enthusiasm for living shines through every inch of their tiny body.",
    speed: 25,
    size: "Small",
    traits: [
      { name: "Darkvision", description: "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light." },
      { name: "Gnome Cunning", description: "You have advantage on Intelligence, Wisdom, and Charisma saving throws against magic." },
    ],
    source: "SRD",
  },
  {
    name: "Half-Elf",
    description: "Half-elves combine what some say are the best qualities of their elf and human parents.",
    speed: 30,
    size: "Medium",
    traits: [
      { name: "Darkvision", description: "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light." },
      { name: "Fey Ancestry", description: "You have advantage on saving throws against being charmed, and magic can't put you to sleep." },
      { name: "Skill Versatility", description: "You gain proficiency in two skills of your choice." },
    ],
    source: "SRD",
  },
  {
    name: "Half-Orc",
    description: "Half-orcs' grayish pigmentation, sloping foreheads, jutting jaws, prominent teeth, and towering builds make their orcish heritage plain for all to see.",
    speed: 30,
    size: "Medium",
    traits: [
      { name: "Darkvision", description: "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light." },
      { name: "Menacing", description: "You gain proficiency in the Intimidation skill." },
      { name: "Relentless Endurance", description: "When you are reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead. You can't use this feature again until you finish a long rest." },
      { name: "Savage Attacks", description: "When you score a critical hit with a melee weapon attack, you can roll one of the weapon's damage dice one additional time." },
    ],
    source: "SRD",
  },
  {
    name: "Tiefling",
    description: "Tieflings are derived from human bloodlines, and in the broadest possible sense, they still look human.",
    speed: 30,
    size: "Medium",
    traits: [
      { name: "Darkvision", description: "You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light." },
      { name: "Hellish Resistance", description: "You have resistance to fire damage." },
      { name: "Infernal Legacy", description: "You know the thaumaturgy cantrip. When you reach 3rd level, you can cast the hellish rebuke spell as a 2nd-level spell once." },
    ],
    source: "SRD",
  },
]

const SRD_BACKGROUNDS = [
  {
    name: "Acolyte",
    description: "You have spent your life in service to a temple, learning sacred rites and providing sacrifices to the god or gods you worship.",
    ability_bonuses: { wisdom: 2, intelligence: 1 },
    skill_proficiencies: ["Insight", "Religion"],
    tool_proficiencies: [],
    feat_granted: "Magic Initiate (Cleric)",
    equipment: [
      { item: "Holy symbol", quantity: 1 },
      { item: "Prayer book or prayer wheel", quantity: 1 },
      { item: "Incense (5 sticks)", quantity: 5 },
      { item: "Vestments", quantity: 1 },
      { item: "Common clothes", quantity: 1 },
      { item: "Gold pieces", quantity: 15 },
    ],
    feature: { name: "Shelter of the Faithful", description: "As an acolyte, you command the respect of those who share your faith, and you can perform the religious ceremonies of your deity." },
    source: "SRD",
  },
  {
    name: "Criminal",
    description: "You are an experienced criminal with a history of breaking the law. You have spent a lot of time among other criminals.",
    ability_bonuses: { dexterity: 2, intelligence: 1 },
    skill_proficiencies: ["Deception", "Stealth"],
    tool_proficiencies: ["Thieves' tools", "One type of gaming set"],
    feat_granted: "Alert",
    equipment: [
      { item: "Crowbar", quantity: 1 },
      { item: "Dark common clothes with hood", quantity: 1 },
      { item: "Gold pieces", quantity: 15 },
    ],
    feature: { name: "Criminal Contact", description: "You have a reliable and trustworthy contact who acts as your liaison to a network of other criminals." },
    source: "SRD",
  },
  {
    name: "Folk Hero",
    description: "You come from a humble social rank, but you are destined for so much more. The people of your home village regard you as their champion.",
    ability_bonuses: { constitution: 2, wisdom: 1 },
    skill_proficiencies: ["Animal Handling", "Survival"],
    tool_proficiencies: ["One type of artisan's tools", "Vehicles (land)"],
    feat_granted: "Tough",
    equipment: [
      { item: "Artisan's tools (one of your choice)", quantity: 1 },
      { item: "Shovel", quantity: 1 },
      { item: "Iron pot", quantity: 1 },
      { item: "Common clothes", quantity: 1 },
      { item: "Gold pieces", quantity: 10 },
    ],
    feature: { name: "Rustic Hospitality", description: "Since you come from the ranks of the common folk, you fit in among them with ease." },
    source: "SRD",
  },
  {
    name: "Noble",
    description: "You understand wealth, power, and privilege. You carry a noble title, and your family owns land, collects taxes, and wields significant political influence.",
    ability_bonuses: { charisma: 2, intelligence: 1 },
    skill_proficiencies: ["History", "Persuasion"],
    tool_proficiencies: ["One type of gaming set"],
    feat_granted: "Skilled",
    equipment: [
      { item: "Fine clothes", quantity: 1 },
      { item: "Signet ring", quantity: 1 },
      { item: "Scroll of pedigree", quantity: 1 },
      { item: "Gold pieces", quantity: 25 },
    ],
    feature: { name: "Position of Privilege", description: "Thanks to your noble birth, people are inclined to think the best of you." },
    source: "SRD",
  },
  {
    name: "Sage",
    description: "You spent years learning the lore of the multiverse. You scoured manuscripts, studied scrolls, and listened to the greatest experts on the subjects that interest you.",
    ability_bonuses: { intelligence: 2, wisdom: 1 },
    skill_proficiencies: ["Arcana", "History"],
    tool_proficiencies: [],
    feat_granted: "Magic Initiate (Wizard)",
    equipment: [
      { item: "Bottle of black ink", quantity: 1 },
      { item: "Quill", quantity: 1 },
      { item: "Small knife", quantity: 1 },
      { item: "Letter from a dead colleague with an unanswered question", quantity: 1 },
      { item: "Common clothes", quantity: 1 },
      { item: "Gold pieces", quantity: 10 },
    ],
    feature: { name: "Researcher", description: "When you attempt to learn or recall a piece of lore, if you do not know that information, you often know where and from whom you can obtain it." },
    source: "SRD",
  },
  {
    name: "Soldier",
    description: "War has been your life for as long as you care to remember. You trained as a youth, studied the use of weapons and armor, and learned basic survival techniques.",
    ability_bonuses: { strength: 2, constitution: 1 },
    skill_proficiencies: ["Athletics", "Intimidation"],
    tool_proficiencies: ["One type of gaming set", "Vehicles (land)"],
    feat_granted: "Savage Attacker",
    equipment: [
      { item: "Insignia of rank", quantity: 1 },
      { item: "Trophy from a fallen enemy", quantity: 1 },
      { item: "Bone dice set or deck of cards", quantity: 1 },
      { item: "Common clothes", quantity: 1 },
      { item: "Gold pieces", quantity: 10 },
    ],
    feature: { name: "Military Rank", description: "You have a military rank from your career as a soldier. Soldiers loyal to your former military organization still recognize your authority." },
    source: "SRD",
  },
]

const SRD_SPELLS = [
  // Cantrips
  { name: "Fire Bolt", level: 0, school: "Evocation", casting_time: "1 action", range: "120 feet", components: ["V", "S"], duration: "Instantaneous", concentration: false, ritual: false, description: "You hurl a mote of fire at a creature or object within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 fire damage.", classes: ["Sorcerer", "Wizard"], source: "SRD" },
  { name: "Light", level: 0, school: "Evocation", casting_time: "1 action", range: "Touch", components: ["V", "M"], material: "A firefly or phosphorescent moss", duration: "1 hour", concentration: false, ritual: false, description: "You touch one object that is no larger than 10 feet in any dimension. Until the spell ends, the object sheds bright light in a 20-foot radius and dim light for an additional 20 feet.", classes: ["Bard", "Cleric", "Sorcerer", "Wizard"], source: "SRD" },
  { name: "Mage Hand", level: 0, school: "Conjuration", casting_time: "1 action", range: "30 feet", components: ["V", "S"], duration: "1 minute", concentration: false, ritual: false, description: "A spectral, floating hand appears at a point you choose within range. The hand lasts for the duration or until you dismiss it as an action.", classes: ["Bard", "Sorcerer", "Warlock", "Wizard"], source: "SRD" },
  { name: "Prestidigitation", level: 0, school: "Transmutation", casting_time: "1 action", range: "10 feet", components: ["V", "S"], duration: "Up to 1 hour", concentration: false, ritual: false, description: "This spell is a minor magical trick that novice spellcasters use for practice.", classes: ["Bard", "Sorcerer", "Warlock", "Wizard"], source: "SRD" },
  { name: "Sacred Flame", level: 0, school: "Evocation", casting_time: "1 action", range: "60 feet", components: ["V", "S"], duration: "Instantaneous", concentration: false, ritual: false, description: "Flame-like radiance descends on a creature that you can see within range. The target must succeed on a Dexterity saving throw or take 1d8 radiant damage.", classes: ["Cleric"], source: "SRD" },
  { name: "Eldritch Blast", level: 0, school: "Evocation", casting_time: "1 action", range: "120 feet", components: ["V", "S"], duration: "Instantaneous", concentration: false, ritual: false, description: "A beam of crackling energy streaks toward a creature within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 force damage.", classes: ["Warlock"], source: "SRD" },
  
  // Level 1
  { name: "Cure Wounds", level: 1, school: "Evocation", casting_time: "1 action", range: "Touch", components: ["V", "S"], duration: "Instantaneous", concentration: false, ritual: false, description: "A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier.", higher_levels: "When you cast this spell using a spell slot of 2nd level or higher, the healing increases by 1d8 for each slot level above 1st.", classes: ["Bard", "Cleric", "Druid", "Paladin", "Ranger"], source: "SRD" },
  { name: "Magic Missile", level: 1, school: "Evocation", casting_time: "1 action", range: "120 feet", components: ["V", "S"], duration: "Instantaneous", concentration: false, ritual: false, description: "You create three glowing darts of magical force. Each dart hits a creature of your choice that you can see within range. A dart deals 1d4 + 1 force damage to its target.", higher_levels: "When you cast this spell using a spell slot of 2nd level or higher, the spell creates one more dart for each slot level above 1st.", classes: ["Sorcerer", "Wizard"], source: "SRD" },
  { name: "Shield", level: 1, school: "Abjuration", casting_time: "1 reaction", range: "Self", components: ["V", "S"], duration: "1 round", concentration: false, ritual: false, description: "An invisible barrier of magical force appears and protects you. Until the start of your next turn, you have a +5 bonus to AC.", classes: ["Sorcerer", "Wizard"], source: "SRD" },
  { name: "Detect Magic", level: 1, school: "Divination", casting_time: "1 action", range: "Self", components: ["V", "S"], duration: "Concentration, up to 10 minutes", concentration: true, ritual: true, description: "For the duration, you sense the presence of magic within 30 feet of you.", classes: ["Bard", "Cleric", "Druid", "Paladin", "Ranger", "Sorcerer", "Wizard"], source: "SRD" },
  { name: "Thunderwave", level: 1, school: "Evocation", casting_time: "1 action", range: "Self (15-foot cube)", components: ["V", "S"], duration: "Instantaneous", concentration: false, ritual: false, description: "A wave of thunderous force sweeps out from you. Each creature in a 15-foot cube originating from you must make a Constitution saving throw.", classes: ["Bard", "Druid", "Sorcerer", "Wizard"], source: "SRD" },
  { name: "Healing Word", level: 1, school: "Evocation", casting_time: "1 bonus action", range: "60 feet", components: ["V"], duration: "Instantaneous", concentration: false, ritual: false, description: "A creature of your choice that you can see within range regains hit points equal to 1d4 + your spellcasting ability modifier.", classes: ["Bard", "Cleric", "Druid"], source: "SRD" },
  
  // Level 2
  { name: "Misty Step", level: 2, school: "Conjuration", casting_time: "1 bonus action", range: "Self", components: ["V"], duration: "Instantaneous", concentration: false, ritual: false, description: "Briefly surrounded by silvery mist, you teleport up to 30 feet to an unoccupied space that you can see.", classes: ["Sorcerer", "Warlock", "Wizard"], source: "SRD" },
  { name: "Hold Person", level: 2, school: "Enchantment", casting_time: "1 action", range: "60 feet", components: ["V", "S", "M"], material: "A small, straight piece of iron", duration: "Concentration, up to 1 minute", concentration: true, ritual: false, description: "Choose a humanoid that you can see within range. The target must succeed on a Wisdom saving throw or be paralyzed for the duration.", classes: ["Bard", "Cleric", "Druid", "Sorcerer", "Warlock", "Wizard"], source: "SRD" },
  { name: "Scorching Ray", level: 2, school: "Evocation", casting_time: "1 action", range: "120 feet", components: ["V", "S"], duration: "Instantaneous", concentration: false, ritual: false, description: "You create three rays of fire and hurl them at targets within range. You can hurl them at one target or several.", classes: ["Sorcerer", "Wizard"], source: "SRD" },
  
  // Level 3
  { name: "Fireball", level: 3, school: "Evocation", casting_time: "1 action", range: "150 feet", components: ["V", "S", "M"], material: "A tiny ball of bat guano and sulfur", duration: "Instantaneous", concentration: false, ritual: false, description: "A bright streak flashes from your pointing finger to a point you choose within range and then blossoms with a low roar into an explosion of flame. Each creature in a 20-foot-radius sphere centered on that point must make a Dexterity saving throw. A target takes 8d6 fire damage on a failed save, or half as much damage on a successful one.", higher_levels: "When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d6 for each slot level above 3rd.", classes: ["Sorcerer", "Wizard"], source: "SRD" },
  { name: "Counterspell", level: 3, school: "Abjuration", casting_time: "1 reaction", range: "60 feet", components: ["S"], duration: "Instantaneous", concentration: false, ritual: false, description: "You attempt to interrupt a creature in the process of casting a spell. If the creature is casting a spell of 3rd level or lower, its spell fails and has no effect.", classes: ["Sorcerer", "Warlock", "Wizard"], source: "SRD" },
  { name: "Revivify", level: 3, school: "Necromancy", casting_time: "1 action", range: "Touch", components: ["V", "S", "M"], material: "Diamonds worth 300 gp, which the spell consumes", duration: "Instantaneous", concentration: false, ritual: false, description: "You touch a creature that has died within the last minute. That creature returns to life with 1 hit point.", classes: ["Cleric", "Druid", "Paladin", "Ranger"], source: "SRD" },
]

const SRD_FEATS = [
  { name: "Alert", description: "Always on the lookout for danger, you gain the following benefits: You gain a +5 bonus to initiative. You can't be surprised while you are conscious. Other creatures don't gain advantage on attack rolls against you as a result of being unseen by you.", prerequisite: null, benefits: { initiative_bonus: 5, cannot_be_surprised: true }, source: "SRD" },
  { name: "Tough", description: "Your hit point maximum increases by an amount equal to twice your level when you gain this feat. Whenever you gain a level thereafter, your hit point maximum increases by an additional 2 hit points.", prerequisite: null, benefits: { hp_bonus_per_level: 2 }, source: "SRD" },
  { name: "Skilled", description: "You gain proficiency in any combination of three skills or tools of your choice.", prerequisite: null, benefits: { skill_proficiencies: 3 }, source: "SRD" },
  { name: "Magic Initiate (Cleric)", description: "Choose a class: bard, cleric, druid, sorcerer, warlock, or wizard. You learn two cantrips and one 1st-level spell of your choice from that class's spell list.", prerequisite: null, benefits: { cantrips: 2, spells: 1, spellcasting_class: "Cleric" }, source: "SRD" },
  { name: "Magic Initiate (Wizard)", description: "You learn two cantrips and one 1st-level spell of your choice from the wizard spell list.", prerequisite: null, benefits: { cantrips: 2, spells: 1, spellcasting_class: "Wizard" }, source: "SRD" },
  { name: "Savage Attacker", description: "Once per turn when you roll damage for a melee weapon attack, you can reroll the weapon's damage dice and use either total.", prerequisite: null, benefits: { reroll_damage: true }, source: "SRD" },
]

const SRD_EQUIPMENT = [
  // Weapons - Simple Melee
  { name: "Club", category: "Weapon", subcategory: "Simple Melee", cost: { amount: 1, unit: "sp" }, weight: 2, properties: { damage: "1d4", damage_type: "bludgeoning", properties: ["Light"] }, source: "SRD" },
  { name: "Dagger", category: "Weapon", subcategory: "Simple Melee", cost: { amount: 2, unit: "gp" }, weight: 1, properties: { damage: "1d4", damage_type: "piercing", properties: ["Finesse", "Light", "Thrown (20/60)"] }, source: "SRD" },
  { name: "Handaxe", category: "Weapon", subcategory: "Simple Melee", cost: { amount: 5, unit: "gp" }, weight: 2, properties: { damage: "1d6", damage_type: "slashing", properties: ["Light", "Thrown (20/60)"] }, source: "SRD" },
  { name: "Quarterstaff", category: "Weapon", subcategory: "Simple Melee", cost: { amount: 2, unit: "sp" }, weight: 4, properties: { damage: "1d6", damage_type: "bludgeoning", properties: ["Versatile (1d8)"] }, source: "SRD" },
  
  // Weapons - Simple Ranged
  { name: "Light Crossbow", category: "Weapon", subcategory: "Simple Ranged", cost: { amount: 25, unit: "gp" }, weight: 5, properties: { damage: "1d8", damage_type: "piercing", properties: ["Ammunition (80/320)", "Loading", "Two-Handed"] }, source: "SRD" },
  { name: "Shortbow", category: "Weapon", subcategory: "Simple Ranged", cost: { amount: 25, unit: "gp" }, weight: 2, properties: { damage: "1d6", damage_type: "piercing", properties: ["Ammunition (80/320)", "Two-Handed"] }, source: "SRD" },
  
  // Weapons - Martial Melee
  { name: "Longsword", category: "Weapon", subcategory: "Martial Melee", cost: { amount: 15, unit: "gp" }, weight: 3, properties: { damage: "1d8", damage_type: "slashing", properties: ["Versatile (1d10)"] }, source: "SRD" },
  { name: "Rapier", category: "Weapon", subcategory: "Martial Melee", cost: { amount: 25, unit: "gp" }, weight: 2, properties: { damage: "1d8", damage_type: "piercing", properties: ["Finesse"] }, source: "SRD" },
  { name: "Greatsword", category: "Weapon", subcategory: "Martial Melee", cost: { amount: 50, unit: "gp" }, weight: 6, properties: { damage: "2d6", damage_type: "slashing", properties: ["Heavy", "Two-Handed"] }, source: "SRD" },
  { name: "Battleaxe", category: "Weapon", subcategory: "Martial Melee", cost: { amount: 10, unit: "gp" }, weight: 4, properties: { damage: "1d8", damage_type: "slashing", properties: ["Versatile (1d10)"] }, source: "SRD" },
  
  // Armor - Light
  { name: "Leather Armor", category: "Armor", subcategory: "Light Armor", cost: { amount: 10, unit: "gp" }, weight: 10, properties: { ac: 11, modifier: "Dex" }, description: "The breastplate and shoulder protectors of this armor are made of leather.", source: "SRD" },
  { name: "Studded Leather Armor", category: "Armor", subcategory: "Light Armor", cost: { amount: 45, unit: "gp" }, weight: 13, properties: { ac: 12, modifier: "Dex" }, description: "Made from tough but flexible leather, studded leather is reinforced with close-set rivets or spikes.", source: "SRD" },
  
  // Armor - Medium
  { name: "Chain Shirt", category: "Armor", subcategory: "Medium Armor", cost: { amount: 50, unit: "gp" }, weight: 20, properties: { ac: 13, modifier: "Dex (max 2)" }, description: "Made of interlocking metal rings, a chain shirt is worn between layers of clothing.", source: "SRD" },
  { name: "Scale Mail", category: "Armor", subcategory: "Medium Armor", cost: { amount: 50, unit: "gp" }, weight: 45, properties: { ac: 14, modifier: "Dex (max 2)", disadvantage: "Stealth" }, description: "This armor consists of a coat and leggings of leather covered with overlapping pieces of metal.", source: "SRD" },
  { name: "Breastplate", category: "Armor", subcategory: "Medium Armor", cost: { amount: 400, unit: "gp" }, weight: 20, properties: { ac: 14, modifier: "Dex (max 2)" }, description: "This armor consists of a fitted metal chest piece worn with supple leather.", source: "SRD" },
  
  // Armor - Heavy
  { name: "Chain Mail", category: "Armor", subcategory: "Heavy Armor", cost: { amount: 75, unit: "gp" }, weight: 55, properties: { ac: 16, strength_requirement: 13, disadvantage: "Stealth" }, description: "Made of interlocking metal rings, chain mail includes a layer of quilted fabric worn underneath.", source: "SRD" },
  { name: "Plate Armor", category: "Armor", subcategory: "Heavy Armor", cost: { amount: 1500, unit: "gp" }, weight: 65, properties: { ac: 18, strength_requirement: 15, disadvantage: "Stealth" }, description: "Plate consists of shaped, interlocking metal plates to cover the entire body.", source: "SRD" },
  
  // Shield
  { name: "Shield", category: "Armor", subcategory: "Shield", cost: { amount: 10, unit: "gp" }, weight: 6, properties: { ac_bonus: 2 }, description: "A shield is made from wood or metal and is carried in one hand.", source: "SRD" },
  
  // Adventuring Gear
  { name: "Backpack", category: "Adventuring Gear", subcategory: "Container", cost: { amount: 2, unit: "gp" }, weight: 5, properties: { capacity: "1 cubic foot/30 pounds" }, source: "SRD" },
  { name: "Rope (50 feet)", category: "Adventuring Gear", subcategory: "Standard Gear", cost: { amount: 1, unit: "gp" }, weight: 10, properties: { length: "50 feet" }, source: "SRD" },
  { name: "Torch", category: "Adventuring Gear", subcategory: "Standard Gear", cost: { amount: 1, unit: "cp" }, weight: 1, properties: { light: "20 feet bright, 20 feet dim", duration: "1 hour" }, source: "SRD" },
  { name: "Rations (1 day)", category: "Adventuring Gear", subcategory: "Food and Drink", cost: { amount: 5, unit: "sp" }, weight: 2, properties: {}, source: "SRD" },
  { name: "Waterskin", category: "Adventuring Gear", subcategory: "Container", cost: { amount: 2, unit: "sp" }, weight: 5, properties: { capacity: "4 pints" }, source: "SRD" },
  { name: "Thieves' Tools", category: "Tool", subcategory: "Artisan's Tools", cost: { amount: 25, unit: "gp" }, weight: 1, description: "This set of tools includes a small file, a set of lock picks, a small mirror, a set of narrow-bladed scissors, and a pair of pliers.", source: "SRD" },
]

export async function POST() {
  try {
    const supabase = await createClient()
    
    // Insert classes
    const { error: classesError } = await supabase
      .from("classes")
      .upsert(SRD_CLASSES, { onConflict: "name" })
    
    if (classesError) throw new Error(`Classes: ${classesError.message}`)

    // Insert species
    const { error: speciesError } = await supabase
      .from("species")
      .upsert(SRD_SPECIES, { onConflict: "name" })
    
    if (speciesError) throw new Error(`Species: ${speciesError.message}`)

    // Insert backgrounds
    const { error: backgroundsError } = await supabase
      .from("backgrounds")
      .upsert(SRD_BACKGROUNDS, { onConflict: "name" })
    
    if (backgroundsError) throw new Error(`Backgrounds: ${backgroundsError.message}`)

    // Insert spells
    const { error: spellsError } = await supabase
      .from("spells")
      .upsert(SRD_SPELLS, { onConflict: "name" })
    
    if (spellsError) throw new Error(`Spells: ${spellsError.message}`)

    // Insert feats
    const { error: featsError } = await supabase
      .from("feats")
      .upsert(SRD_FEATS, { onConflict: "name" })
    
    if (featsError) throw new Error(`Feats: ${featsError.message}`)

    // Insert equipment
    const { error: equipmentError } = await supabase
      .from("equipment")
      .upsert(SRD_EQUIPMENT, { onConflict: "name" })
    
    if (equipmentError) throw new Error(`Equipment: ${equipmentError.message}`)

    const total = 
      SRD_CLASSES.length + 
      SRD_SPECIES.length + 
      SRD_BACKGROUNDS.length + 
      SRD_SPELLS.length + 
      SRD_FEATS.length + 
      SRD_EQUIPMENT.length

    return NextResponse.json({ 
      success: true, 
      total,
      breakdown: {
        classes: SRD_CLASSES.length,
        species: SRD_SPECIES.length,
        backgrounds: SRD_BACKGROUNDS.length,
        spells: SRD_SPELLS.length,
        feats: SRD_FEATS.length,
        equipment: SRD_EQUIPMENT.length,
      }
    })
  } catch (error) {
    console.error("Seed error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to seed database" },
      { status: 500 }
    )
  }
}
