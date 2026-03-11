import React from 'react'
import { useI18n } from '../contexts/I18nContext'
import { useTheme } from '../contexts/ThemeContext'
import AnimatedLogo from './AnimatedLogo'
import { Link, useLocation } from 'react-router-dom'

export default function Header() {
  const { lang, setLang, t } = useI18n()
  const { theme, toggle } = useTheme()
  const location = useLocation()
  const username = localStorage.getItem('username') || ''
  const isLoggedIn = !!localStorage.getItem('token')
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [profileOpen, setProfileOpen] = React.useState(false)
  const profileRef = React.useRef<HTMLDivElement | null>(null)

  const navItems = [
    { to: '/home', label: t('myHome') },
    { to: '/drive', label: t('cloudDrive') },
    { to: '/badertube', label: t('baderTube') },
    { to: '/aflami', label: t('aflami') },
    { to: '/secrets/verify', label: t('secretsServiceName') },
    { to: '/7mlny', label: t('hmlnyServiceName') },
    { to: '/shopping-cart', label: t('shoppingServiceName') },
    { to: '/al3abi', label: t('al3abiServiceName') },
    { to: '/pasteme', label: t('pastemeServiceName') },
  ]

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    localStorage.removeItem('userId')
    window.location.href = '/signin'
  }

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!profileRef.current) return
      if (!profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  React.useEffect(() => {
    setProfileOpen(false)
  }, [location.pathname])

  return (
    <header className="sticky top-0 z-40 px-3 pt-2.5 sm:px-4 sm:pt-3">
      <div className="glass-nav rounded-2xl sm:rounded-3xl px-3 py-2 sm:px-3.5 sm:py-2.5">
        <div className="flex items-center justify-between gap-2">
          <Link to="/home" className="flex items-center gap-3 group min-w-0" onClick={() => setMobileOpen(false)}>
            <AnimatedLogo />
          </Link>

          <div className="hidden xl:flex items-center gap-1">
            {isLoggedIn && navItems.map(item => {
              const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition ${active ? 'bg-white/25 dark:bg-white/20 border border-white/35' : 'hover:bg-white/15 border border-transparent'}`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="h-9 w-9 rounded-lg bg-white/12 hover:bg-white/20 border border-white/25 transition flex items-center justify-center"
              aria-label={t('language')}
              title={t('language')}
            >
              <span className="text-[11px] font-bold">{lang === 'en' ? 'AR' : 'EN'}</span>
            </button>

            <button
              onClick={toggle}
              className="h-9 w-9 rounded-lg bg-white/12 hover:bg-white/20 border border-white/25 transition flex items-center justify-center"
              aria-label={t('theme')}
              title={t('theme')}
            >
              {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2" />
                  <path d="M12 20v2" />
                  <path d="M4.93 4.93l1.41 1.41" />
                  <path d="M17.66 17.66l1.41 1.41" />
                  <path d="M2 12h2" />
                  <path d="M20 12h2" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
                </svg>
              )}
            </button>

            {isLoggedIn ? (
              <div className="hidden sm:block relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen(v => !v)}
                  className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-white/12 hover:bg-white/20 border border-white/25 transition text-sm"
                  aria-label={username || t('logout')}
                  title={username || t('logout')}
                >
                  <span className="max-w-[140px] truncate">{username || t('logout')}</span>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 min-w-[170px] rounded-xl border border-white/20 bg-[#102446]/95 backdrop-blur-md shadow-xl p-1.5 z-50">
                    <button
                      type="button"
                      onClick={logout}
                      className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-sm"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <path d="M16 17l5-5-5-5" />
                        <path d="M21 12H9" />
                      </svg>
                      <span>{t('logout')}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setMobileOpen(v => !v)}
              className="xl:hidden h-9 w-9 rounded-lg bg-white/12 hover:bg-white/20 border border-white/25 transition flex items-center justify-center"
              aria-label="Menu"
              title="Menu"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 6h18" />
                <path d="M3 12h18" />
                <path d="M3 18h18" />
              </svg>
            </button>
          </div>
        </div>

        {isLoggedIn && (
          <div className="text-xs opacity-75 mt-2 hidden sm:block">{t('welcomeBack')}{username ? `, ${username}` : ''}</div>
        )}

        {mobileOpen && isLoggedIn && (
          <div className="xl:hidden mt-2.5 pt-2.5 border-t border-white/20 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {navItems.map(item => {
              const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition ${active ? 'bg-white/25 border border-white/35' : 'bg-white/8 hover:bg-white/15 border border-white/15'}`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </header>
  )
}
