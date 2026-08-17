import { jsonSchema, tool } from "ai"
import * as cheerio from "cheerio"
import { assertPublicFetchHostname, isBlockedFetchHostname } from "@/lib/network/ssrf-guard"

export const FETCH_URL_TOOL_NAME = "fetch_url"
export const FETCH_URL_MAX_CALLS = 20
export const FETCH_URL_MAX_DEPTH = 3
export const FETCH_URL_MAX_BODY_CHARS = 40_000
export const FETCH_URL_MAX_BYTES = 512_000
export const FETCH_URL_TIMEOUT_MS = 10_000

const IMAGE_EXT_RE = /\.(?:png|jpe?g|webp|gif)(?:$|[?#])/i
const SOURCE_URL_RE = /https?:\/\/[^\s<>"'`]+/gi

export type FetchUrlToolResult = {
  ok: boolean
  url?: string
  kind?: "html" | "json" | "text" | "image" | "error"
  content_type?: string
  body?: string
  links?: string[]
  depth?: number
  fetch_count?: number
  remaining_fetches?: number
  truncated?: boolean
  error?: string
}

export type FetchUrlSession = {
  roots: URL[]
  fetchCount: number
  fetchedUrls: Set<string>
}

export type FetchUrlFn = (url: string, init?: RequestInit) => Promise<Response>

function defaultPort(url: URL): string {
  if (url.port) return url.port
  return url.protocol === "https:" ? "443" : "80"
}

function normalizePathname(path: string): string {
  let next = path || "/"
  try {
    next = decodeURIComponent(next)
  } catch {
    // keep raw path
  }
  next = next.replace(/\/+/g, "/")
  if (next.length > 1 && next.endsWith("/")) next = next.slice(0, -1)
  return next || "/"
}

function pathSegments(path: string): string[] {
  const normalized = normalizePathname(path)
  if (normalized === "/") return []
  return normalized.split("/").filter(Boolean)
}

export function stripTrailingUrlPunctuation(raw: string): string {
  return raw.replace(/[),.;:]+$/g, "")
}

export function collectCrawlRootsFromSource(sourceText: string): URL[] {
  const matches = sourceText.match(SOURCE_URL_RE) ?? []
  const roots: URL[] = []
  const seen = new Set<string>()
  for (const match of matches) {
    const parsed = parsePublicHttpUrl(stripTrailingUrlPunctuation(match))
    if (!parsed) continue
    const key = `${parsed.protocol}//${parsed.hostname}:${defaultPort(parsed)}${normalizePathname(parsed.pathname)}`
    if (seen.has(key)) continue
    seen.add(key)
    roots.push(parsed)
  }
  return roots
}

export function createFetchUrlSession(sourceText: string): FetchUrlSession {
  return {
    roots: collectCrawlRootsFromSource(sourceText),
    fetchCount: 0,
    fetchedUrls: new Set(),
  }
}

export function parsePublicHttpUrl(raw: string): URL | null {
  let parsed: URL
  try {
    parsed = new URL(raw.trim())
  } catch {
    return null
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null
  if (parsed.username || parsed.password) return null
  if (isBlockedFetchHostname(parsed.hostname)) return null
  return parsed
}

export function matchCrawlRoot(
  target: URL,
  roots: URL[],
): { root: URL; depth: number } | null {
  for (const root of roots) {
    if (target.protocol !== root.protocol) continue
    if (target.hostname.toLowerCase() !== root.hostname.toLowerCase()) continue
    if (defaultPort(target) !== defaultPort(root)) continue
    const rootPath = normalizePathname(root.pathname)
    const targetPath = normalizePathname(target.pathname)
    const underRoot =
      rootPath === "/"
        ? true
        : targetPath === rootPath || targetPath.startsWith(`${rootPath}/`)
    if (!underRoot) continue
    const depth =
      rootPath === "/"
        ? pathSegments(targetPath).length
        : pathSegments(targetPath).length - pathSegments(rootPath).length
    return { root, depth: Math.max(0, depth) }
  }
  return null
}

export function evaluateFetchUrlRequest(
  rawUrl: string,
  session: FetchUrlSession,
): { ok: true; url: URL; depth: number } | { ok: false; error: string } {
  if (session.fetchCount >= FETCH_URL_MAX_CALLS) {
    return {
      ok: false,
      error: `Fetch cap reached (${FETCH_URL_MAX_CALLS}). Emit what you have found and note that the crawl was truncated.`,
    }
  }
  const parsed = parsePublicHttpUrl(rawUrl)
  if (!parsed) {
    return { ok: false, error: "URL must be a public http(s) address with no credentials." }
  }
  try {
    assertPublicFetchHostname(parsed.hostname)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Hostname is not allowed." }
  }
  if (session.roots.length === 0) {
    return {
      ok: false,
      error: "No crawl root URL was provided in the source. Paste a directory or image URL first.",
    }
  }
  const matched = matchCrawlRoot(parsed, session.roots)
  if (!matched) {
    return {
      ok: false,
      error: "Blocked: URL is not under the original host and path prefix.",
    }
  }
  if (matched.depth > FETCH_URL_MAX_DEPTH) {
    return {
      ok: false,
      error: `Blocked: URL is more than ${FETCH_URL_MAX_DEPTH} path segments deeper than the original URL.`,
    }
  }
  return { ok: true, url: parsed, depth: matched.depth }
}

function looksLikeImageUrl(url: URL, contentType?: string | null): boolean {
  if (IMAGE_EXT_RE.test(url.pathname) || IMAGE_EXT_RE.test(url.href)) return true
  return Boolean(contentType?.toLowerCase().startsWith("image/"))
}

export function extractListingLinks(body: string, baseUrl: string, session: FetchUrlSession): string[] {
  const $ = cheerio.load(body)
  const links: string[] = []
  const seen = new Set<string>()
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return
    let resolved: URL
    try {
      resolved = new URL(href, baseUrl)
    } catch {
      return
    }
    const allowed = evaluateFetchUrlRequest(resolved.href, {
      ...session,
      fetchCount: 0,
    })
    if (!allowed.ok) return
    const key = allowed.url.href
    if (seen.has(key)) return
    seen.add(key)
    links.push(key)
  })
  return links
}

async function readResponseBody(response: Response): Promise<{ text: string; truncated: boolean }> {
  const lengthHeader = response.headers.get("content-length")
  if (lengthHeader) {
    const length = Number.parseInt(lengthHeader, 10)
    if (Number.isFinite(length) && length > FETCH_URL_MAX_BYTES) {
      return { text: "", truncated: true }
    }
  }
  const buffer = new Uint8Array(await response.arrayBuffer())
  const slice = buffer.byteLength > FETCH_URL_MAX_BYTES ? buffer.slice(0, FETCH_URL_MAX_BYTES) : buffer
  const text = new TextDecoder("utf-8", { fatal: false }).decode(slice)
  const truncated =
    buffer.byteLength > FETCH_URL_MAX_BYTES || text.length > FETCH_URL_MAX_BODY_CHARS
  return {
    text: text.length > FETCH_URL_MAX_BODY_CHARS ? text.slice(0, FETCH_URL_MAX_BODY_CHARS) : text,
    truncated,
  }
}

function classifyBodyKind(contentType: string | null, body: string): "html" | "json" | "text" {
  const type = contentType?.toLowerCase() ?? ""
  if (type.includes("json")) return "json"
  if (type.includes("html") || /^\s*</.test(body)) return "html"
  return "text"
}

export async function executeFetchUrl(
  rawUrl: string,
  session: FetchUrlSession,
  fetchImpl: FetchUrlFn = fetch,
): Promise<FetchUrlToolResult> {
  const evaluated = evaluateFetchUrlRequest(rawUrl, session)
  session.fetchCount += 1
  const remaining = Math.max(0, FETCH_URL_MAX_CALLS - session.fetchCount)
  if (!evaluated.ok) {
    return { ok: false, kind: "error", error: evaluated.error, fetch_count: session.fetchCount, remaining_fetches: remaining }
  }

  const { url, depth } = evaluated
  session.fetchedUrls.add(url.href)

  try {
    const response = await fetchImpl(url.href, {
      method: looksLikeImageUrl(url) ? "HEAD" : "GET",
      redirect: "follow",
      headers: {
        Accept: "text/html,application/json,text/plain;q=0.9,*/*;q=0.1",
        "User-Agent": "Mozilla/5.0 (compatible; DumpStatImport/1.0)",
      },
      signal: AbortSignal.timeout(FETCH_URL_TIMEOUT_MS),
    })

    const finalUrl = parsePublicHttpUrl(response.url || url.href) ?? url
    const finalMatch = matchCrawlRoot(finalUrl, session.roots)
    if (!finalMatch) {
      return {
        ok: false,
        kind: "error",
        url: url.href,
        error: "Blocked: redirect left the original host and path prefix.",
        fetch_count: session.fetchCount,
        remaining_fetches: remaining,
      }
    }

    const contentType = response.headers.get("content-type")
    if (looksLikeImageUrl(finalUrl, contentType)) {
      return {
        ok: response.ok,
        kind: "image",
        url: finalUrl.href,
        content_type: contentType ?? undefined,
        depth: finalMatch.depth,
        fetch_count: session.fetchCount,
        remaining_fetches: remaining,
        error: response.ok ? undefined : `Image URL returned HTTP ${response.status}.`,
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        kind: "error",
        url: finalUrl.href,
        error: `HTTP ${response.status} ${response.statusText}`.trim(),
        fetch_count: session.fetchCount,
        remaining_fetches: remaining,
      }
    }

    const { text, truncated } = await readResponseBody(response)
    const kind = classifyBodyKind(contentType, text)
    return {
      ok: true,
      kind,
      url: finalUrl.href,
      content_type: contentType ?? undefined,
      body: text,
      links: kind === "html" ? extractListingLinks(text, finalUrl.href, session) : undefined,
      depth: finalMatch.depth,
      fetch_count: session.fetchCount,
      remaining_fetches: remaining,
      truncated: truncated || undefined,
    }
  } catch (error) {
    return {
      ok: false,
      kind: "error",
      url: url.href,
      error: error instanceof Error ? error.message : "Failed to fetch URL.",
      fetch_count: session.fetchCount,
      remaining_fetches: remaining,
    }
  }
}

export function createFetchUrlTool(session: FetchUrlSession, fetchImpl: FetchUrlFn = fetch) {
  return tool({
    description:
      "Fetch a public directory listing, index page, or JSON/HTML URL. Dump Stat executes this server-side. Use it to crawl image directories instead of guessing filenames. Returns HTML/JSON text plus same-prefix links, or a short error. Max 20 calls. URLs must stay on the original host and path prefix, at most 3 path segments deeper.",
    inputSchema: jsonSchema<{ url: string }>({
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Absolute http(s) URL to fetch (directory listing, index, or image file).",
        },
      },
      required: ["url"],
      additionalProperties: false,
    }),
    execute: async ({ url }) => executeFetchUrl(url, session, fetchImpl),
  })
}
