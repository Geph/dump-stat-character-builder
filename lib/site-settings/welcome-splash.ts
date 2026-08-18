/** First-visit home page splash — suppress via Settings → Options. */

export const WELCOME_SPLASH_SUPPRESS_KEY = "dumpstat:welcome-splash-suppress"
export const WELCOME_SPLASH_CHANGE_EVENT = "dumpstat:welcome-splash-change"

export function isWelcomeSplashSuppressed(): boolean {
  if (typeof localStorage === "undefined") return false
  return localStorage.getItem(WELCOME_SPLASH_SUPPRESS_KEY) === "1"
}

export function setWelcomeSplashSuppressed(suppress: boolean): void {
  if (typeof localStorage === "undefined") return
  if (suppress) {
    localStorage.setItem(WELCOME_SPLASH_SUPPRESS_KEY, "1")
  } else {
    localStorage.removeItem(WELCOME_SPLASH_SUPPRESS_KEY)
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(WELCOME_SPLASH_CHANGE_EVENT))
  }
}
