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
              <div className="text-lg font-semibold mb-2">{t('cloudDrive')}</div>
              <div className="text-sm opacity-80 mb-4">{t('cloudDriveDesc')}</div>
              <AnimatedButton onClick={() => window.location.href = '/drive'}>{t('openDrive')}</AnimatedButton>
            </div>
          </AnimatedCard>

          <AnimatedCard className="p-6">
            <div className="flex flex-col">
              <div className="text-lg font-semibold mb-2">{t('baderTube')}</div>
              <div className="text-sm opacity-80 mb-4">{t('baderTubeDesc')}</div>
              <AnimatedButton onClick={() => window.location.href = '/badertube'}>{t('openBaderTube')}</AnimatedButton>
            </div>
          </AnimatedCard>

          <AnimatedCard className="p-6">
            <div className="flex flex-col">
              <div className="text-lg font-semibold mb-2">{t('aflami')}</div>
              <div className="text-sm opacity-80 mb-4">{t('aflamiDesc')}</div>
              <AnimatedButton onClick={() => window.location.href = '/aflami'}>{t('openAflami')}</AnimatedButton>
            </div>
          </AnimatedCard>

          <AnimatedCard className="p-6">
            <div className="flex flex-col">
              <div className="text-lg font-semibold mb-2">{t('secretsServiceName')}</div>
              <div className="text-sm opacity-80 mb-4">{t('secretsServiceDesc')}</div>
              <AnimatedButton onClick={() => window.location.href = '/secrets/verify'}>{t('openSecrets')}</AnimatedButton>
            </div>
          </AnimatedCard>
        </section>
      </main>
    </div>
  )
}
