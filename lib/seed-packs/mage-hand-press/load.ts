import type { ImportContent } from "@/lib/import/content-schema"
import alchemist from "./magehandpress-alchemist-class.json"
import captain from "./magehandpress-captain-class.json"
import craftsman from "./magehandpress-craftsman-class.json"
import gunslinger from "./magehandpress-gunslinger-class.json"
import investigator from "./magehandpress-investigator-class.json"
import martyr from "./magehandpress-martyr-class.json"
import necromancer from "./magehandpress-necromancer-class.json"
import vagabond from "./magehandpress-vagabond-class.json"
import warden from "./magehandpress-warden-class.json"
import warmage from "./magehandpress-warmage-class.json"
import witch from "./magehandpress-witch-class.json"
import masteries from "./magehandpress-masteries-custom.json"
import spells from "./magehandpress-spells.json"
import manifest from "./manifest.json"

export function loadMageHandPressPack() {
  return {
    manifest,
    source: "Mage Hand Press" as const,
    files: [
      // Shared catalogs first so class imports can resolve mastery / spell refs.
      masteries,
      spells,
      alchemist,
      captain,
      craftsman,
      gunslinger,
      investigator,
      martyr,
      necromancer,
      vagabond,
      warden,
      warmage,
      witch,
    ] as ImportContent[],
  }
}
