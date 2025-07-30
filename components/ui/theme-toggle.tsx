'use client'

import * as React from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '@/app/_context/ThemeContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeToggle() {
  const { theme, setTheme, actualTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {actualTheme === 'dark' ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className={`cursor-pointer ${
            theme === 'light' ? 'bg-gray-100 dark:bg-gray-800' : ''
          }`}
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
          {theme === 'light' && (
            <span className="ml-auto text-xs text-gray-500">✓</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className={`cursor-pointer ${
            theme === 'dark' ? 'bg-gray-100 dark:bg-gray-800' : ''
          }`}
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
          {theme === 'dark' && (
            <span className="ml-auto text-xs text-gray-500">✓</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className={`cursor-pointer ${
            theme === 'system' ? 'bg-gray-100 dark:bg-gray-800' : ''
          }`}
        >
          <Monitor className="mr-2 h-4 w-4" />
          <span>System</span>
          {theme === 'system' && (
            <span className="ml-auto text-xs text-gray-500">✓</span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Simple toggle button version (alternative)
export function SimpleThemeToggle() {
  const { actualTheme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(actualTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className="h-8 w-8 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      {actualTheme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}