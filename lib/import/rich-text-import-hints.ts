/** Prompt guidance for AI import — preserve tables in rich text description fields. */
export const RICH_TEXT_TABLE_HINT = `
For description, benefits, feature description, trait description, and similar narrative fields:
- Preserve tabular or stat-block data as HTML tables:
  <table><tbody><tr><td>Label</td><td>Value</td></tr></tbody></table>
- You may use <p>, <strong>, <em>, <ul>, <ol>, and <li> for other formatting.
- When source material contains a table, include it as HTML in the matching description field — do not flatten tables to plain text.
- Item names, spell names, and other identifier fields must remain plain text without HTML.
- Strip HTML only from non-description identifier fields (names, categories, etc.).
- Companions / summoned creatures embedded in a custom ability or feature (Psi Crystal, Recruit Mercenary, Homunculus, and similar):
  Prefer the structured companion_stat_block field (ability scores, AC, HP formula, speed, skills, traits, actions) when the source presents a full creature block — do not rely on HTML tables alone. Keep a readable HTML table or prose copy in description as well when useful. This is the intended model for the companion sub-sheet; do not invent a separate equipment[] or species[] row for a summoned/recruited companion that exists only as part of an ability.
`
