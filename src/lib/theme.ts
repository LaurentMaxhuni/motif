import { useEffect, useState } from 'react'
export type Theme = 'light'|'dark'|'system'
export function setTheme(theme: Theme) { localStorage.setItem('motif-theme', theme); window.dispatchEvent(new Event('motif-theme')) }
export function useTheme() {
  const [theme, update] = useState(localStorage.getItem('motif-theme') || 'system')
  const [resolvedTheme, resolve] = useState(document.documentElement.dataset.theme || 'light')
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const sync = () => { update(localStorage.getItem('motif-theme') || 'system'); resolve(document.documentElement.dataset.theme || 'light') }
    window.addEventListener('motif-theme', sync); window.addEventListener('storage', sync); media.addEventListener('change', sync)
    return () => { window.removeEventListener('motif-theme', sync); window.removeEventListener('storage', sync); media.removeEventListener('change', sync) }
  }, [])
  return { theme, resolvedTheme, setTheme }
}
