import { EQUIPMENT_CATEGORY_ORDER } from "./equipment-categories"

/** When attaching a custom ability to equipment, `attached_to_id` stores a category name. */
export const EQUIPMENT_ATTACH_CATEGORIES = EQUIPMENT_CATEGORY_ORDER

export function isEquipmentCategoryAttach(
  type: string | null | undefined,
): boolean {
  return type === "equipment"
}

export function formatAttachTargetLabel(
  type: string | null | undefined,
  id: string | null | undefined,
): string | null {
  if (!type || !id) return null
  if (type === "equipment") return id
  return null
}
