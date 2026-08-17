import { describe, expect, it } from "vitest"
import {
  collectCrawlRootsFromSource,
  createFetchUrlSession,
  evaluateFetchUrlRequest,
  executeFetchUrl,
  extractListingLinks,
  FETCH_URL_MAX_CALLS,
  FETCH_URL_MAX_DEPTH,
  matchCrawlRoot,
} from "@/lib/import/fetch-url-tool"

const ROOT = "https://jeffginger.com/images/"

function sessionWith(url = ROOT) {
  return createFetchUrlSession(url)
}

describe("fetch_url crawl rules", () => {
  it("collects http(s) roots from pasted source text", () => {
    const roots = collectCrawlRootsFromSource(
      `${ROOT}\nhttps://jeffginger.com/images/classes/dancer.png\nsee also ftp://nope.example/x`,
    )
    expect(roots.map((url) => url.href)).toEqual([
      ROOT,
      "https://jeffginger.com/images/classes/dancer.png",
    ])
  })

  it("allows the original URL and same-prefix children", () => {
    const session = sessionWith()
    expect(evaluateFetchUrlRequest(ROOT, session)).toMatchObject({ ok: true, depth: 0 })
    expect(evaluateFetchUrlRequest("https://jeffginger.com/images/classes/", session)).toMatchObject({
      ok: true,
      depth: 1,
    })
    expect(
      evaluateFetchUrlRequest("https://jeffginger.com/images/classes/dancer.png", session),
    ).toMatchObject({ ok: true, depth: 2 })
  })

  it("rejects offsite links, escaped prefixes, private hosts, and over-deep paths", () => {
    const session = sessionWith()
    expect(evaluateFetchUrlRequest("https://evil.example/images/", session)).toMatchObject({
      ok: false,
    })
    expect(evaluateFetchUrlRequest("https://jeffginger.com/other/", session)).toMatchObject({
      ok: false,
    })
    expect(evaluateFetchUrlRequest("http://127.0.0.1/images/", session)).toMatchObject({
      ok: false,
    })
    const deep = "https://jeffginger.com/images/a/b/c/d/e.png"
    expect(matchCrawlRoot(new URL(deep), session.roots)?.depth).toBeGreaterThan(FETCH_URL_MAX_DEPTH)
    expect(evaluateFetchUrlRequest(deep, session)).toMatchObject({ ok: false })
  })

  it("caps total fetch_url executions at 20, including rejected calls", async () => {
    const session = sessionWith()
    session.fetchCount = FETCH_URL_MAX_CALLS
    const blocked = evaluateFetchUrlRequest(ROOT, session)
    expect(blocked).toMatchObject({ ok: false })
    expect(blocked.ok === false && blocked.error).toContain("Fetch cap reached")

    const result = await executeFetchUrl("https://evil.example/x", session, async () => {
      throw new Error("should not fetch")
    })
    expect(result.ok).toBe(false)
    expect(session.fetchCount).toBe(FETCH_URL_MAX_CALLS + 1)
  })

  it("returns listing HTML plus same-prefix links and refuses to leave the host on redirect", async () => {
    const session = sessionWith()
    const html = `
      <html><body>
        <a href="classes/">classes</a>
        <a href="https://evil.example/steal">nope</a>
        <a href="/other/">escape</a>
      </body></html>
    `
    const listing = await executeFetchUrl(ROOT, session, async () => {
      return new Response(html, {
        status: 200,
        headers: { "content-type": "text/html" },
      })
    })
    expect(listing.ok).toBe(true)
    expect(listing.kind).toBe("html")
    expect(listing.links).toEqual(["https://jeffginger.com/images/classes/"])
    expect(extractListingLinks(html, ROOT, session)).toEqual([
      "https://jeffginger.com/images/classes/",
    ])

    const redirected = await executeFetchUrl(`${ROOT}classes/`, session, async () => {
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        url: "https://evil.example/stolen",
        headers: new Headers({ "content-type": "text/html" }),
        arrayBuffer: async () => new TextEncoder().encode("stolen").buffer,
      } as Response
    })
    expect(redirected.ok).toBe(false)
    expect(redirected.error).toMatch(/redirect left the original/i)
  })

  it("confirms image URLs without returning binary bodies", async () => {
    const session = sessionWith()
    const result = await executeFetchUrl(
      "https://jeffginger.com/images/classes/dancer.png",
      session,
      async (url, init) => {
        expect(init?.method).toBe("HEAD")
        expect(url).toContain("dancer.png")
        return new Response(null, {
          status: 200,
          headers: { "content-type": "image/png" },
        })
      },
    )
    expect(result).toMatchObject({ ok: true, kind: "image" })
    expect(result.body).toBeUndefined()
  })
})
