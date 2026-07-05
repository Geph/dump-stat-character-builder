import { SHEET_FEATURES_PANEL } from "@/lib/character/sheet-status-colors"
import {
  activationCostAmount,
  canSpendActivationUses,
} from "@/lib/character/magic-item-activation"
import type { ResourceTrackerEntry } from "@/components/character-sheet/resource-uses-tracker"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import type { ResolveUsesContext } from "@/lib/compendium/resolve-uses-config"

type MagicItemPowersPanelProps = {
  powers: MagicItemPower[]
  activeToggleIds: ReadonlySet<string>
  onTogglePower: (toggleId: string, active: boolean) => void
  resourceEntries?: ResourceTrackerEntry[]
  usedResourcesById?: Record<string, number>
  resolveContext?: ResolveUsesContext
  classDetails?: CharacterClassDetail[]
  onActivatePower?: (power: MagicItemPower) => void
}

export function MagicItemPowersPanel({
  powers,
  activeToggleIds,
  onTogglePower,
  resourceEntries = [],
  usedResourcesById = {},
  resolveContext = {},
  classDetails = [],
  onActivatePower,
}: MagicItemPowersPanelProps) {
  if (!powers.length) return null

  return (
    <section className={`${SHEET_FEATURES_PANEL} rounded-xl p-3 border border-border`}>
      <h2 className="text-sm font-bold mb-2">Magic Item Powers</h2>
      <div className="space-y-2">
        {powers.map((power) => {
          if (power.kind === "conditional" && power.toggleId) {
            const active = activeToggleIds.has(power.toggleId)
            return (
              <label
                key={`${power.itemId}-${power.powerId}`}
                className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(event) => onTogglePower(power.toggleId!, event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-primary shrink-0"
                />
                <span>
                  <span className="font-semibold text-foreground">{power.itemName}</span>
                  <span className="text-muted-foreground"> — </span>
                  <span>{power.label}</span>
                  <span className="block text-[10px] text-muted-foreground mt-0.5">
                    Conditional — off by default
                  </span>
                </span>
              </label>
            )
          }

          if (power.kind === "activation" || (power.kind === "uses" && power.activationUses)) {
            const canActivate = canSpendActivationUses({
              uses: power.activationUses,
              resourceEntries,
              usedResourcesById,
              resolveContext,
              classDetails,
            })
            const cost = activationCostAmount(power.activationUses)
            return (
              <div
                key={`${power.itemId}-${power.powerId}`}
                className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm flex items-start justify-between gap-2"
              >
                <span>
                  <span className="font-semibold text-foreground">{power.itemName}</span>
                  <span className="text-muted-foreground"> — </span>
                  <span>{power.label}</span>
                  {power.activationUses?.type === "class_resource" ? (
                    <span className="block text-[10px] text-muted-foreground mt-0.5">
                      Costs {cost} from {power.activationUses.classResourceKey} pool
                    </span>
                  ) : null}
                </span>
                {onActivatePower ? (
                  <button
                    type="button"
                    disabled={!canActivate}
                    onClick={() => onActivatePower(power)}
                    className="shrink-0 rounded-md border border-border bg-background px-2 py-1 text-[10px] font-semibold disabled:opacity-40"
                  >
                    Use
                  </button>
                ) : null}
              </div>
            )
          }

          return (
            <div
              key={`${power.itemId}-${power.powerId}`}
              className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm"
            >
              <span className="font-semibold text-foreground">{power.itemName}</span>
              <span className="text-muted-foreground"> — </span>
              <span>{power.label}</span>
              <span className="block text-[10px] text-muted-foreground mt-0.5 capitalize">
                {power.kind === "uses" ? "Activatable power" : "Passive"}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
