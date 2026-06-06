const FIRST_NAMES = [
  "Aldric",
  "Bryn",
  "Caelan",
  "Dara",
  "Elara",
  "Finn",
  "Greta",
  "Haldor",
  "Isolde",
  "Joren",
  "Kael",
  "Lyra",
  "Mira",
  "Nolan",
  "Orin",
  "Petra",
  "Quinn",
  "Rowan",
  "Sera",
  "Thorne",
  "Una",
  "Vesper",
  "Wren",
  "Yara",
  "Zephyr",
]

const EPITHETS = [
  "Ashwalker",
  "Brightblade",
  "Dawnseeker",
  "Emberfall",
  "Frostwind",
  "Goldhand",
  "Ironheart",
  "Nightwhisper",
  "Oakenshield",
  "Raveneye",
  "Silverquill",
  "Stormborn",
  "Thistlebrook",
  "Truearrow",
  "Wildroot",
]

const PERSONALITY_TRAITS = [
  "I speak only when I have something worth saying, but I listen closely to everyone.",
  "I treat strangers like old friends until they give me a reason not to.",
  "I keep a small token from home and touch it when I need courage.",
  "I laugh loudly at my own jokes, even when no one else does.",
  "I catalog odd facts about places and people in a worn journal.",
  "I fidget with my gear whenever plans change unexpectedly.",
  "I compliment skilled work, whether it is a blade, a spell, or a meal.",
  "I distrust nobility on principle, though I try not to show it.",
  "I hum old marching songs when I am nervous.",
  "I never pass up a chance to try unfamiliar food.",
]

const IDEALS = [
  "Freedom — chains are meant to be broken, whether of steel or tradition.",
  "Duty — a promise made is a debt that must be paid.",
  "Discovery — every ruin holds a truth the world forgot.",
  "Compassion — strength exists to shield those who have none.",
  "Ambition — I will carve a name that outlasts my lifetime.",
  "Balance — extremes break people; moderation keeps them whole.",
  "Justice — wrongs left unanswered invite greater ones.",
  "Loyalty — my companions are my family, chosen and earned.",
]

const BONDS = [
  "I owe my life to a mentor who vanished before I could repay them.",
  "A sibling still lives in the town I fled; I send coin when I can.",
  "An heirloom weapon is the last proof of my family's honor.",
  "I seek the person who framed me for a crime I did not commit.",
  "My traveling companions are the first people who ever believed in me.",
  "I protect a small shrine that no one else remembers.",
  "A debt to a guild master will follow me until it is settled.",
  "I promised a dying friend I would finish what we started together.",
]

const FLAWS = [
  "I trust people too quickly and hate admitting I was fooled.",
  "Gold loosens my tongue and my morals in equal measure.",
  "I hold grudges long after everyone else has moved on.",
  "I freeze when innocent lives are at stake, afraid of choosing wrong.",
  "I cannot resist a wager, even when the odds are cruel.",
  "I keep secrets that should be shared with my allies.",
  "Pride makes me refuse help until disaster is already unfolding.",
  "I speak blunt truths that turn potential friends into enemies.",
]

const BACKSTORY_HOOKS = [
  "Raised on the road, I learned to read weather and people before I learned letters.",
  "I apprenticed under a strict master whose final lesson was to send me away.",
  "War took my home; I survived by doing work no one else wanted.",
  "A chance discovery in a market crate changed the direction of my life.",
  "I left a comfortable life after witnessing injustice the authorities ignored.",
  "An old map, half burned, pointed me toward a destination I still pursue.",
  "I earned my first coin telling stories; some were even true.",
  "A patron funded my training on the condition I would one day repay the favor.",
]

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function pickRandomUnique<T>(items: T[], count: number): T[] {
  const pool = [...items]
  const picked: T[] = []
  while (picked.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length)
    picked.push(pool.splice(index, 1)[0])
  }
  return picked
}

export type RandomCharacterDetails = {
  name: string
  personality_traits: string
  ideals: string
  bonds: string
  flaws: string
  backstory: string
}

export function generateRandomCharacterDetails(): RandomCharacterDetails {
  const name = `${pickRandom(FIRST_NAMES)} ${pickRandom(EPITHETS)}`
  const [traitA, traitB] = pickRandomUnique(PERSONALITY_TRAITS, 2)
  const hook = pickRandom(BACKSTORY_HOOKS)
  const bond = pickRandom(BONDS)
  const flaw = pickRandom(FLAWS)

  return {
    name,
    personality_traits: `${traitA} ${traitB}`,
    ideals: pickRandom(IDEALS),
    bonds: bond,
    flaws: flaw,
    backstory: `${hook} ${bond} That path led me here — and the flaw I wrestle with most is this: ${flaw.toLowerCase()}`,
  }
}
