import { NextResponse } from "next/server"
import { isHostedDeploy } from "@/lib/config/deploy-mode"

const HEADER_NAMES = ["x-mutation-secret", "authorization"] as const

function readConfiguredSecret(): string | null {
  const raw = process.env.MUTATION_API_SECRET?.trim()
  return raw && raw.length > 0 ? raw : null
}

/** True when hosted deploy has a mutation secret configured. */
export function isMutationAuthRequired(): boolean {
  return isHostedDeploy() && readConfiguredSecret() != null
}

function readRequestSecret(request: Request): string | null {
  const headerSecret = request.headers.get("x-mutation-secret")?.trim()
  if (headerSecret) return headerSecret

  const auth = request.headers.get("authorization")?.trim()
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim()
  }
  return null
}

function isSameOriginAppRequest(request: Request): boolean {
  const host = request.headers.get("host")?.trim().toLowerCase()
  if (!host) return false

  const origin = request.headers.get("origin")?.trim()
  if (origin) {
    try {
      return new URL(origin).host.toLowerCase() === host
    } catch {
      return false
    }
  }

  const referer = request.headers.get("referer")?.trim()
  if (referer) {
    try {
      return new URL(referer).host.toLowerCase() === host
    } catch {
      return false
    }
  }

  return false
}

/**
 * Gate mutating API routes in hosted mode when MUTATION_API_SECRET is set.
 * Same-origin browser requests from this app are allowed without the header.
 */
export function requireMutationAuth(request: Request): NextResponse | null {
  if (!isMutationAuthRequired()) return null

  const expected = readConfiguredSecret()
  const provided = readRequestSecret(request)
  if (expected && provided === expected) return null
  if (isSameOriginAppRequest(request)) return null

  return NextResponse.json(
    {
      error:
        "Mutation not authorized. Set MUTATION_API_SECRET on the server and send it via X-Mutation-Secret or Authorization: Bearer.",
    },
    { status: 401 },
  )
}

export function mutationAuthHeaderNames(): readonly string[] {
  return HEADER_NAMES
}
