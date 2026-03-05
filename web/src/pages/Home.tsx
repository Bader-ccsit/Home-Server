import React from 'react'
import AnimatedCard from '../components/AnimatedCard'
import AnimatedButton from '../components/AnimatedButton'
import { useI18n } from '../contexts/I18nContext'

export default function Home() {
  const { t } = useI18n()

  return (
    <div className="p-6">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">{t('homeTitle')}</h1>
        <div className="flex items-center gap-4">
          <div>{t('welcomeBack')}</div>
          <AnimatedButton onClick={() => { localStorage.removeItem('token'); window.location.href = '/signin' }} className="bg-white/6 text-black">{t('logout')}</AnimatedButton>
        </div>
      </header>

      <main>
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatedCard className="p-6">Cloud Drive (MinIO)</AnimatedCard>
          <AnimatedCard className="p-6">Other Service</AnimatedCard>
        </section>
      </main>
    </div>
  )
}
