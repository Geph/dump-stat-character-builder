/** Prompt guidance for AI import — preserve tables in rich text description fields. */
export const RICH_TEXT_TABLE_HINT = `
For description, benefits, feature description, trait description, and similar narrative fields:
- Preserve tabular or stat-block data as HTML tables:
  <table><tbody><tr><td>Label</td><td>Value</td></tr></tbody></table>
- You may use <p>, <strong>, <em>, <ul>, <ol>, and <li> for other formatting.
- When source material contains a table, include it as HTML in the matching description field — do not flatten tables to plain text.
- When PDF extraction splits one table into adjacent fragments, or a table body appears after the next entry's heading (common two-column scramble), rebuild the fragments into a single HTML table on the correct entry. If the pieces do not clearly belong together, keep the supplied text and mark the description with "[Source ends mid-entry]" rather than inventing rows.
- Item names, spell names, and other identifier fields must remain plain text without HTML.
- Strip HTML only from non-description identifier fields (names, categories, etc.).
- Companions / summoned creatures embedded in a custom ability or feature (Psi Crystal, Recruit Mercenary, Homunculus, and similar):
  Prefer importing a creatures[] row (schema v2.0: category "companion" with scaling + formula AC/HP, or "creature" with fixed CR) plus mechanics grant_creature. When the block only lives inside an ability, you may also use companion_stat_block on that ability. Keep a readable prose copy in description when useful. Dump Stat promotes companion_stat_block / companion_stat_blocks into creatures[] on import so they appear in Creatures & Companions and on the sheet Companions tab — do not invent a separate equipment[] or species[] row for a summoned/recruited companion that exists only as part of an ability.
`
