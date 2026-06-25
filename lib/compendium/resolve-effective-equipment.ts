import type { Equipment } from "@/lib/types"
import { isMagicItem } from "@/lib/compendium/equipment-attunement"
import { resolveBaseEquipmentId } from "@/lib/compendium/equipment-magic"

function mergeProperties(
  base: Equipment["properties"],
  magic: Equipment["properties"],
): Equipment["properties"] {
  if (base && typeof base === "object" && !Array.isArray(base)) {
    const magicRecord =
      magic && typeof magic === "object" && !Array.isArray(magic)
        ? (magic as Record<string, unknown>)
        : {}
    return { ...(base as Record<string, unknown>), ...magicRecord }
  }
  return magic ?? base
}

/** Merge a magic item with its selected (or inferred) mundane base for combat/display stats. */
export function resolveEffectiveEquipment(
  item: Equipment,
  catalog: Equipment[],
  options?: { selectedBaseId?: string | null },
): Equipment {
  if (!isMagicItem(item)) return item

  const baseId = resolveBaseEquipmentId(item, catalog, options?.selectedBaseId)
  if (!baseId) return item

  const base = catalog.find((entry) => entry.id === baseId)
  if (!base) return item

  return {
    ...base,
    ...item,
    id: item.id,
    name: item.name,
    description: item.description ?? base.description,
    category: item.category || base.category,
    subcategory: item.subcategory ?? base.subcategory,
    cost: item.cost ?? base.cost,
    weight: item.weight ?? base.weight,
    properties: mergeProperties(base.properties, item.properties),
    armor_class: item.armor_class ?? base.armor_class,
    stealth_disadvantage: item.stealth_disadvantage ?? base.stealth_disadvantage,
    damage: item.damage ?? base.damage,
    damage_type: item.damage_type ?? base.damage_type,
    range: item.range ?? base.range,
    mastery: item.mastery ?? base.mastery,
    requires_attunement: item.requires_attunement ?? base.requires_attunement,
    magic_item_category: item.magic_item_category ?? base.magic_item_category,
    rarity: item.rarity ?? base.rarity,
    base_equipment_ids: item.base_equipment_ids,
    selected_base_equipment_id: item.selected_base_equipment_id ?? baseId,
    base_equipment_filter: item.base_equipment_filter,
    magic_effects: item.magic_effects,
    source: item.source,
    icon: item.icon ?? base.icon,
    accent_color: item.accent_color ?? base.accent_color,
    card_image_url: item.card_image_url ?? base.card_image_url,
    creator_url: item.creator_url ?? base.creator_url,
    created_at: item.created_at,
  }
}
