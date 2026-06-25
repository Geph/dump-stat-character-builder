import { isMagicItem } from "@/lib/compendium/equipment-attunement"
import type { Equipment } from "@/lib/types"

export function MagicEquipmentBadges({ item }: { item: Equipment }) {
  if (!isMagicItem(item)) return null
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-magenta/10 text-magenta font-semibold uppercase tracking-wide">
        Magic
      </span>
      {item.rarity ? (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
          {item.rarity}
        </span>
      ) : null}
      {item.magic_item_category ? (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary/10 text-secondary font-medium">
          {item.magic_item_category}
        </span>
      ) : null}
      {item.requires_attunement ? (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange/10 text-orange font-medium">
          Attunement
        </span>
      ) : null}
    </span>
  )
}
