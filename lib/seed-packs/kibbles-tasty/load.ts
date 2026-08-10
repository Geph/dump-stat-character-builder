import type { ImportContent } from "@/lib/import/content-schema"
import craftingFeats from "./kibbles-crafting-feats.json"
import inventor from "./kibbles-inventor-class.json"
import occultist from "./kibbles-occultist-class.json"
import psion from "./kibbles-psion-class.json"
import psionics from "./kibbles-psionics-custom.json"
import spells from "./kibbles-spells.json"
import warden from "./kibbles-warden-class.json"
import manifest from "./manifest.json"

export function loadKibblesTastyPack() {
  return {
    manifest,
    source: "Kibbles Tasty" as const,
    files: [
      craftingFeats,
      inventor,
      occultist,
      psion,
      psionics,
      spells,
      warden,
    ] as ImportContent[],
  }
}
