"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import {
  APP_THEME_STORAGE_KEY,
  APP_THEMES,
  DEFAULT_APP_THEME,
  type AppThemeId,
  isAppThemeId,
} from "@/lib/themes/app-themes"

type AppThemeContextValue = {
  theme: AppThemeId
  setTheme: (id: AppThemeId) => void
}

const AppThemeContext = createContext<AppThemeContextValue | null>(null)

function applyThemeToDocument(theme: AppThemeId) {
  document.documentElement.setAttribute("data-theme", theme)
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppThemeId>(DEFAULT_APP_THEME)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(APP_THEME_STORAGE_KEY)
    const initial = stored && isAppThemeId(stored) ? stored : DEFAULT_APP_THEME
    setThemeState(initial)
    applyThemeToDocument(initial)
    setReady(true)
  }, [])

  const setTheme = useCallback((id: AppThemeId) => {
    setThemeState(id)
    localStorage.setItem(APP_THEME_STORAGE_KEY, id)
    applyThemeToDocument(id)
  }, [])

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  if (!ready) {
    return (
      <AppThemeContext.Provider value={value}>
        <div className="min-h-screen bg-background" suppressHydrationWarning>
          {children}
        </div>
      </AppThemeContext.Provider>
    )
  }

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>
}

export function useAppTheme() {
  const ctx = useContext(AppThemeContext)
  if (!ctx) {
    throw new Error("useAppTheme must be used within AppThemeProvider")
  }
  return ctx
}

export { APP_THEMES }
