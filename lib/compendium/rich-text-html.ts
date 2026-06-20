/** Shared HTML helpers for rich text fields (editor + import). */

import { markdownToHtml } from "@/lib/compendium/markdown-to-html"

export function isHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function toEditorHtml(value: string): string {
  if (!value?.trim()) return ""
  if (isHtml(value)) return value
  return markdownToHtml(value)
}

export function createEmptyTableHtml(rows = 3, cols = 2, headerRow = true): string {
  const body: string[] = []
  for (let r = 0; r < rows; r++) {
    const cells: string[] = []
    for (let c = 0; c < cols; c++) {
      const tag = headerRow && r === 0 ? "th" : "td"
      cells.push(`<${tag}>&nbsp;</${tag}>`)
    }
    body.push(`<tr>${cells.join("")}</tr>`)
  }
  return `<table><tbody>${body.join("")}</tbody></table>`
}

export function getSelectedTable(root: HTMLElement | null): HTMLTableElement | null {
  if (!root) return null
  const sel = window.getSelection()
  if (!sel?.anchorNode) return null
  let node: Node | null = sel.anchorNode
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
  const table = (node as Element | null)?.closest("table")
  if (!table || !root.contains(table)) return null
  return table
}

export function addTableRow(table: HTMLTableElement): void {
  const colCount = table.rows[0]?.cells.length ?? 1
  const tr = table.insertRow()
  for (let i = 0; i < colCount; i++) {
    const td = tr.insertCell()
    td.innerHTML = "&nbsp;"
  }
}

export function addTableColumn(table: HTMLTableElement): void {
  for (const row of Array.from(table.rows)) {
    const td = row.insertCell()
    td.innerHTML = "&nbsp;"
  }
}

export function deleteTable(table: HTMLTableElement): void {
  table.remove()
}

export function insertTableAtSelection(root: HTMLElement, rows = 3, cols = 2): void {
  root.focus()
  const html = `${createEmptyTableHtml(rows, cols)}<p><br></p>`
  document.execCommand("insertHTML", false, html)
}
