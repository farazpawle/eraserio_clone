'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useUserSettings } from '../_hooks/useUserSettings'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  actualTheme: 'light' | 'dark'
  isLoading: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings, isLoading, updateTheme } = useUserSettings()
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light')
  
  const theme = settings.theme

  // Update actual theme based on theme preference and system preference
  useEffect(() => {
    const updateActualTheme = () => {
      let newActualTheme: 'light' | 'dark'
      
      if (theme === 'system') {
        newActualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      } else {
        newActualTheme = theme
      }
      
      setActualTheme(newActualTheme)
      
      // Apply theme to document
      const root = document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(newActualTheme)
      
      // Also set data attribute for better compatibility
      root.setAttribute('data-theme', newActualTheme)
    }

    updateActualTheme()

    // Listen for system theme changes when using system theme
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => updateActualTheme()
      
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  // Handle theme changes with persistent storage
  const handleSetTheme = async (newTheme: Theme) => {
    await updateTheme(newTheme)
    console.log(`Theme changed to: ${newTheme} (actual: ${actualTheme})`)
  }

  const value = {
    theme,
    setTheme: handleSetTheme,
    actualTheme,
    isLoading
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Hook for components that only need to know the current theme
export function useActualTheme() {
  const { actualTheme } = useTheme()
  return actualTheme
}