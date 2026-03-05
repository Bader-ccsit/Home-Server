import React, { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext<any>(null)

export function ThemeProvider({ children }: any) {
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    localStorage.setItem('theme', theme)
    if (theme === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [theme])

  const toggle = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)

export default ThemeContext
