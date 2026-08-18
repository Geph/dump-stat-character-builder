import type { ImportContent } from "@/lib/import/content-schema"
import backgrounds from "./kibbles-backgrounds.json"
import craftingFeats from "./kibbles-crafting-feats.json"
import inventor from "./kibbles-inventor-class.json"
import occultist from "./kibbles-occultist-class.json"
import psion from "./kibbles-psion-class.json"
import psionics from "./kibbles-psionics-custom.json"
import species from "./kibbles-species.json"
import spells from "./kibbles-spells.json"
import warden from "./kibbles-warden-class.json"
import manifest from "./manifest.json"

export function loadKibblesTastyPack() {
  return {
    manifest,
    source: "Kibbles Tasty" as const,
    files: [
      backgrounds,
      craftingFeats,
      inventor,
      occultist,
      psion,
      psionics,
      species,
      spells,
      warden,
    ] as ImportContent[],
  }
}
