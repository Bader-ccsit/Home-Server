import React from 'react'
import { useI18n } from '../contexts/I18nContext'
import { useTheme } from '../contexts/ThemeContext'
import AnimatedLogo from './AnimatedLogo'

export default function Header() {
  const { lang, setLang, t } = useI18n()
  const { theme, toggle } = useTheme()

  return (
    <header className="flex items-center justify-between p-6">
      <div className="flex items-center gap-4">
        <AnimatedLogo />
        <div className="hidden md:block">
          <div className="text-sm opacity-80">{t('homeTitle')}</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
          className="rounded-xl px-3 py-1 bg-white/6 hover:bg-white/12 transition"
          aria-label="toggle-language"
        >
          {lang === 'en' ? 'AR' : 'EN'}
        </button>

        <button
          onClick={toggle}
          className="rounded-xl px-3 py-1 bg-white/6 hover:bg-white/12 transition"
          aria-label="toggle-theme"
        >
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>
    </header>
  )
}
