/**
 * Kept separate from `feature-sheet-display.ts` so low-level modules can normalize a stored
 * `sheetDisplay` without pulling in the sheet-action classifiers. `modifier-catalog` imports this;
 * routing it through `feature-sheet-display` closes an import cycle back onto
 * `modifier-instance-builders` and leaves `fxInstance` in TDZ at module init.
 */
import type { FeatureSheetDisplay } from "@/lib/types"

export function normalizeFeatureSheetDisplay(
  display: FeatureSheetDisplay | null | undefined,
): FeatureSheetDisplay | null {
  if (!display || typeof display !== "object") return null
  return {
    abilitiesActions: display.abilitiesActions ?? false,
    combatActions: display.combatActions ?? false,
    featuresTab: display.featuresTab ?? false,
    restDialogues: display.restDialogues,
  }
}
