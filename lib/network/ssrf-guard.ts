import { isIP } from "node:net"

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
])

function parseIpv4(host: string): number[] | null {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null
  const parts = host.split(".").map((part) => Number.parseInt(part, 10))
  if (parts.some((part) => !Number.isFinite(part) || part < 0 || part > 255)) return null
  return parts
}

function isPrivateIpv4(parts: number[]): boolean {
  const [a, b] = parts
  if (a === 10) return true
  if (a === 127) return true
  if (a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  return false
}

function isPrivateIpv6(host: string): boolean {
  const normalized = host.toLowerCase()
  if (normalized === "::1") return true
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true
  if (normalized.startsWith("fe80:")) return true
  return false
}

/** Defense-in-depth: block obvious private-range targets for server-side fetch. */
export function isBlockedFetchHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "")
  if (!host) return true
  if (BLOCKED_HOSTNAMES.has(host)) return true

  const ipv4 = parseIpv4(host)
  if (ipv4) return isPrivateIpv4(ipv4)

  if (isIP(host) === 6) return isPrivateIpv6(host)

  return false
}

export function assertPublicFetchHostname(hostname: string): void {
  if (isBlockedFetchHostname(hostname)) {
    throw new Error("URL hostname is not allowed for server-side fetch.")
  }
}
