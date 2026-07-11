import {
  auditModifierCatalog,
  formatModifierCatalogAudit,
} from "../lib/compendium/audit-modifier-catalog"

function main() {
  const result = auditModifierCatalog()
  console.log(formatModifierCatalogAudit(result))

  if (result.summary.dead.length > 0) {
    console.error(
      `\nAudit note: ${result.summary.dead.length} DEAD modifier type(s) (defined but never applied in aggregateCharacteristics).`,
    )
  }
}

main()
