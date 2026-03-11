import React from 'react'
import AnimatedCard from '../components/AnimatedCard'
import AnimatedButton from '../components/AnimatedButton'
import { useI18n } from '../contexts/I18nContext'

export default function Al3abi() {
  const { t } = useI18n()

  return (
    <div className="p-6">
      <AnimatedCard className="p-6 mb-5">
        <h1 className="text-2xl font-bold mb-2">{t('al3abiTitle')}</h1>
        <p className="text-sm opacity-80">{t('al3abiSubtitle')}</p>
      </AnimatedCard>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <AnimatedCard className="p-6">
          <h2 className="text-xl font-semibold mb-2">{t('al3abiRetroTitle')}</h2>
          <p className="text-sm opacity-75 mb-4">{t('al3abiRetroDesc')}</p>
          <AnimatedButton onClick={() => (window.location.href = '/al3abi/retro')}>{t('al3abiOpenRetro')}</AnimatedButton>
        </AnimatedCard>

        <AnimatedCard className="p-6">
          <h2 className="text-xl font-semibold mb-2">{t('al3abiFamilyTitle')}</h2>
          <p className="text-sm opacity-75 mb-4">{t('al3abiFamilyDesc')}</p>
          <AnimatedButton onClick={() => (window.location.href = '/al3abi/family')}>{t('al3abiOpenFamily')}</AnimatedButton>
        </AnimatedCard>
      </section>

      <AnimatedCard className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="font-semibold text-lg mb-1">{t('al3abiManageTitle')}</div>
            <div className="text-sm opacity-75">{t('al3abiManageSubtitle')}</div>
          </div>
          <AnimatedButton onClick={() => (window.location.href = '/al3abi/manage')}>{t('al3abiOpenManage')}</AnimatedButton>
        </div>
      </AnimatedCard>
    </div>
  )
}
