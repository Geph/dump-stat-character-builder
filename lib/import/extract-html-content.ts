import type { Cheerio, CheerioAPI, Element } from "cheerio"
import { escapeHtml } from "@/lib/compendium/rich-text-html"

const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"])

function sanitizeInlineHtml($: CheerioAPI, el: Element): string {
  const $el = $(el)
  const clone = $el.clone()
  clone.find("script, style, iframe, object").remove()
  clone.find("*").each((_, node) => {
    const tag = node.tagName?.toLowerCase()
    if (!tag) return
    if (!["strong", "b", "em", "i", "br", "span", "a", "sup", "sub"].includes(tag)) {
      $(node).replaceWith($(node).html() ?? "")
    } else {
      for (const attr of Object.keys(node.attribs ?? {})) {
        if (tag === "a" && attr === "href") continue
        $(node).removeAttr(attr)
      }
    }
  })
  return clone.html()?.trim() ?? escapeHtml($el.text().trim())
}

function normalizeTableHtml($: CheerioAPI, table: Element): string {
  const rows: string[] = []
  $(table)
    .find("tr")
    .each((_, tr) => {
      const cells: string[] = []
      $(tr)
        .find("td, th")
        .each((_, cell) => {
          const tag = cell.tagName?.toLowerCase() === "th" ? "th" : "td"
          const inner = sanitizeInlineHtml($, cell)
          cells.push(`<${tag}>${inner || "&nbsp;"}</${tag}>`)
        })
      if (cells.length) rows.push(`<tr>${cells.join("")}</tr>`)
    })

  if (!rows.length) return ""
  return `<table><tbody>${rows.join("")}</tbody></table>`
}

function normalizeListHtml($: CheerioAPI, list: Element): string {
  const tag = list.tagName?.toLowerCase() === "ol" ? "ol" : "ul"
  const items: string[] = []
  $(list)
    .children("li")
    .each((_, li) => {
      const inner = sanitizeInlineHtml($, li)
      if (inner) items.push(`<li>${inner}</li>`)
    })
  if (!items.length) return ""
  return `<${tag}>${items.join("")}</${tag}>`
}

function appendBlock(parts: string[], html: string) {
  const trimmed = html.trim()
  if (trimmed) parts.push(trimmed)
}

function walkBlocks($: CheerioAPI, $root: Cheerio<Element>, parts: string[]) {
  $root.contents().each((_, node) => {
    if (node.type === "text") {
      const text = (node.data ?? "").replace(/\s+/g, " ").trim()
      if (text) appendBlock(parts, `<p>${escapeHtml(text)}</p>`)
      return
    }
    if (node.type !== "tag") return

    const el = node as Element
    const tag = el.tagName?.toLowerCase()
    if (!tag) return

    if (tag === "p") {
      const inner = sanitizeInlineHtml($, el)
      if (inner) appendBlock(parts, `<p>${inner}</p>`)
      return
    }

    if (tag === "table") {
      appendBlock(parts, normalizeTableHtml($, el))
      return
    }

    if (tag === "ul" || tag === "ol") {
      appendBlock(parts, normalizeListHtml($, el))
      return
    }

    if (HEADING_TAGS.has(tag)) {
      const text = $(el).text().trim()
      if (text) appendBlock(parts, `<p><strong>${escapeHtml(text)}</strong></p>`)
      return
    }

    if (tag === "blockquote") {
      const inner = $(el).text().trim()
      if (inner) appendBlock(parts, `<p><em>${escapeHtml(inner)}</em></p>`)
      return
    }

    if (tag === "br") return

    if (tag === "div" || tag === "section" || tag === "article") {
      walkBlocks($, $(el), parts)
    }
  })
}

/** Extract paragraphs, lists, and tables from a content root in document order. */
export function extractRichHtmlFromRoot($: CheerioAPI, root: Cheerio<Element>): string {
  const parts: string[] = []
  walkBlocks($, root, parts)
  return parts.join("\n")
}

export function getMainContentRoot($: CheerioAPI): Cheerio<Element> {
  return $("#page-content, .page-content, article").first()
}

/** Rich HTML for descriptions — tables and lists preserved. */
export function extractMainContentHtml($: CheerioAPI): string {
  const root = getMainContentRoot($)
  if (!root.length) return ""
  return extractRichHtmlFromRoot($, root)
}

/** First paragraph or table block as a short plain summary. */
export function extractPlainSummary(html: string): string {
  if (!html.trim()) return ""
  const tableMatch = html.match(/<table[\s\S]*?<\/table>/i)
  const paraMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i)
  const stripTags = (value: string) => value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  if (paraMatch) return stripTags(paraMatch[1]).slice(0, 500)
  if (tableMatch) return stripTags(tableMatch[0]).slice(0, 500)
  return stripTags(html).slice(0, 500)
}

/** Collect rich HTML from sibling blocks immediately after a heading/element. */
export function extractFollowingBlocks($: CheerioAPI, el: Element): string {
  const parts: string[] = []
  let $next = $(el).next()

  while ($next.length) {
    const tag = $next.prop("tagName")?.toLowerCase()
    if (tag && (HEADING_TAGS.has(tag) || tag === "hr")) break
    if (tag === "p" || tag === "table" || tag === "ul" || tag === "ol" || tag === "blockquote") {
      const wrapper = $("<div></div>")
      wrapper.append($next.clone())
      appendBlock(parts, extractRichHtmlFromRoot($, wrapper))
    } else if (tag === "div") {
      appendBlock(parts, extractRichHtmlFromRoot($, $next))
    }
    $next = $next.next()
  }

  return parts.join("\n")
}
