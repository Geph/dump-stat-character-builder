import { describe, expect, it, vi, beforeEach } from "vitest"
import { GET, POST } from "@/app/api/play/sessions/route"

describe("play sessions API", () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it("returns 503 when room sync disabled", async () => {
    vi.stubEnv("ENABLE_ROOM_SYNC", "false")
    const response = await POST(
      new Request("http://localhost/api/play/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ characterIds: ["abc"] }),
      }),
    )
    expect(response.status).toBe(503)
  })

  it("creates and reads a session when enabled", async () => {
    vi.stubEnv("ENABLE_ROOM_SYNC", "true")
    const create = await POST(
      new Request("http://localhost/api/play/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ characterIds: ["char-1", "char-2"] }),
      }),
    )
    expect(create.status).toBe(200)
    const created = (await create.json()) as {
      roomCode: string
      sessionToken: string
      characterIds: string[]
    }
    expect(created.characterIds).toEqual(["char-1", "char-2"])

    const read = await GET(
      new Request(`http://localhost/api/play/sessions?room=${created.roomCode}`, {
        headers: { "x-session-token": created.sessionToken },
      }),
    )
    expect(read.status).toBe(200)
    const payload = await read.json()
    expect(payload.characterIds).toEqual(["char-1", "char-2"])
  })
})
