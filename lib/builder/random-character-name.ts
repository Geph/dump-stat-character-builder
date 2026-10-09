type NameStyle = { starts: string; ends: string; families: string }

// Original fantasy syllables, not publisher name lists. Styles are suggestions,
// not restrictions on what a player can name a character.
const STYLES: Record<string, NameStyle> = {
  human: { starts: "Mar Kel Jas Ren Tal Cor An Ves", ends: "a en is on ia in o an", families: "Vale Mercer Reed Fenner Calder Moss Arden Pike" },
  elf: { starts: "Ae Lio Syl Eri Tha Nai Vae Ily", ends: "riel lan thir wyn lian rea neth leis", families: "Moonwillow Starwater Dawnleaf Silverbough Mistweaver Rainweft" },
  dwarf: { starts: "Brom Dur Keld Tor Harn Vond Brin Dagna", ends: "rik ra din dra gar rin dis rum", families: "Coppervein Flinthearth Deepanvil Stonewake Ironridge Amberforge" },
  halfling: { starts: "Pip Mer Tans Ros Bel Wil Ned Lin", ends: "pin ry la do na by lin nie", families: "Cloverfield Bramblepot Greenkettle Honeybank Applehill Fernfoot" },
  gnome: { starts: "Fizz Nim Wob Tink Pel Zib Quen Bib", ends: "wick ble lin nix elle bin etta pen", families: "Copperwhistle Buttonwheel Sparkspool Dapplecog Pebblewink Brassbloom" },
  orc: { starts: "Grak Vur Dor Khar Mog Ur Brok Zar", ends: "ka un ash ra og ak en ush", families: "Ashfang Stonefist Redcrag Stormtusk Ironstep Flintscar" },
  dragonborn: { starts: "Arj Vesk Kraz Rhaz Drax Ssar Velk Thar", ends: "ith ax ara esh or zin ir ash", families: "Krazavor Veshkalar Arzathir Threxalon Oshkarin Zeralax" },
  tiefling: { starts: "Zev Nyx Vesh Az Kes Iri Mal Sha", ends: "ira eth iel a za or is en", families: "Promise Riddle Solace Revel Cinder Fortune Resolve Wonder" },
  goliath: { starts: "Kav Thon Vaun Il Gor Nau Oth Ker", ends: "ak ia an eth ul ai or a", families: "Cloudstrider Ridgekeeper Peakwalker Stonecaller Frostclimber Thunderhand" },
  aasimar: { starts: "Aur Eli Sov Luma Iri Ser Orel Vea", ends: "iel ia en a ith or in is", families: "Dawnkeeper Lightwell Goldwing Starfall Sunweaver Brightwater" },
  goblin: { starts: "Zik Grib Nok Vez Tiz Skab Rik Yip", ends: "bit zik it ak kin nok ra ik", families: "Tinbutton Quickheel Rustspoon Nettlewick Twitchcap Coppertooth" },
  genasi: { starts: "Ashe Ora Zeph Ka Vael Sha Neri Pyr", ends: "a en is ra in el o ai", families: "Mistflow Emberwake Flintwave Cloudrift Rainshard Cinderbrook" },
}

function pick(values: string, random: () => number): string {
  const items = values.split(" ")
  return items[Math.floor(random() * items.length)]
}

export function nameStyleForSpecies(species?: string | null): string | undefined {
  const name = (species ?? "").toLowerCase().replace(/[^a-z]+/g, " ").trim()
  const tokens = name.split(" ")
  if (tokens.includes("elven") || tokens.includes("elf")) return "elf"
  if (tokens.includes("dwarven") || tokens.includes("dwarf") || tokens.includes("duergar")) return "dwarf"
  return Object.keys(STYLES).find((key) => tokens.includes(key))
}

export function generateRandomCharacterName(species?: string | null, random = Math.random): string {
  const keys = Object.keys(STYLES)
  const style = STYLES[nameStyleForSpecies(species) ?? keys[Math.floor(random() * keys.length)]]
  const given = pick(style.starts, random) + pick(style.ends, random)
  let families = style.families
  if (nameStyleForSpecies(species) === "genasi") {
    const element = (species ?? "").toLowerCase()
    if (/\bearth\b/.test(element)) families = "Flintwake Quartzheart Shalehand Onyxvale Ambercrag Stonebloom"
    else if (/\bfire\b/.test(element)) families = "Cinderwake Emberdance Ashglow Flareheart Coalbright Sparkfall"
    else if (/\bwater\b/.test(element)) families = "Tideweft Foamwalker Reefsong Mistflow Rainwell Deepcurrent"
    else if (/\bair\b/.test(element)) families = "Cloudrift Windwhisper Skyweaver Galefoot Breezeveil Stormsail"
  }
  return `${given} ${pick(families, random)}`
}
