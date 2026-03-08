import React from 'react'
import AnimatedCard from '../components/AnimatedCard'
import AnimatedButton from '../components/AnimatedButton'
import { useI18n } from '../contexts/I18nContext'

export default function Home() {
  const { t } = useI18n()

  return (
    <div className="p-6">
      <main>
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatedCard className="p-6">
            <div className="flex flex-col">
              <div className="text-lg font-semibold mb-2">Cloud Drive</div>
              <div className="text-sm opacity-80 mb-4">Personal cloud storage (files & folders)</div>
              <AnimatedButton onClick={() => window.location.href = '/drive'}>Open Drive</AnimatedButton>
            </div>
          </AnimatedCard>
          <AnimatedCard className="p-6">Other Service</AnimatedCard>
        </section>
      </main>
    </div>
  )
}
