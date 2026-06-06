/** Prompt guidance for AI import — preserve tables in rich text description fields. */
export const RICH_TEXT_TABLE_HINT = `
For description, benefits, feature description, trait description, and similar narrative fields:
- Preserve tabular or stat-block data as HTML tables:
  <table><tbody><tr><td>Label</td><td>Value</td></tr></tbody></table>
- You may use <p>, <strong>, <em>, <ul>, <ol>, and <li> for other formatting.
- When source material contains a table, include it as HTML in the matching description field — do not flatten tables to plain text.
- Item names, spell names, and other identifier fields must remain plain text without HTML.
- Strip HTML only from non-description identifier fields (names, categories, etc.).
`
