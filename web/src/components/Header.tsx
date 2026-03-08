import React from 'react'
import { useI18n } from '../contexts/I18nContext'
import { useTheme } from '../contexts/ThemeContext'
import AnimatedLogo from './AnimatedLogo'
import { Link } from 'react-router-dom'

export default function Header() {
  const { lang, setLang, t } = useI18n()
  const { theme, toggle } = useTheme()
  const username = localStorage.getItem('username') || ''
  const isLoggedIn = !!localStorage.getItem('token')

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    localStorage.removeItem('userId')
    window.location.href = '/signin'
  }

  return (
    <header className="flex items-center justify-between p-6">
      <Link to="/home" className="flex items-center gap-3 group">
        <AnimatedLogo />
        <div className="text-sm font-semibold text-white/95 group-hover:text-white transition">{t('myHome')}</div>
      </Link>

      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition flex items-center justify-center"
            aria-label={t('language')}
            title={t('language')}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18" />
              <path d="M12 3a15 15 0 0 1 0 18" />
              <path d="M12 3a15 15 0 0 0 0 18" />
            </svg>
          </button>

          <button
            onClick={toggle}
            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition flex items-center justify-center"
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
                <path d="M4.93 19.07l1.41-1.41" />
                <path d="M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
              </svg>
            )}
          </button>
        </div>

        {isLoggedIn && (
          <div className="flex items-center gap-3 text-sm">
            <div className="opacity-90">{t('welcomeBack')}{username ? `, ${username}` : ''}</div>
            <button
              onClick={logout}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition flex items-center justify-center"
              aria-label={t('logout')}
              title={t('logout')}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
