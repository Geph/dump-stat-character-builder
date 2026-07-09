/** Whether the GM Dashboard link appears in the main navigation. */

export const GM_DASHBOARD_NAV_STORAGE_KEY = "dumpstat:gm-dashboard-nav-enabled"

export const GM_DASHBOARD_NAV_CHANGE_EVENT = "dumpstat:gm-dashboard-nav-change"

export function isGmDashboardNavEnabled(): boolean {
  if (typeof localStorage === "undefined") return false
  return localStorage.getItem(GM_DASHBOARD_NAV_STORAGE_KEY) === "1"
}

export function setGmDashboardNavEnabled(enabled: boolean): void {
  if (typeof localStorage === "undefined") return
  if (enabled) {
    localStorage.setItem(GM_DASHBOARD_NAV_STORAGE_KEY, "1")
  } else {
    localStorage.removeItem(GM_DASHBOARD_NAV_STORAGE_KEY)
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(GM_DASHBOARD_NAV_CHANGE_EVENT))
  }
}
