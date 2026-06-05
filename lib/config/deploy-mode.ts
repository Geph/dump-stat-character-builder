export type DeployMode = "hosted" | "static"

function readDeployMode(): DeployMode {
  const raw = process.env.NEXT_PUBLIC_DEPLOY_MODE?.trim().toLowerCase()
  return raw === "static" ? "static" : "hosted"
}

export function getDeployMode(): DeployMode {
  return readDeployMode()
}

export function isStaticDeploy(): boolean {
  return readDeployMode() === "static"
}

export function isHostedDeploy(): boolean {
  return !isStaticDeploy()
}

/** Base path for GitHub Pages project sites (e.g. `/dump-stat-character-builder`). */
export function getBasePath(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? ""
  if (!raw || raw === "/") return ""
  return raw.startsWith("/") ? raw.replace(/\/$/, "") : `/${raw.replace(/\/$/, "")}`
}

export function withBasePath(path: string): string {
  const base = getBasePath()
  if (!base) return path
  if (path.startsWith(base + "/") || path === base) return path
  if (path.startsWith("/")) return `${base}${path}`
  return `${base}/${path}`
}

export function canUseServerImport(): boolean {
  return isHostedDeploy()
}

export function canSeedFromApi(): boolean {
  return isHostedDeploy()
}

export function canClearCompendiumViaApi(): boolean {
  return isHostedDeploy()
}

export function usesIndexedDbStorage(): boolean {
  return isStaticDeploy()
}

export function getStorageLabel(): string {
  return isStaticDeploy() ? "Browser (IndexedDB)" : "MySQL (server)"
}
