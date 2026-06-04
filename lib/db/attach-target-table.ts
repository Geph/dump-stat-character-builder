/** Map custom-ability attach_to_type values to API / DB table names. */
export function attachTypeToTable(type: string): string | null {
  switch (type) {
    case "class":
      return "classes"
    case "species":
      return "species"
    case "background":
      return "backgrounds"
    case "feat":
      return "feats"
    case "equipment":
      return "equipment"
    case "spell":
      return "spells"
    case "ability":
      return "custom_abilities"
    default:
      return null
  }
}
